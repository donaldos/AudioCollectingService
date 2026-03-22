import enum

from sqlalchemy import (
    Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, func,
)

from app.core.database import Base


class RecordingStatus(str, enum.Enum):
    pending  = "pending"
    analyzed = "analyzed"
    accepted = "accepted"
    rejected = "rejected"


class Recording(Base):
    __tablename__ = "recordings"
    __table_args__ = (
        # 재녹음 정책: user_id + sentence_id 조합은 항상 최신 1건만 유지
        UniqueConstraint("user_id", "sentence_id", name="uq_user_sentence"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sentence_id = Column(Integer, ForeignKey("sentences.id", ondelete="RESTRICT"), nullable=False, index=True)

    # 파일 정보
    file_path   = Column(String(500), nullable=False)
    file_size   = Column(Integer, nullable=True)

    # 음성 품질 지표 (Celery 분석 후 업데이트)
    snr         = Column(Float, nullable=True)
    energy      = Column(Float, nullable=True)
    duration    = Column(Float, nullable=True)

    # 상태 관리
    status      = Column(Enum(RecordingStatus), default=RecordingStatus.pending, nullable=False, index=True)

    # 검수 정보
    review_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at  = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
