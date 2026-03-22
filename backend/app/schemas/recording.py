from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.recording import RecordingStatus


class RecordingOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    sentence_id: int
    file_path: str
    file_size: Optional[int] = None
    snr: Optional[float] = None
    energy: Optional[float] = None
    duration: Optional[float] = None
    status: RecordingStatus
    created_at: datetime


class CompleteSessionRequest(BaseModel):
    session_id: int
