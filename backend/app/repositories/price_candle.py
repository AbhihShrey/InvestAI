"""Price candle repository for chart data."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_candle import PriceCandle


class PriceCandleRepository:
    """Repository for PriceCandle CRUD and range queries."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_range(
        self,
        symbol_id: int,
        from_date: date,
        to_date: date,
        timeframe: str = "1D",
    ) -> list[PriceCandle]:
        """Return candles for the symbol in the date range (inclusive), ordered by trade_date."""
        result = await self._session.execute(
            select(PriceCandle)
            .where(
                PriceCandle.symbol_id == symbol_id,
                PriceCandle.timeframe == timeframe,
                PriceCandle.trade_date >= from_date,
                PriceCandle.trade_date <= to_date,
            )
            .order_by(PriceCandle.trade_date)
        )
        return list(result.scalars().all())

    async def get_latest_date(self, symbol_id: int, timeframe: str = "1D") -> date | None:
        """Return the latest trade_date for the symbol/timeframe, or None if no data."""
        result = await self._session.execute(
            select(PriceCandle.trade_date)
            .where(
                PriceCandle.symbol_id == symbol_id,
                PriceCandle.timeframe == timeframe,
            )
            .order_by(PriceCandle.trade_date.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row if row is None else row

    async def upsert_candles(self, candles: list[PriceCandle]) -> None:
        """Insert or replace candles (by symbol_id, trade_date, timeframe). Uses SQLite ON CONFLICT DO UPDATE."""
        if not candles:
            return
        for c in candles:
            stmt = sqlite_insert(PriceCandle).values(
                symbol_id=c.symbol_id,
                trade_date=c.trade_date,
                timeframe=c.timeframe,
                open=c.open,
                high=c.high,
                low=c.low,
                close=c.close,
                volume=c.volume,
            ).on_conflict_do_update(
                index_elements=["symbol_id", "trade_date", "timeframe"],
                set_={
                    "open": c.open,
                    "high": c.high,
                    "low": c.low,
                    "close": c.close,
                    "volume": c.volume,
                },
            )
            await self._session.execute(stmt)
        await self._session.flush()
