import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.recording import Recording, RecordingStatus
from app.models.sentence import Sentence
from app.models.user import User

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).filter(User.is_admin == False).scalar()
    total_recordings = db.query(func.count(Recording.id)).scalar()

    status_counts = dict(
        db.query(Recording.status, func.count(Recording.id))
        .group_by(Recording.status)
        .all()
    )

    today = date.today()
    today_recordings = db.query(func.count(Recording.id)).filter(
        func.date(Recording.created_at) == today
    ).scalar()

    # 최근 14일 트렌드
    daily_trend = []
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        count = db.query(func.count(Recording.id)).filter(
            func.date(Recording.created_at) == d
        ).scalar()
        daily_trend.append({"date": str(d), "count": count})

    # 평균 품질 지표 (analyzed 이상)
    avg_metrics = db.query(
        func.avg(Recording.duration),
        func.avg(Recording.snr),
    ).filter(Recording.status != RecordingStatus.pending).first()

    # 화자 분포
    gender_dist = dict(
        db.query(User.gender, func.count(User.id))
        .filter(User.is_admin == False)
        .group_by(User.gender)
        .all()
    )
    age_dist = dict(
        db.query(User.age_group, func.count(User.id))
        .filter(User.is_admin == False)
        .group_by(User.age_group)
        .all()
    )

    return {
        "success": True,
        "data": {
            "total_users": total_users,
            "total_recordings": total_recordings,
            "pending_review": status_counts.get(RecordingStatus.analyzed, 0),
            "accepted": status_counts.get(RecordingStatus.accepted, 0),
            "rejected": status_counts.get(RecordingStatus.rejected, 0),
            "today_recordings": today_recordings,
            "avg_duration": round(float(avg_metrics[0] or 0), 2),
            "avg_snr": round(float(avg_metrics[1] or 0), 2),
            "daily_trend": daily_trend,
            "gender_dist": {str(k): v for k, v in gender_dist.items()},
            "age_dist": {str(k): v for k, v in age_dist.items()},
        },
    }


@router.get("/daily")
def get_daily_stats(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    today = date.today()
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        counts = dict(
            db.query(Recording.status, func.count(Recording.id))
            .filter(func.date(Recording.created_at) == d)
            .group_by(Recording.status)
            .all()
        )
        result.append({
            "date": str(d),
            "pending": counts.get(RecordingStatus.pending, 0),
            "analyzed": counts.get(RecordingStatus.analyzed, 0),
            "accepted": counts.get(RecordingStatus.accepted, 0),
            "rejected": counts.get(RecordingStatus.rejected, 0),
            "total": sum(counts.values()),
        })
    return {"success": True, "data": result}


@router.get("/export/metadata")
def export_metadata(
    status: str = Query(default="accepted"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """AI Hub 등 납품용 메타데이터 CSV 생성"""
    try:
        filter_status = RecordingStatus(status)
    except ValueError:
        filter_status = RecordingStatus.accepted

    rows = (
        db.query(Recording, User, Sentence)
        .join(User, Recording.user_id == User.id)
        .join(Sentence, Recording.sentence_id == Sentence.id)
        .filter(Recording.status == filter_status)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "file_path", "sentence_id", "text",
        "user_id", "gender", "age_group", "region", "dialect",
        "duration", "snr", "energy", "status", "created_at",
    ])
    for rec, user, sent in rows:
        writer.writerow([
            rec.file_path, sent.id, sent.text,
            user.id, user.gender, user.age_group, user.region, user.dialect,
            rec.duration, rec.snr, rec.energy, rec.status,
            rec.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=metadata.csv"},
    )
