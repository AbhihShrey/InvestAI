"""Symbol API endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.indicators import compute_ppo, compute_rsi
from app.repositories.price_candle import PriceCandleRepository
from app.repositories.symbol import SymbolRepository
from app.schemas.indicators import (
    IndicatorSeriesResponse,
    PpoIndicatorSeries,
    SymbolPricesResponse,
    TimeValuePoint,
)
from app.schemas.price_candle import PriceCandleResponse, price_candle_to_response
from app.schemas.symbol import SymbolCreate, SymbolResponse, SymbolSearchResult

router = APIRouter()


@router.get("/", response_model=list[SymbolResponse])
async def list_symbols(
    db: AsyncSession = Depends(get_db),
) -> list[SymbolResponse]:
    """Return all tracked symbols."""
    repo = SymbolRepository(db)
    symbols = await repo.get_all()
    return [SymbolResponse.model_validate(s) for s in symbols]


@router.get("/search", response_model=list[SymbolSearchResult])
async def search_symbols(
    q: str = Query(..., min_length=1, description="Search query (symbol or company name)"),
    projection: str = Query(
        "symbol-search",
        description="Search type: symbol-search, desc-search",
    ),
    db: AsyncSession = Depends(get_db),
) -> list[SymbolSearchResult]:
    """Search symbols via Schwab API. Merges with tracked symbols; tracked=True for DB symbols."""
    from app.schwab.search import search_symbols as schwab_search

    repo = SymbolRepository(db)
    tracked = await repo.get_all()
    tracked_by_ticker = {s.ticker.upper(): s for s in tracked}

    try:
        raw = schwab_search(query=q, projection=projection)
        return [
            SymbolSearchResult(
                symbol=r["symbol"],
                description=r.get("description") or "",
                tracked=(ticker in tracked_by_ticker),
                id=tracked_by_ticker[ticker].id if (ticker := r["symbol"].upper()) in tracked_by_ticker else None,
            )
            for r in raw
        ]
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/", response_model=SymbolResponse, status_code=201)
async def create_symbol(
    payload: SymbolCreate,
    db: AsyncSession = Depends(get_db),
) -> SymbolResponse:
    """Create a new symbol."""
    repo = SymbolRepository(db)
    try:
        symbol = await repo.create(ticker=payload.ticker, name=payload.name)
        return SymbolResponse.model_validate(symbol)
    except IntegrityError as e:
        raise HTTPException(status_code=409, detail="Symbol already exists") from e


@router.get("/{symbol_id}/prices", response_model=SymbolPricesResponse)
async def get_symbol_prices(
    symbol_id: int,
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    timeframe: str = Query("1D", description="Candle timeframe: 1D, 1m, 5m"),
    include_indicators: bool = Query(True, description="Include server-computed volume, RSI, PPO"),
    db: AsyncSession = Depends(get_db),
) -> SymbolPricesResponse:
    """Return OHLCV candles from DB (1D) or Schwab (1m, 5m)."""
    symbol_repo = SymbolRepository(db)
    symbol = await symbol_repo.get_by_id(symbol_id)
    if not symbol:
        raise HTTPException(status_code=404, detail="Symbol not found")
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="from_date must be <= to_date")

    is_intraday = timeframe in ("1m", "5m")
    if is_intraday:
        from datetime import datetime, timezone

        from app.schwab.fetch_intraday import fetch_intraday

        start_dt = datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc)
        end_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59, tzinfo=timezone.utc)
        try:
            intraday_candles = fetch_intraday(
                symbol.ticker, timeframe=timeframe, start_datetime=start_dt, end_datetime=end_dt
            )
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        candle_responses = [
            PriceCandleResponse(
                time=c["time"],
                open=c["open"],
                high=c["high"],
                low=c["low"],
                close=c["close"],
                volume=c.get("volume"),
            )
            for c in intraday_candles
        ]
    else:
        repo = PriceCandleRepository(db)
        candles = await repo.get_range(symbol_id, from_date, to_date, timeframe)
        candle_responses = [
            price_candle_to_response(
                c.trade_date, c.open, c.high, c.low, c.close, c.volume
            )
            for c in candles
        ]

    indicators: IndicatorSeriesResponse | None = None
    if include_indicators and len(candle_responses) > 0:
        times = [c.time for c in candle_responses]
        closes = [float(c.close) for c in candle_responses]
        volumes = [float(c.volume or 0) for c in candle_responses]

        volume_series = [
            TimeValuePoint(time=t, value=v) for t, v in zip(times, volumes)
        ]
        rsi_values = compute_rsi(closes, 14)
        rsi_series = [
            TimeValuePoint(time=t, value=round(r, 2))
            for t, r in zip(times, rsi_values)
        ]
        ppo_line, ppo_signal, ppo_hist = compute_ppo(closes, 10, 16, 9)
        ppo_series = PpoIndicatorSeries(
            line=[TimeValuePoint(time=t, value=round(x, 4)) for t, x in zip(times, ppo_line)],
            signal=[TimeValuePoint(time=t, value=round(x, 4)) for t, x in zip(times, ppo_signal)],
            hist=[TimeValuePoint(time=t, value=round(x, 4)) for t, x in zip(times, ppo_hist)],
        )
        indicators = IndicatorSeriesResponse(
            volume=volume_series,
            rsi=rsi_series,
            ppo=ppo_series,
        )

    return SymbolPricesResponse(candles=candle_responses, indicators=indicators)
