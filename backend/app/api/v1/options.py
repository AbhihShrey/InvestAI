"""Options chain API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.options import OptionChainResponse, OptionContract, UnderlyingQuote
from app.schwab.options import fetch_option_chain

router = APIRouter()


@router.get("/chain", response_model=OptionChainResponse)
async def get_option_chain(
    symbol: str = Query(..., min_length=1, max_length=16, description="Underlying symbol (e.g. AAPL)"),
    contract_type: str = Query("ALL", description="CALL, PUT, or ALL"),
    strike_range: str = Query("NTM", description="ITM, NTM, OTM, etc."),
    strike_count: int = Query(10, ge=1, le=60, description="Strikes above/below ATM"),
) -> OptionChainResponse:
    """Return options chain for symbol from Schwab."""
    try:
        data = fetch_option_chain(
            symbol=symbol,
            contract_type=contract_type,
            strike_range=strike_range,
            strike_count=strike_count,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    underlying = data.get("underlying")
    uq = None
    if underlying:
        uq = UnderlyingQuote(
            symbol=underlying.get("symbol", symbol),
            last=underlying.get("last"),
            bid=underlying.get("bid"),
            ask=underlying.get("ask"),
        )

    calls = [OptionContract(**c) for c in data.get("calls", [])]
    puts = [OptionContract(**c) for c in data.get("puts", [])]
    return OptionChainResponse(underlying=uq, calls=calls, puts=puts)
