from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user, require_teacher
from ..models.user import Classroom, User
from ..schemas.user import ClassroomCreate, ClassroomRead, UserRead

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


@router.post("/", response_model=ClassroomRead)
def create_classroom(body: ClassroomCreate, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = Classroom(name=body.name, teacher_id=teacher.id)
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


@router.get("/mine", response_model=ClassroomRead)
def my_classroom(teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.teacher_id == teacher.id).first()
    if not classroom:
        raise HTTPException(404, "No classroom found — create one first")
    return classroom


@router.post("/{classroom_id}/join", status_code=200)
def join_classroom(classroom_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(404, "Classroom not found")
    user.classroom_id = classroom_id
    db.commit()
    return {"ok": True}


@router.get("/{classroom_id}/students", response_model=list[UserRead])
def list_students(classroom_id: int, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(
        Classroom.id == classroom_id, Classroom.teacher_id == teacher.id
    ).first()
    if not classroom:
        raise HTTPException(404, "Classroom not found")
    return db.query(User).filter(User.classroom_id == classroom_id).all()
