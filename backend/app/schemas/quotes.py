"""Schemas for real-time quotes API."""

from __future__ import annotations

from pydantic import BaseModel


class QuoteResponse(BaseModel):
    """Real-time quote for a symbol."""

    symbol: str
    last: float
    change: float | None = None
    changePct: float | None = None
    volume: float = 0
