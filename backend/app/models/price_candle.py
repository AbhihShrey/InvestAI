"""OHLCV price candle for charting (e.g. daily from Schwab)."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.symbol import Symbol


class PriceCandle(Base):
    """A single OHLCV candle for a symbol (e.g. daily bar)."""

    __tablename__ = "price_candles"
    __table_args__ = (
        UniqueConstraint("symbol_id", "trade_date", "timeframe", name="uq_price_candles_symbol_date_tf"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol_id: Mapped[int] = mapped_column(ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False, index=True)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    timeframe: Mapped[str] = mapped_column(String(8), nullable=False, default="1D")  # 1D, 1h, etc.
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    symbol: Mapped["Symbol"] = relationship("Symbol", back_populates="price_candles")
