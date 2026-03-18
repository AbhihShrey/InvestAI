"""Fetch real-time quotes from Schwab API."""

from __future__ import annotations

from typing import Any


def fetch_quotes(symbols: list[str]) -> list[dict[str, Any]]:
    """
    Fetch quotes for symbols via Schwab get_quotes.
    Returns list of quote dicts with symbol, last, change, changePct, volume, etc.
    """
    if not symbols:
        return []

    from app.schwab.client import get_client

    client = get_client()
    sym_list = [s.strip().upper() for s in symbols if s and str(s).strip()][:50]
    if not sym_list:
        return []

    resp = client.get_quotes(sym_list)
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab quotes API error {resp.status_code}: {resp.text}")

    data = resp.json()
    if isinstance(data, dict):
        # Response may be { "AAPL": {...}, "MSFT": {...} } keyed by symbol
        items = [
            {"_symbol": k, **v} if isinstance(v, dict) else {"_symbol": k}
            for k, v in data.items()
        ]
    elif isinstance(data, list):
        items = data
    else:
        return []

    results: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        symbol = item.get("_symbol") or item.get("symbol") or item.get("symbolId") or ""
        last = _float(item, "last", "close", "regularMarketLast", "mark")
        if last is None or last <= 0:
            continue
        change = _float(item, "netChange", "regularMarketNetChange")
        change_pct = _float(item, "netPercentChangeInDouble", "regularMarketPercentChangeInDouble")
        if change_pct is None and change is not None and last:
            change_pct = (change / (last - change)) * 100 if (last - change) else 0
        volume = _float(item, "totalVolume", "volume", "regularMarketVolume") or 0
        results.append(
            {
                "symbol": str(symbol),
                "last": round(last, 2),
                "change": round(change, 2) if change is not None else None,
                "changePct": round(change_pct, 2) if change_pct is not None else None,
                "volume": round(volume, 0) if volume else 0,
            }
        )
    return results


def _float(d: dict[str, Any], *keys: str) -> float | None:
    """Get first non-None float from dict by keys."""
    for k in keys:
        v = d.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    return None
