"""Schemas for indicator series in API responses."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.price_candle import PriceCandleResponse


class TimeValuePoint(BaseModel):
    time: str
    value: float


class PpoIndicatorSeries(BaseModel):
    line: list[TimeValuePoint]
    signal: list[TimeValuePoint]
    hist: list[TimeValuePoint]


class IndicatorSeriesResponse(BaseModel):
    volume: list[TimeValuePoint]
    rsi: list[TimeValuePoint]
    ppo: PpoIndicatorSeries


class SymbolPricesResponse(BaseModel):
    """Candles and optional server-computed indicators."""

    candles: list[PriceCandleResponse]
    indicators: IndicatorSeriesResponse | None = None
