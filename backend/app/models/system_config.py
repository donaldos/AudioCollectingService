from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy import Column as Col

from app.core.database import Base


class SystemConfig(Base):
    """key-value 시스템 설정 테이블 (포인트 정책 등)"""
    __tablename__ = "system_config"

    # `key`는 MySQL 예약어 — quote_plus 처리는 SQLAlchemy가 자동으로 함
    key         = Column("key", String(100), primary_key=True)
    value       = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)

    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
