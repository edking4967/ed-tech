from pydantic import BaseModel, EmailStr
from enum import Enum


class Role(str, Enum):
    student = "student"
    teacher = "teacher"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: Role
    classroom_id: int | None = None

    model_config = {"from_attributes": True}


class ClassroomCreate(BaseModel):
    name: str


class ClassroomRead(BaseModel):
    id: int
    name: str
    teacher_id: int

    model_config = {"from_attributes": True}
