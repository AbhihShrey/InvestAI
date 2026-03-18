"""Schemas for options chain API."""

from __future__ import annotations

from pydantic import BaseModel


class OptionContract(BaseModel):
    """Single option contract (call or put)."""

    symbol: str | None = None
    description: str | None = None
    putCall: str = "CALL"
    strike: float = 0.0
    expirationDate: str
    bid: float | None
    ask: float | None
    last: float | None
    delta: float | None
    gamma: float | None
    theta: float | None
    vega: float | None
    volatility: float | None
    volume: int | None


class UnderlyingQuote(BaseModel):
    """Underlying stock quote."""

    symbol: str
    last: float | None
    bid: float | None
    ask: float | None


class OptionChainResponse(BaseModel):
    """Options chain response."""

    underlying: UnderlyingQuote | None
    calls: list[OptionContract]
    puts: list[OptionContract]
