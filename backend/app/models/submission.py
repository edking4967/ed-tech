from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class WarmupSubmission(Base):
    __tablename__ = "warmup_submissions"
    __table_args__ = (UniqueConstraint("warmup_id", "student_id"),)

    id = Column(Integer, primary_key=True)
    warmup_id = Column(Integer, ForeignKey("warmups.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    grade = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    warmup = relationship("Warmup", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
