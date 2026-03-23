from typing import Literal, Optional

from pydantic import BaseModel


class ReviewRequest(BaseModel):
    action: Literal["accept", "reject"]
    note: Optional[str] = None


class PointsAdjustRequest(BaseModel):
    delta: int   # 양수: 지급, 음수: 차감
    reason: Optional[str] = None


class PointsPolicyUpdate(BaseModel):
    points_per_session: int
