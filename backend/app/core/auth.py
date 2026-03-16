"""Password hashing and JWT helpers."""

from datetime import datetime, timezone, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Return a bcrypt hash of the password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed: str) -> bool:
    """Return True if plain_password matches the hashed password."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token for the given subject (e.g. username or user id)."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.auth_jwt_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {"sub": str(subject), "exp": expire}
    return jwt.encode(
        to_encode,
        settings.auth_jwt_secret,
        algorithm=settings.auth_jwt_algorithm,
    )


def decode_access_token(token: str) -> str | None:
    """Decode the JWT and return the subject, or None if invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.auth_jwt_secret,
            algorithms=[settings.auth_jwt_algorithm],
        )
        return payload.get("sub")
    except jwt.PyJWTError:
        return None
