from pydantic import BaseModel
from datetime import datetime


class WarmupCreate(BaseModel):
    title: str
    content: str


class WarmupRead(BaseModel):
    id: int
    title: str
    content: str
    classroom_id: int
    created_by: int
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}
