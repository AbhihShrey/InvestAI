"""Fetch market movers from Schwab API."""

from __future__ import annotations

from typing import Any

from app.schemas.markets import TableRow


def fetch_movers(
    index: str = "$SPX",
    sort_order: str = "PERCENT_CHANGE_UP",
) -> list[TableRow]:
    """
    Fetch market movers from Schwab for a given index.
    Returns list of TableRow. Raises on API error.
    """
    from schwab.client import Client

    from app.schwab.client import get_client

    client = get_client()
    movers = Client.Movers

    idx_enum = getattr(movers.Index, _index_to_enum(index), movers.Index.SPX)
    sort_enum = getattr(
        movers.SortOrder, sort_order, movers.SortOrder.PERCENT_CHANGE_UP
    )

    resp = client.get_movers(
        idx_enum, sort_order=sort_enum, frequency=movers.Frequency.ZERO
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab movers API error {resp.status_code}: {resp.text}")

    data = resp.json()
    items = data if isinstance(data, list) else (data.get("data") or data.get("movers") or [])

    rows: list[TableRow] = []
    for item in items:
        row = _parse_mover_item(item)
        if row:
            rows.append(row)
    return rows


def _index_to_enum(index: str) -> str:
    """Map query index to Movers.Index enum name."""
    m = {
        "SPX": "SPX",
        "$SPX": "SPX",
        "DJI": "DJI",
        "$DJI": "DJI",
        "COMPX": "COMPX",
        "$COMPX": "COMPX",
        "NASDAQ": "NASDAQ",
        "NYSE": "NYSE",
    }
    return m.get(str(index).upper(), "SPX")


def _parse_mover_item(item: dict[str, Any]) -> TableRow | None:
    """Parse a single mover item from Schwab response into TableRow."""
    symbol = item.get("symbol") or item.get("symbolId") or item.get("ticker")
    if not symbol:
        return None

    price = _float(item, "last", "close", "mark", "regularMarketLast")
    if price is None or price <= 0:
        return None

    change_pct = _float(item, "netPercentChangeInDouble", "netPercentChange", "regularMarketPercentChangeInDouble")
    if change_pct is None:
        change_abs = _float(item, "netChange", "regularMarketNetChange")
        if change_abs is not None and price:
            change_pct = (change_abs / (price - change_abs)) * 100 if (price - change_abs) else 0
        else:
            change_pct = 0.0

    volume = _float(item, "totalVolume", "volume", "regularMarketVolume") or 0.0

    return TableRow(
        symbol=str(symbol).strip(),
        price=round(price, 2),
        changePct=round(change_pct, 2),
        volume=volume,
        avgVolume=None,
    )


def _float(d: dict[str, Any], *keys: str) -> float | None:
    """Get first non-None float value from dict by keys."""
    for k in keys:
        v = d.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    return None
