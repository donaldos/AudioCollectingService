from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SentenceOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    text: str
    category: Optional[str] = None
    language: str
    is_active: bool
    created_at: datetime


class SentenceCreate(BaseModel):
    text: str
    category: Optional[str] = None
    language: str = "ko"


class SentenceUpdate(BaseModel):
    text: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
