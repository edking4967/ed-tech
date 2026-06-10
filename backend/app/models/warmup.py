from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Warmup(Base):
    __tablename__ = "warmups"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=False)

    classroom = relationship("Classroom", back_populates="warmups")
    creator = relationship("User", foreign_keys=[created_by])
    submissions = relationship("WarmupSubmission", back_populates="warmup")
