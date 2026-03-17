"""Markets overview API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.markets.summary import compute_markets_summary
from app.schemas.markets import MarketsSummaryResponse

router = APIRouter()


@router.get("/", response_model=MarketsSummaryResponse)
async def get_markets(
    db: AsyncSession = Depends(get_db),
) -> MarketsSummaryResponse:
    """Return market-wide stats (indices, gainers/losers, sectors, volume surge, heatmap)."""
    return await compute_markets_summary(db)

