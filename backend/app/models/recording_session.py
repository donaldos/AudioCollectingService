from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, func

from app.core.database import Base


class RecordingSession(Base):
    __tablename__ = "recording_sessions"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sentence_ids    = Column(JSON, nullable=False)          # 세션에서 제시된 10문장 ID 배열
    completed_count = Column(Integer, default=0, nullable=False)
    points_awarded  = Column(Integer, default=0, nullable=False)
    is_completed    = Column(Boolean, default=False, nullable=False)

    started_at      = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at    = Column(DateTime, nullable=True)
