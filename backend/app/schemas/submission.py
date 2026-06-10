from pydantic import BaseModel
from datetime import datetime


class SubmissionCreate(BaseModel):
    content: str


class SubmissionGrade(BaseModel):
    grade: str


class SubmissionRead(BaseModel):
    id: int
    warmup_id: int
    student_id: int
    content: str
    grade: str | None = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class SubmissionWithStudent(BaseModel):
    id: int
    warmup_id: int
    student_id: int
    student_name: str
    content: str
    grade: str | None = None
    submitted_at: datetime


class SubmissionWithWarmup(BaseModel):
    id: int
    warmup_id: int
    warmup_title: str
    warmup_content: str
    content: str
    grade: str | None = None
    submitted_at: datetime
