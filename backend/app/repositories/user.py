"""User repository for database access."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository for User model."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_username(self, username: str) -> User | None:
        """Return the user with the given username or None."""
        result = await self._db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def create(self, username: str, password_hash: str) -> User:
        """Create a new user and return it."""
        user = User(username=username, password_hash=password_hash)
        self._db.add(user)
        await self._db.flush()
        await self._db.refresh(user)
        return user
