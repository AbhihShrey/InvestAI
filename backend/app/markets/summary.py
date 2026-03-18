"""Compute markets overview from daily price candles."""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_candle import PriceCandle
from app.models.symbol import Symbol
from app.schemas.markets import (
    BreadthStats,
    HeatmapItem,
    IndexStat,
    MarketsSummaryResponse,
    SectorPerformanceItem,
    TableRow,
)

logger = logging.getLogger(__name__)


def _sector_for_symbol(ticker: str) -> str:
    """Temporary sector mapping until sectors are stored in DB."""
    mapping = {
        # Technology
        "AAPL": "Technology",
        "MSFT": "Technology",
        "NVDA": "Technology",
        "GOOGL": "Technology",
        "META": "Technology",
        "AVGO": "Technology",
        "AMD": "Technology",
        # Consumer
        "AMZN": "Consumer Disc.",
        "HD": "Consumer Disc.",
        "COST": "Consumer Staples",
        "WMT": "Consumer Staples",
        # Financials
        "JPM": "Financials",
        "BAC": "Financials",
        "V": "Financials",
        "MA": "Financials",
        # Healthcare
        "LLY": "Healthcare",
        "JNJ": "Healthcare",
        "UNH": "Healthcare",
        # Energy
        "XOM": "Energy",
        "CVX": "Energy",
    }
    return mapping.get(ticker.upper(), "Other")


async def compute_markets_summary(
    db: AsyncSession,
    movers_index: str | None = None,
) -> MarketsSummaryResponse:
    """Compute market indices, gainers/losers, breadth, sectors, and heatmap."""
    # Get latest 1D candles for all symbols.
    latest_date_subq = (
        select(func.max(PriceCandle.trade_date))
        .where(PriceCandle.timeframe == "1D")
        .scalar_subquery()
    )

    latest_candles_stmt = (
        select(PriceCandle, Symbol)
        .join(Symbol, Symbol.id == PriceCandle.symbol_id)
        .where(
            PriceCandle.timeframe == "1D",
            PriceCandle.trade_date == latest_date_subq,
        )
    )
    result = await db.execute(latest_candles_stmt)
    rows: List[Tuple[PriceCandle, Symbol]] = list(result.all())

    if not rows:
        return MarketsSummaryResponse(
            indices=[],
            breadth=BreadthStats(
                advancers=0,
                decliners=0,
                unchanged=0,
                advVolume=0,
                decVolume=0,
                breadthPct=0,
            ),
            topGainers=[],
            topLosers=[],
            volumeSurge=[],
            sectors=[],
            heatmap=[],
        )

    # Filter out penny stocks (price < 5) and missing volume.
    universe: List[Tuple[PriceCandle, Symbol]] = []
    for candle, symbol in rows:
        price = float(candle.close)
        if price < 5:
            continue
        universe.append((candle, symbol))

    if not universe:
        universe = rows  # fall back rather than returning empty

    # Pre-compute change %, volume, etc. Build ticker -> Symbol map for sector lookup.
    ticker_to_symbol: Dict[str, Symbol] = {}
    symbols_data: List[Dict[str, Any]] = []
    for candle, symbol in universe:
        ticker_to_symbol[symbol.ticker.upper()] = symbol
        price = float(candle.close)
        open_price = float(candle.open)
        change_pct = ((price - open_price) / open_price * 100) if open_price else 0.0
        volume = float(candle.volume or 0)
        symbols_data.append(
            {
                "ticker": symbol.ticker,
                "name": symbol.name or symbol.ticker,
                "price": price,
                "open": open_price,
                "changePct": change_pct,
                "volume": volume,
                "symbol_obj": symbol,
            }
        )

    # Volume averages per symbol for surge calculation.
    avg_stmt = (
        select(PriceCandle.symbol_id, func.avg(PriceCandle.volume))
        .where(
            PriceCandle.timeframe == "1D",
        )
        .group_by(PriceCandle.symbol_id)
    )
    avg_result = await db.execute(avg_stmt)
    avg_volume_by_symbol_id: Dict[int, float] = {
        symbol_id: float(avg or 0) for symbol_id, avg in avg_result.all()
    }

    # Map ticker -> avg volume using latest rows to get symbol_id.
    avg_volume_by_ticker: Dict[str, float] = {}
    for candle, symbol in universe:
        avg = avg_volume_by_symbol_id.get(symbol.id)
        if avg is not None:
            avg_volume_by_ticker[symbol.ticker] = avg

    # Indices (SPY, QQQ) if present.
    indices: List[IndexStat] = []
    for label, sym in (("S&P 500 (SPY)", "SPY"), ("Nasdaq 100 (QQQ)", "QQQ")):
        match = next((d for d in symbols_data if d["ticker"].upper() == sym), None)
        if match:
            indices.append(
                IndexStat(
                    label=label,
                    symbol=sym,
                    price=match["price"],
                    changePct=round(match["changePct"], 2),
                    changeAbs=round(match["price"] - match["open"], 2),
                )
            )

    # Breadth and up/down volume.
    advancers = sum(1 for d in symbols_data if d["changePct"] > 0)
    decliners = sum(1 for d in symbols_data if d["changePct"] < 0)
    unchanged = sum(1 for d in symbols_data if d["changePct"] == 0)
    adv_volume = sum(d["volume"] for d in symbols_data if d["changePct"] > 0)
    dec_volume = sum(d["volume"] for d in symbols_data if d["changePct"] < 0)
    total_stocks = advancers + decliners + unchanged
    breadth_pct = (advancers / total_stocks * 100) if total_stocks > 0 else 0.0

    breadth = BreadthStats(
        advancers=advancers,
        decliners=decliners,
        unchanged=unchanged,
        advVolume=round(adv_volume, 2),
        decVolume=round(dec_volume, 2),
        breadthPct=round(breadth_pct, 1),
    )

    # Helper to build table rows.
    def _to_row(d: Dict[str, Any]) -> TableRow:
        avg_vol = avg_volume_by_ticker.get(d["ticker"], 0.0)
        return TableRow(
            symbol=d["ticker"],
            price=round(d["price"], 2),
            changePct=round(d["changePct"], 2),
            volume=d["volume"],
            avgVolume=avg_vol or None,
        )

    sorted_by_change = sorted(
        symbols_data, key=lambda d: d["changePct"], reverse=True
    )
    top_gainers = [_to_row(d) for d in sorted_by_change[:20]]
    top_losers = [_to_row(d) for d in reversed(sorted_by_change[-20:])]

    # Volume surge list: volume > 1.5x avg volume.
    surge_candidates: List[TableRow] = []
    for d in symbols_data:
        avg_vol = avg_volume_by_ticker.get(d["ticker"])
        if not avg_vol or avg_vol <= 0:
            continue
        mult = d["volume"] / avg_vol if avg_vol > 0 else 0
        if mult >= 1.5:
            row = _to_row(d)
            row.extra = round(mult, 2)
            surge_candidates.append(row)
    volume_surge = sorted(
        surge_candidates, key=lambda r: r.extra or 0, reverse=True
    )[:20]

    # Sector performance: prefer DB sector, else Schwab fundamentals, else fallback.
    need_fundamentals = [
        d["ticker"] for d in symbols_data
        if not (ticker_to_symbol.get(d["ticker"].upper()) and ticker_to_symbol.get(d["ticker"].upper(), Symbol).sector)
    ]
    fundamentals_map: Dict[str, str | None] = {}
    if need_fundamentals:
        try:
            from app.schwab.fundamentals import fetch_fundamentals

            fund = fetch_fundamentals(need_fundamentals[:50])  # limit batch size
            for ticker, info in fund.items():
                sector_val = info.get("sector")
                fundamentals_map[ticker] = sector_val
                sym = ticker_to_symbol.get(ticker)
                if sym and sector_val:
                    sym.sector = sector_val
                    if info.get("industry"):
                        sym.industry = info["industry"]
        except Exception as e:  # noqa: BLE001
            logger.debug("Schwab fundamentals unavailable: %s", e)

    def _resolve_sector(ticker: str) -> str:
        sym = ticker_to_symbol.get(ticker)
        if sym and sym.sector:
            return sym.sector
        return fundamentals_map.get(ticker) or _sector_for_symbol(ticker)

    sector_changes: Dict[str, List[float]] = defaultdict(list)
    for d in symbols_data:
        sector = _resolve_sector(d["ticker"])
        sector_changes[sector].append(d["changePct"])
    sectors: List[SectorPerformanceItem] = []
    for sector, changes in sector_changes.items():
        if not changes:
            continue
        avg_change = sum(changes) / len(changes)
        sectors.append(
            SectorPerformanceItem(sector=sector, changePct=round(avg_change, 2))
        )
    sectors.sort(key=lambda s: s.changePct, reverse=True)

    # Heatmap: top 30 by volume.
    heatmap_data = sorted(
        symbols_data, key=lambda d: d["volume"], reverse=True
    )[:30]
    heatmap: List[HeatmapItem] = [
        HeatmapItem(
            symbol=d["ticker"],
            displayName=d["name"],
            changePct=round(d["changePct"], 2),
            price=round(d["price"], 2),
        )
        for d in heatmap_data
    ]

    # Prefer Schwab movers when available; fall back to DB-derived.
    try:
        from app.schwab.movers import fetch_movers

        idx = movers_index or "$SPX"
        schwab_gainers = fetch_movers(index=idx, sort_order="PERCENT_CHANGE_UP")
        schwab_losers = fetch_movers(index=idx, sort_order="PERCENT_CHANGE_DOWN")
        if schwab_gainers or schwab_losers:
            top_gainers = schwab_gainers[:20] if schwab_gainers else top_gainers
            top_losers = schwab_losers[:20] if schwab_losers else top_losers
    except Exception as e:  # noqa: BLE001
        logger.debug("Schwab movers unavailable, using DB-derived: %s", e)

    return MarketsSummaryResponse(
        indices=indices,
        breadth=breadth,
        topGainers=top_gainers,
        topLosers=top_losers,
        volumeSurge=volume_surge,
        sectors=sectors,
        heatmap=heatmap,
    )

