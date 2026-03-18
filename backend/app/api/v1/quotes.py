"""Real-time quotes API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.quotes import QuoteResponse
from app.schwab.quotes import fetch_quotes

router = APIRouter()


@router.get("/", response_model=list[QuoteResponse])
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated symbols (e.g. AAPL,MSFT)"),
) -> list[QuoteResponse]:
    """Return real-time quotes for given symbols from Schwab."""
    try:
        sym_list = [s.strip() for s in symbols.split(",") if s.strip()][:20]
        if not sym_list:
            raise HTTPException(status_code=400, detail="At least one symbol required")
        raw = fetch_quotes(sym_list)
        return [QuoteResponse(**r) for r in raw]
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
