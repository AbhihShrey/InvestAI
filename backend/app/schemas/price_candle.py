"""Price candle API schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class PriceCandleResponse(BaseModel):
    """Single OHLCV candle for chart consumption."""

    time: str  # YYYY-MM-DD or unix for frontend
    open: float
    high: float
    low: float
    close: float
    volume: int | None = None

    model_config = {"from_attributes": False}


def price_candle_to_response(trade_date: date, open_: float, high: float, low: float, close: float, volume: int | None) -> PriceCandleResponse:
    """Build response from DB row."""
    return PriceCandleResponse(
        time=trade_date.isoformat(),
        open=open_,
        high=high,
        low=low,
        close=close,
        volume=volume,
    )
