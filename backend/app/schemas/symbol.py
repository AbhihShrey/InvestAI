"""Symbol API schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SymbolBase(BaseModel):
    """Shared symbol fields."""

    ticker: str = Field(..., min_length=1, max_length=32)
    name: str | None = Field(None, max_length=255)


class SymbolCreate(SymbolBase):
    """Payload for creating a symbol."""

    pass


class SymbolResponse(SymbolBase):
    """Symbol in API responses."""

    id: int

    model_config = {"from_attributes": True}
