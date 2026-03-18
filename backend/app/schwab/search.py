"""Symbol search via Schwab get_instruments."""

from __future__ import annotations

from typing import Any


def search_symbols(query: str, projection: str = "symbol-search") -> list[dict[str, Any]]:
    """
    Search symbols using Schwab get_instruments.
    projection: symbol-search, desc-search, symbol-regex, desc-regex, search
    Returns list of { symbol, description } dicts.
    """
    if not query or not str(query).strip():
        return []

    from schwab.client import Client

    from app.schwab.client import get_client

    client = get_client()
    proj_map = {
        "symbol-search": Client.Instrument.Projection.SYMBOL_SEARCH,
        "desc-search": Client.Instrument.Projection.DESCRIPTION_SEARCH,
        "symbol-regex": Client.Instrument.Projection.SYMBOL_REGEX,
        "desc-regex": Client.Instrument.Projection.DESCRIPTION_REGEX,
        "search": Client.Instrument.Projection.SEARCH,
    }
    proj = proj_map.get(projection, Client.Instrument.Projection.SYMBOL_SEARCH)

    resp = client.get_instruments(str(query).strip(), proj)
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab search API error {resp.status_code}: {resp.text}")

    data = resp.json()
    items = data if isinstance(data, list) else (data.get("instruments") or [])
    if not isinstance(items, list):
        return []

    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        sym = item.get("symbol") or item.get("symbolId") or item.get("ticker")
        desc = item.get("description") or item.get("securityType") or ""
        if sym and str(sym).strip():
            key = str(sym).upper()
            if key not in seen:
                seen.add(key)
                results.append(
                    {"symbol": str(sym).strip(), "description": str(desc).strip() if desc else ""}
                )
    return results[:30]  # limit to 30 results
