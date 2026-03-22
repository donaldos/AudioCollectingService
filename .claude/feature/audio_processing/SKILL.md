# 05. 오디오 처리 (AUDIO PROCESSING)

## 처리 파이프라인 개요

```
[브라우저]
  │  WebM/Opus Blob (MediaRecorder 녹음)
  │  POST /api/v1/recordings/upload (multipart/form-data)
  ▼
[FastAPI]
  │  1. 파일 수신 및 임시 저장 (temp_{uuid}.webm)
  │  2. DB recording INSERT (status='pending')
  │  3. Celery 태스크 큐에 Push (recording_id 전달)
  │  4. 즉시 응답 반환 { recording_id, status:'pending' }
  ▼
[Celery Worker] ← 비동기 처리
  │  5. ffmpeg: WebM → WAV 16kHz mono 변환
  │  6. 임시 WebM 파일 삭제
  │  7. librosa: Duration, Energy(RMS), SNR 계산
  │  8. DB UPDATE: snr, energy, duration, status='analyzed'
  ▼
[MySQL]
  │  분석 결과 저장 완료
  ▼
[어드민 검수 화면]
  └── 파형 시각화 + 품질 지표 표시 후 accept/reject
```

---

## FastAPI 업로드 엔드포인트

```python
# backend/app/routers/recordings.py
import os, uuid, aiofiles
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.tasks.audio import analyze_audio_task
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()

RECORDINGS_BASE = "/recordings"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/upload")
async def upload_recording(
    audio: UploadFile = File(...),
    sentence_id: int = Form(...),
    session_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 파일 크기 체크
    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "파일 크기가 너무 큽니다 (최대 50MB)")

    # MIME 타입 체크
    allowed_types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']
    if audio.content_type not in allowed_types:
        raise HTTPException(400, f"지원하지 않는 파일 형식입니다: {audio.content_type}")

    # 문장 존재 확인
    sentence = db.query(Sentence).filter(
        Sentence.id == sentence_id, Sentence.is_active == True
    ).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")

    # 경로 설정
    user_dir = os.path.join(RECORDINGS_BASE, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    temp_filename = f"temp_{uuid.uuid4().hex}.webm"
    temp_path = os.path.join(user_dir, temp_filename)
    final_path = os.path.join(user_dir, f"{sentence_id}.wav")

    # 임시 파일 저장 (비동기)
    async with aiofiles.open(temp_path, 'wb') as f:
        await f.write(content)

    # DB UPSERT (재녹음 정책: 덮어쓰기)
    from sqlalchemy.dialects.mysql import insert as mysql_insert
    stmt = mysql_insert(Recording).values(
        user_id=current_user.id,
        sentence_id=sentence_id,
        file_path=final_path,
        file_size=len(content),
        status='pending'
    )
    stmt = stmt.on_duplicate_key_update(
        file_path=final_path,
        file_size=len(content),
        status='pending',
        snr=None, energy=None, duration=None,
        updated_at=func.now()
    )
    result = db.execute(stmt)
    db.commit()

    recording_id = result.lastrowid

    # Celery 비동기 분석 태스크 등록
    analyze_audio_task.delay(
        recording_id=recording_id,
        temp_path=temp_path,
        final_path=final_path
    )

    return {
        "success": True,
        "data": {
            "recording_id": recording_id,
            "status": "pending",
            "message": "업로드 완료, 분석 처리 중입니다"
        }
    }
```

---

## Celery 태스크 (오디오 분석)

```python
# backend/app/tasks/audio.py
import os, subprocess, logging
import numpy as np
import librosa
import soundfile as sf
from celery import Celery
from app.core.database import SessionLocal
from app.models.recording import Recording

celery_app = Celery(
    'voicecollect',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def analyze_audio_task(self, recording_id: int, temp_path: str, final_path: str):
    """
    WebM → WAV 변환 후 음성 품질 지표 분석
    """
    db = SessionLocal()
    try:
        # 1. ffmpeg: WebM → WAV 16kHz mono 변환
        convert_to_wav(temp_path, final_path)

        # 2. 임시 파일 삭제
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # 3. 음성 분석
        metrics = analyze_wav(final_path)

        # 4. DB 업데이트
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.snr = metrics['snr']
            recording.energy = metrics['energy']
            recording.duration = metrics['duration']
            recording.status = 'analyzed'
            db.commit()
            logger.info(f"Recording {recording_id} analyzed: {metrics}")

    except Exception as exc:
        logger.error(f"Recording {recording_id} analysis failed: {exc}")
        # 실패 시 DB에 에러 상태 기록
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = 'analyzed'  # 어드민이 수동 검수하도록 analyzed로 유지
            db.commit()
        raise self.retry(exc=exc)
    finally:
        db.close()


def convert_to_wav(input_path: str, output_path: str) -> None:
    """
    ffmpeg를 사용하여 WebM/OGG → WAV 16kHz mono 변환
    """
    cmd = [
        'ffmpeg', '-y',           # 덮어쓰기 허용
        '-i', input_path,         # 입력 파일
        '-ar', '16000',           # 샘플레이트 16kHz (AI 학습 표준)
        '-ac', '1',               # 모노 채널
        '-sample_fmt', 's16',     # 16-bit PCM
        '-acodec', 'pcm_s16le',   # WAV PCM 인코딩
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg 변환 실패: {result.stderr}")


def analyze_wav(file_path: str) -> dict:
    """
    librosa를 사용한 음성 품질 지표 계산

    Returns:
        {
            'duration': float,  # 발화 길이 (초)
            'energy': float,    # RMS 에너지 (평균)
            'snr': float,       # Signal-to-Noise Ratio (dB)
        }
    """
    y, sr = librosa.load(file_path, sr=16000, mono=True)

    # Duration
    duration = librosa.get_duration(y=y, sr=sr)

    # RMS Energy
    rms = librosa.feature.rms(y=y)[0]
    energy = float(np.mean(rms))

    # SNR 추정 (간이 계산)
    # 음성 구간: 에너지 상위 40%, 노이즈 구간: 하위 20% 프레임 사용
    sorted_rms = np.sort(rms)
    noise_frames = sorted_rms[:max(1, int(len(sorted_rms) * 0.2))]
    signal_frames = sorted_rms[int(len(sorted_rms) * 0.6):]

    noise_power = np.mean(noise_frames ** 2)
    signal_power = np.mean(signal_frames ** 2)

    if noise_power > 0:
        snr = 10 * np.log10(signal_power / noise_power)
    else:
        snr = 99.0  # 노이즈가 없는 경우

    return {
        'duration': round(duration, 3),
        'energy': round(float(energy), 6),
        'snr': round(float(snr), 2)
    }
```

---

## 품질 지표 기준값 (참고)

어드민 수동 검수 시 참고용 기준값입니다.

| 지표 | 양호 | 주의 | 불량 |
|------|------|------|------|
| Duration | 1.0초 ~ 15초 | 0.5~1초 또는 15~20초 | <0.5초 또는 >20초 |
| SNR | > 20 dB | 10 ~ 20 dB | < 10 dB |
| Energy (RMS) | 0.01 ~ 0.3 | 0.001 ~ 0.01 | < 0.001 (무음 의심) |

---

## Celery 설정 (celeryconfig.py)

```python
# backend/app/tasks/celeryconfig.py
from kombu import Queue

broker_url = 'redis://redis:6379/0'
result_backend = 'redis://redis:6379/0'
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'Asia/Seoul'

# 큐 설정
task_queues = (
    Queue('audio_analysis', routing_key='audio.#'),
)
task_default_queue = 'audio_analysis'

# 동시 작업 수 (CPU 코어에 맞게 조정)
worker_concurrency = 2

# 태스크 시간 제한
task_soft_time_limit = 120   # 2분 (소프트 리밋)
task_time_limit = 180        # 3분 (하드 리밋)
```

---

## Celery Worker 실행 명령

```bash
# Dockerfile CMD 또는 docker-compose command:
celery -A app.tasks.audio worker \
  --loglevel=info \
  --concurrency=2 \
  -Q audio_analysis
```

---

## 파일 스트리밍 API (어드민 재생용)

```python
# backend/app/routers/recordings.py
from fastapi.responses import FileResponse

@router.get("/{recording_id}/file")
async def stream_recording(
    recording_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(404, "녹음을 찾을 수 없습니다")
    if not os.path.exists(recording.file_path):
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    return FileResponse(
        recording.file_path,
        media_type='audio/wav',
        filename=f"recording_{recording_id}.wav"
    )
```

---

## requirements.txt (오디오 관련)

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
alembic==1.13.1
pymysql==1.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
aiofiles==23.2.1
celery==5.3.6
redis==5.0.1
librosa==0.10.2
soundfile==0.12.1
numpy==1.26.4
ffmpeg-python==0.2.0
```

> **주의**: ffmpeg 바이너리가 Docker 이미지에 설치되어 있어야 합니다.
> Dockerfile에 `RUN apt-get install -y ffmpeg` 추가 필요.
