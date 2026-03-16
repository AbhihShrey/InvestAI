"""Auth API: login and register against database users."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.database import get_db
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate with username and password. Returns a JWT access token."""
    repo = UserRepository(db)
    user = await repo.get_by_username(payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(subject=user.username)
    return LoginResponse(access_token=token)


@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """Create a new user. Returns 400 if username already exists."""
    repo = UserRepository(db)
    existing = await repo.get_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already taken",
        )
    password_hash = hash_password(payload.password)
    await repo.create(payload.username, password_hash)
    await db.commit()
    return RegisterResponse()
