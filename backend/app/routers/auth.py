from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta
import httpx
from ..dependencies import get_db, get_current_user
from ..config import settings
from ..models.user import User, Role
from ..schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def create_jwt(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


@router.get("/login")
def login(role: str = "student"):
    """Redirect to Google OAuth. Pass ?role=teacher for teacher login."""
    if role not in ("student", "teacher"):
        raise HTTPException(400, "role must be 'student' or 'teacher'")
    params = (
        f"client_id={settings.google_client_id}"
        f"&redirect_uri={settings.backend_url}/auth/callback"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&state={role}"
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/callback")
async def callback(code: str, state: str = "student", db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": f"{settings.backend_url}/auth/callback",
            "grant_type": "authorization_code",
        })
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_resp.raise_for_status()
        userinfo = userinfo_resp.json()

    user = db.query(User).filter(User.google_id == userinfo["id"]).first()
    if not user:
        role = Role(state) if state in Role._value2member_map_ else Role.student
        user = User(
            google_id=userinfo["id"],
            email=userinfo["email"],
            name=userinfo["name"],
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_jwt(user.id)
    return RedirectResponse(f"{settings.frontend_url}/auth/callback?token={token}")


@router.get("/me", response_model=UserRead)
def me(user=Depends(get_current_user)):
    return user


@router.post("/dev-login")
def dev_login(name: str, role: str = "student", db: Session = Depends(get_db)):
    """Dev-only endpoint — creates a user and returns a JWT without Google OAuth."""
    if role not in ("student", "teacher"):
        raise HTTPException(400, "role must be 'student' or 'teacher'")
    fake_google_id = f"dev-{role}-{name.lower().replace(' ', '-')}"
    user = db.query(User).filter(User.google_id == fake_google_id).first()
    if not user:
        user = User(
            google_id=fake_google_id,
            email=f"{fake_google_id}@dev.local",
            name=name,
            role=Role(role),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"token": create_jwt(user.id), "user_id": user.id}
