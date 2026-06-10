from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user, require_teacher
from ..models.warmup import Warmup
from ..models.submission import WarmupSubmission
from ..schemas.submission import (
    SubmissionCreate,
    SubmissionGrade,
    SubmissionRead,
    SubmissionWithStudent,
    SubmissionWithWarmup,
)

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("/{warmup_id}", response_model=SubmissionRead)
def submit_warmup(
    warmup_id: int,
    body: SubmissionCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    warmup = db.query(Warmup).filter(Warmup.id == warmup_id, Warmup.is_active == True).first()
    if not warmup:
        raise HTTPException(404, "No active warmup found")

    existing = db.query(WarmupSubmission).filter(
        WarmupSubmission.warmup_id == warmup_id,
        WarmupSubmission.student_id == user.id,
    ).first()
    if existing:
        raise HTTPException(409, "Already submitted")

    submission = WarmupSubmission(warmup_id=warmup_id, student_id=user.id, content=body.content)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/mine", response_model=list[SubmissionWithWarmup])
def my_submissions(user=Depends(get_current_user), db: Session = Depends(get_db)):
    submissions = (
        db.query(WarmupSubmission)
        .filter(WarmupSubmission.student_id == user.id)
        .order_by(WarmupSubmission.submitted_at.desc())
        .all()
    )
    return [
        SubmissionWithWarmup(
            id=s.id,
            warmup_id=s.warmup_id,
            warmup_title=s.warmup.title,
            warmup_content=s.warmup.content,
            content=s.content,
            grade=s.grade,
            submitted_at=s.submitted_at,
        )
        for s in submissions
    ]


@router.get("/{warmup_id}", response_model=list[SubmissionWithStudent])
def list_submissions(warmup_id: int, teacher=Depends(require_teacher), db: Session = Depends(get_db)):
    warmup = db.query(Warmup).filter(Warmup.id == warmup_id).first()
    if not warmup:
        raise HTTPException(404, "Warmup not found")
    submissions = db.query(WarmupSubmission).filter(WarmupSubmission.warmup_id == warmup_id).all()
    return [
        SubmissionWithStudent(
            id=s.id,
            warmup_id=s.warmup_id,
            student_id=s.student_id,
            student_name=s.student.name,
            content=s.content,
            grade=s.grade,
            submitted_at=s.submitted_at,
        )
        for s in submissions
    ]


@router.patch("/{submission_id}/grade", response_model=SubmissionRead)
def grade_submission(
    submission_id: int,
    body: SubmissionGrade,
    teacher=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    submission = db.query(WarmupSubmission).filter(WarmupSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(404, "Submission not found")
    submission.grade = body.grade
    db.commit()
    db.refresh(submission)
    return submission
