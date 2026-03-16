"""Symbol model for tracked symbols."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.price_candle import PriceCandle


class Symbol(Base):
    """A tracked symbol (e.g. stock ticker)."""

    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    price_candles: Mapped[list["PriceCandle"]] = relationship(
        "PriceCandle", back_populates="symbol", cascade="all, delete-orphan"
    )
