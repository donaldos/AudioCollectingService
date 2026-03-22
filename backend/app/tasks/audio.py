"""
오디오 분석 Celery 태스크

Phase 4: 스텁 구현 — DB 상태만 'analyzed'로 업데이트
Phase 5: ffmpeg 변환 + librosa 분석 실제 구현 예정
"""
from celery import Celery

from app.core.config import settings

celery_app = Celery("voicecollect")
celery_app.config_from_object("app.tasks.celeryconfig")


@celery_app.task(name="app.tasks.audio.analyze_recording")
def analyze_recording(recording_id: int, temp_webm_path: str):
    """
    녹음 파일 분석 태스크 (Phase 5에서 실제 구현)
    1. ffmpeg: temp_webm_path → {user_id}/{sentence_id}.wav (16kHz mono)
    2. librosa: SNR, Energy, Duration 계산
    3. DB UPDATE: status='analyzed', snr=?, energy=?, duration=?
    """
    from app.core.database import SessionLocal
    from app.models.recording import Recording, RecordingStatus

    db = SessionLocal()
    try:
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            return

        # Phase 5에서 실제 오디오 처리 구현
        # 현재는 status만 analyzed로 업데이트 (스텁)
        recording.status = RecordingStatus.analyzed
        db.commit()
    finally:
        db.close()
