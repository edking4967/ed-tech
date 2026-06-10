from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from ..dependencies import get_db, get_current_user, require_teacher
from ..models.user import Classroom
from ..models.summary import DailySummary
from ..schemas.summary import SummaryCreate, SummaryRead

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _user_classroom_id(user, db: Session) -> int:
    if user.classroom_id:
        return user.classroom_id
    classroom = db.query(Classroom).filter(Classroom.teacher_id == user.id).first()
    if classroom:
        return classroom.id
    raise HTTPException(400, "Not enrolled in a classroom")


@router.post("/", response_model=SummaryRead)
def create_summary(body: SummaryCreate, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.teacher_id == teacher.id).first()
    if not classroom:
        raise HTTPException(400, "Create a classroom first")
    summary = DailySummary(
        classroom_id=classroom.id,
        title=body.title,
        content=body.content,
        date=body.date,
        created_by=teacher.id,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/", response_model=list[SummaryRead])
def list_summaries(user=Depends(get_current_user), db: Session = Depends(get_db)):
    classroom_id = _user_classroom_id(user, db)
    return (
        db.query(DailySummary)
        .filter(DailySummary.classroom_id == classroom_id)
        .order_by(DailySummary.date.desc())
        .all()
    )


@router.get("/today", response_model=SummaryRead | None)
def get_today_summary(user=Depends(get_current_user), db: Session = Depends(get_db)):
    classroom_id = _user_classroom_id(user, db)
    return db.query(DailySummary).filter(
        DailySummary.classroom_id == classroom_id,
        DailySummary.date == date.today(),
    ).first()
