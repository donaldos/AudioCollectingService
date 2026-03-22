from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.recording import Recording
from app.models.recording_session import RecordingSession
from app.models.sentence import Sentence
from app.models.user import User
from app.schemas.sentence import SentenceCreate, SentenceOut, SentenceUpdate

router = APIRouter()


@router.get("/random")
def get_random_sentences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id

    # 이미 녹음한 문장 ID 목록
    recorded_ids = [
        row[0]
        for row in db.query(Recording.sentence_id).filter(Recording.user_id == user_id).all()
    ]

    # 미녹음 문장 우선 랜덤 10개 추출
    q = db.query(Sentence).filter(Sentence.is_active == True)
    if recorded_ids:
        q = q.filter(~Sentence.id.in_(recorded_ids))
    sentences = q.order_by(func.rand()).limit(10).all()

    # 미녹음이 10개 미만이면 녹음한 문장으로 보충
    if len(sentences) < 10:
        additional = (
            db.query(Sentence)
            .filter(Sentence.is_active == True, Sentence.id.in_(recorded_ids))
            .order_by(func.rand())
            .limit(10 - len(sentences))
            .all()
        )
        sentences.extend(additional)

    if not sentences:
        raise HTTPException(404, "사용 가능한 문장이 없습니다")

    # 세션 생성
    session = RecordingSession(
        user_id=user_id,
        sentence_ids=[s.id for s in sentences],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "data": {
            "session_id": session.id,
            "sentences": [
                {"id": s.id, "text": s.text, "category": s.category}
                for s in sentences
            ],
        },
    }


# ──────────────────────────────────────────────
# Admin 전용 엔드포인트
# ──────────────────────────────────────────────

@router.get("")
def list_sentences(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total = db.query(Sentence).count()
    sentences = db.query(Sentence).offset(skip).limit(limit).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "items": [SentenceOut.model_validate(s) for s in sentences],
        },
    }


@router.post("")
def create_sentence(
    req: SentenceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sentence = Sentence(text=req.text, category=req.category, language=req.language)
    db.add(sentence)
    db.commit()
    db.refresh(sentence)
    return {"success": True, "data": SentenceOut.model_validate(sentence)}


@router.put("/{sentence_id}")
def update_sentence(
    sentence_id: int,
    req: SentenceUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sentence = db.query(Sentence).filter(Sentence.id == sentence_id).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")

    if req.text is not None:
        sentence.text = req.text
    if req.category is not None:
        sentence.category = req.category
    if req.is_active is not None:
        sentence.is_active = req.is_active

    db.commit()
    db.refresh(sentence)
    return {"success": True, "data": SentenceOut.model_validate(sentence)}


@router.delete("/{sentence_id}")
def deactivate_sentence(
    sentence_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    sentence = db.query(Sentence).filter(Sentence.id == sentence_id).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")

    sentence.is_active = False
    db.commit()
    return {"success": True, "data": {"message": "문장이 비활성화되었습니다"}}
