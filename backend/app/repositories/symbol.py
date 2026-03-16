"""Symbol repository for database access."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.symbol import Symbol


class SymbolRepository:
    """Repository for Symbol CRUD."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[Symbol]:
        """Return all symbols ordered by ticker."""
        result = await self._session.execute(
            select(Symbol).order_by(Symbol.ticker)
        )
        return list(result.scalars().all())

    async def get_by_id(self, symbol_id: int) -> Symbol | None:
        """Return a symbol by id or None."""
        result = await self._session.execute(
            select(Symbol).where(Symbol.id == symbol_id)
        )
        return result.scalar_one_or_none()

    async def create(self, ticker: str, name: str | None = None) -> Symbol:
        """Create and return a new symbol."""
        symbol = Symbol(ticker=ticker.upper(), name=name)
        self._session.add(symbol)
        await self._session.flush()
        await self._session.refresh(symbol)
        return symbol
