import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.recording import Recording, RecordingStatus
from app.models.recording_session import RecordingSession
from app.models.sentence import Sentence
from app.models.system_config import SystemConfig
from app.models.user import User
from app.schemas.recording import CompleteSessionRequest

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload")
async def upload_recording(
    sentence_id: int = Form(...),
    session_id: int = Form(...),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 파일 크기 체크
    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "파일 크기가 너무 큽니다 (최대 50MB)")

    # 문장 유효성 확인
    sentence = db.query(Sentence).filter(
        Sentence.id == sentence_id, Sentence.is_active == True
    ).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")

    # 세션 유효성 확인
    session = db.query(RecordingSession).filter(
        RecordingSession.id == session_id,
        RecordingSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(400, "유효하지 않은 세션입니다")

    # 파일 저장 경로
    user_dir = os.path.join(settings.RECORDINGS_BASE, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    final_path = os.path.join(user_dir, f"{sentence_id}.wav")
    temp_path = os.path.join(user_dir, f"temp_{uuid.uuid4().hex}.webm")

    with open(temp_path, "wb") as f:
        f.write(content)
    file_size = len(content)

    # UPSERT — 재녹음 시 기존 레코드 업데이트
    existing = db.query(Recording).filter(
        Recording.user_id == current_user.id,
        Recording.sentence_id == sentence_id,
    ).first()

    if existing:
        if os.path.exists(existing.file_path):
            os.remove(existing.file_path)
        existing.file_path = final_path
        existing.file_size = file_size
        existing.status = RecordingStatus.pending
        existing.snr = None
        existing.energy = None
        existing.duration = None
        existing.review_note = None
        existing.reviewed_by = None
        existing.reviewed_at = None
        db.commit()
        db.refresh(existing)
        recording = existing
    else:
        recording = Recording(
            user_id=current_user.id,
            sentence_id=sentence_id,
            file_path=final_path,
            file_size=file_size,
            status=RecordingStatus.pending,
        )
        db.add(recording)
        db.commit()
        db.refresh(recording)

    # Celery 비동기 분석 태스크
    try:
        from app.tasks.audio import analyze_audio_task
        analyze_audio_task.delay(recording.id, temp_path, final_path)
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "recording_id": recording.id,
            "status": recording.status,
            "message": "업로드 완료, 분석 처리 중입니다",
        },
    }


@router.post("/complete-session")
def complete_session(
    req: CompleteSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(RecordingSession).filter(
        RecordingSession.id == req.session_id,
        RecordingSession.user_id == current_user.id,
        RecordingSession.is_completed == False,
    ).first()

    if not session:
        raise HTTPException(400, "유효하지 않은 세션입니다")

    completed_count = db.query(Recording).filter(
        Recording.user_id == current_user.id,
        Recording.sentence_id.in_(session.sentence_ids),
    ).count()

    config = db.query(SystemConfig).filter(SystemConfig.key == "points_per_session").first()
    points_per_session = int(config.value) if config else 100

    points = points_per_session if completed_count >= 10 else int(points_per_session * completed_count / 10)

    current_user.points += points
    session.is_completed = True
    session.completed_count = completed_count
    session.points_awarded = points
    session.completed_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "data": {
            "points_earned": points,
            "total_points": current_user.points,
            "completed_count": completed_count,
        },
    }


@router.get("/my")
def my_recordings(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(Recording).filter(Recording.user_id == current_user.id).count()
    recordings = (
        db.query(Recording)
        .filter(Recording.user_id == current_user.id)
        .order_by(Recording.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "data": {
            "total": total,
            "items": [
                {
                    "id": r.id,
                    "sentence_id": r.sentence_id,
                    "status": r.status,
                    "duration": r.duration,
                    "created_at": r.created_at.isoformat(),
                }
                for r in recordings
            ],
        },
    }


@router.get("/{recording_id}/file")
def stream_recording(
    recording_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(404, "녹음을 찾을 수 없습니다")
    if not os.path.exists(recording.file_path):
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    return FileResponse(
        recording.file_path,
        media_type="audio/wav",
        filename=f"recording_{recording_id}.wav",
    )
