"""Markets overview API endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.markets.summary import compute_markets_summary
from app.schemas.markets import MarketHoursResponse, MarketsSummaryResponse

router = APIRouter()


@router.get("/hours", response_model=MarketHoursResponse)
async def get_market_hours(
    for_date: date | None = Query(None, description="Date for market hours (default: today)"),
) -> MarketHoursResponse:
    """Return market hours and open/closed status for equity and option markets."""
    from app.schwab.market_hours import fetch_market_hours

    target = for_date or date.today()
    data = fetch_market_hours(for_date=target)
    return MarketHoursResponse(**data)


@router.get("/", response_model=MarketsSummaryResponse)
async def get_markets(
    db: AsyncSession = Depends(get_db),
    movers_index: str | None = Query(None, description="Movers index (SPX, DJI, COMPX, NASDAQ, NYSE)"),
) -> MarketsSummaryResponse:
    """Return market-wide stats (indices, gainers/losers, sectors, volume surge, heatmap)."""
    return await compute_markets_summary(db, movers_index=movers_index)

