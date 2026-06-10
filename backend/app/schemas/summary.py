from pydantic import BaseModel
from datetime import date


class SummaryCreate(BaseModel):
    title: str
    content: str
    date: date


class SummaryRead(BaseModel):
    id: int
    classroom_id: int
    title: str
    content: str
    date: date
    created_by: int

    model_config = {"from_attributes": True}
