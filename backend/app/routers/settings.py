from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.system_config import SystemConfig
from app.models.user import User
from app.schemas.stats import PointsPolicyUpdate

router = APIRouter()


@router.get("/points-policy")
def get_points_policy(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    config = db.query(SystemConfig).filter(SystemConfig.key == "points_per_session").first()
    points_per_session = int(config.value) if config else 100
    return {
        "success": True,
        "data": {"points_per_session": points_per_session},
    }


@router.put("/points-policy")
def update_points_policy(
    req: PointsPolicyUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    config = db.query(SystemConfig).filter(SystemConfig.key == "points_per_session").first()
    if config:
        config.value = str(req.points_per_session)
    else:
        config = SystemConfig(
            key="points_per_session",
            value=str(req.points_per_session),
            description="세션 완료 시 지급 포인트",
        )
        db.add(config)
    db.commit()
    return {
        "success": True,
        "data": {"points_per_session": req.points_per_session},
    }
