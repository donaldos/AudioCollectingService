from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func

from app.core.database import Base


class Sentence(Base):
    __tablename__ = "sentences"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    text       = Column(Text, nullable=False)
    category   = Column(String(50), nullable=True, default=None, index=True)
    language   = Column(String(10), nullable=False, default="ko")
    is_active  = Column(Boolean, default=True, nullable=False, index=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
