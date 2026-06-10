from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user, require_teacher
from ..models.user import Classroom
from ..models.warmup import Warmup
from ..schemas.warmup import WarmupCreate, WarmupRead

router = APIRouter(prefix="/warmups", tags=["warmups"])


def _teacher_classroom(teacher, db: Session) -> Classroom:
    classroom = db.query(Classroom).filter(Classroom.teacher_id == teacher.id).first()
    if not classroom:
        raise HTTPException(400, "Create a classroom first")
    return classroom


def _user_classroom_id(user) -> int:
    if user.classroom_id:
        return user.classroom_id
    # teacher: classroom is looked up via taught_classrooms
    if user.taught_classrooms:
        return user.taught_classrooms[0].id
    raise HTTPException(400, "Not enrolled in a classroom")


@router.post("/", response_model=WarmupRead)
def create_warmup(body: WarmupCreate, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = _teacher_classroom(teacher, db)
    warmup = Warmup(
        title=body.title,
        content=body.content,
        classroom_id=classroom.id,
        created_by=teacher.id,
    )
    db.add(warmup)
    db.commit()
    db.refresh(warmup)
    return warmup


@router.get("/", response_model=list[WarmupRead])
def list_warmups(user=Depends(get_current_user), db: Session = Depends(get_db)):
    classroom_id = _user_classroom_id(user)
    return (
        db.query(Warmup)
        .filter(Warmup.classroom_id == classroom_id)
        .order_by(Warmup.created_at.desc())
        .all()
    )


@router.get("/active", response_model=WarmupRead | None)
def get_active_warmup(user=Depends(get_current_user), db: Session = Depends(get_db)):
    classroom_id = _user_classroom_id(user)
    return db.query(Warmup).filter(
        Warmup.classroom_id == classroom_id,
        Warmup.is_active == True,
    ).first()


@router.post("/{warmup_id}/activate", response_model=WarmupRead)
def activate_warmup(warmup_id: int, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = _teacher_classroom(teacher, db)
    db.query(Warmup).filter(Warmup.classroom_id == classroom.id).update({"is_active": False})
    warmup = db.query(Warmup).filter(
        Warmup.id == warmup_id, Warmup.classroom_id == classroom.id
    ).first()
    if not warmup:
        raise HTTPException(404, "Warmup not found")
    warmup.is_active = True
    db.commit()
    db.refresh(warmup)
    return warmup


@router.post("/{warmup_id}/deactivate", response_model=WarmupRead)
def deactivate_warmup(warmup_id: int, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = _teacher_classroom(teacher, db)
    warmup = db.query(Warmup).filter(
        Warmup.id == warmup_id, Warmup.classroom_id == classroom.id
    ).first()
    if not warmup:
        raise HTTPException(404, "Warmup not found")
    warmup.is_active = False
    db.commit()
    db.refresh(warmup)
    return warmup
