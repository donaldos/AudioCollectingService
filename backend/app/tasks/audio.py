"""
오디오 분석 Celery 태스크

파이프라인:
  1. ffmpeg: WebM/OGG → WAV 16kHz mono 변환
  2. 임시 파일 삭제
  3. librosa: Duration, RMS Energy, SNR 계산
  4. DB UPDATE: snr, energy, duration, status='analyzed'
"""
import logging
import os
import subprocess

import numpy as np

from celery import Celery

celery_app = Celery("voicecollect")
celery_app.config_from_object("app.tasks.celeryconfig")

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.audio.analyze_audio_task",
    max_retries=3,
    default_retry_delay=30,
)
def analyze_audio_task(self, recording_id: int, temp_path: str, final_path: str):
    from app.core.database import SessionLocal
    from app.models.recording import Recording, RecordingStatus

    db = SessionLocal()
    try:
        # 1. ffmpeg 변환
        convert_to_wav(temp_path, final_path)

        # 2. 임시 파일 삭제
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # 3. 음성 품질 분석
        metrics = analyze_wav(final_path)

        # 4. DB 업데이트
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.snr = metrics["snr"]
            recording.energy = metrics["energy"]
            recording.duration = metrics["duration"]
            recording.status = RecordingStatus.analyzed
            db.commit()
            logger.info(f"Recording {recording_id} analyzed: {metrics}")

    except Exception as exc:
        logger.error(f"Recording {recording_id} analysis failed: {exc}")
        # 변환/분석 실패 시에도 어드민이 수동 검수할 수 있도록 analyzed 유지
        try:
            recording = db.query(Recording).filter(Recording.id == recording_id).first()
            if recording:
                recording.status = RecordingStatus.analyzed
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


def convert_to_wav(input_path: str, output_path: str) -> None:
    """ffmpeg: WebM/OGG/MP4 → WAV 16kHz mono 16-bit PCM"""
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ar", "16000",       # 샘플레이트 16kHz (AI 학습 표준)
        "-ac", "1",           # 모노
        "-sample_fmt", "s16",
        "-acodec", "pcm_s16le",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg 변환 실패: {result.stderr}")


def analyze_wav(file_path: str) -> dict:
    """
    librosa를 사용한 음성 품질 지표 계산

    Returns:
        duration: 발화 길이 (초)
        energy:   RMS 에너지 (평균)
        snr:      Signal-to-Noise Ratio (dB, 간이 추정)
    """
    import librosa

    y, sr = librosa.load(file_path, sr=16000, mono=True)

    duration = librosa.get_duration(y=y, sr=sr)

    rms = librosa.feature.rms(y=y)[0]
    energy = float(np.mean(rms))

    # SNR 간이 추정: 상위 40% 프레임 = 신호, 하위 20% 프레임 = 노이즈
    sorted_rms = np.sort(rms)
    noise_frames = sorted_rms[: max(1, int(len(sorted_rms) * 0.2))]
    signal_frames = sorted_rms[int(len(sorted_rms) * 0.6) :]

    noise_power = np.mean(noise_frames ** 2)
    signal_power = np.mean(signal_frames ** 2)

    snr = 10 * np.log10(signal_power / noise_power) if noise_power > 0 else 99.0

    return {
        "duration": round(float(duration), 3),
        "energy":   round(float(energy), 6),
        "snr":      round(float(snr), 2),
    }
