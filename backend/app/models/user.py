import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Role(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="taught_classrooms")
    students = relationship("User", foreign_keys="[User.classroom_id]", back_populates="classroom")
    warmups = relationship("Warmup", back_populates="classroom")
    summaries = relationship("DailySummary", back_populates="classroom")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    classroom = relationship("Classroom", foreign_keys=[classroom_id], back_populates="students")
    taught_classrooms = relationship("Classroom", foreign_keys="[Classroom.teacher_id]", back_populates="teacher")
    submissions = relationship("WarmupSubmission", back_populates="student")
