import shutil
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.recording import Recording
from app.models.user import User
from app.schemas.stats import PointsAdjustRequest

router = APIRouter()

RECORDINGS_BASE = os.getenv("RECORDINGS_BASE", "/recordings")


@router.get("")
def list_users(
    skip: int = 0,
    limit: int = 20,
    include_inactive: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User).filter(User.is_admin == False)
    if not include_inactive:
        q = q.filter(User.is_active == True)
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "items": [_user_summary(u, db) for u in users],
        },
    }


@router.get("/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    recording_count = db.query(Recording).filter(Recording.user_id == user_id).count()

    return {
        "success": True,
        "data": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "gender": user.gender,
            "age_group": user.age_group,
            "region": user.region,
            "dialect": user.dialect,
            "points": user.points,
            "is_active": user.is_active,
            "recording_count": recording_count,
            "created_at": user.created_at.isoformat(),
        },
    }


@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    user.is_active = True
    db.commit()

    return {"success": True, "data": {"user_id": user_id, "message": "계정이 활성화되었습니다"}}


@router.patch("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    user.is_active = False
    db.commit()

    return {"success": True, "data": {"user_id": user_id, "message": "계정이 비활성화되었습니다"}}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    # 음성 파일 디렉토리 삭제
    user_dir = os.path.join(RECORDINGS_BASE, str(user_id))
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)

    # DB 삭제 (recordings, recording_sessions CASCADE)
    db.delete(user)
    db.commit()

    return {"success": True, "data": {"user_id": user_id, "message": "계정이 삭제되었습니다"}}


@router.patch("/{user_id}/points")
def adjust_points(
    user_id: int,
    req: PointsAdjustRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    user.points = max(0, user.points + req.delta)
    db.commit()

    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "points": user.points,
            "delta": req.delta,
        },
    }


def _user_summary(user: User, db: Session) -> dict:
    recording_count = db.query(Recording).filter(Recording.user_id == user.id).count()
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "gender": user.gender,
        "age_group": user.age_group,
        "region": user.region,
        "dialect": user.dialect,
        "points": user.points,
        "recording_count": recording_count,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
    }
