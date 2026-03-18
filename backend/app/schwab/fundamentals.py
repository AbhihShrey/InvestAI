"""Fetch fundamental data (sector, industry) from Schwab API."""

from __future__ import annotations

from typing import Any

from app.schwab.client import get_client


def fetch_fundamentals(symbols: list[str]) -> dict[str, dict[str, str | None]]:
    """
    Fetch fundamentals for symbols from Schwab get_instruments with FUNDAMENTAL projection.
    Returns dict: symbol -> { sector, industry } (None if not available).
    """
    if not symbols:
        return {}

    from schwab.client import Client

    client = get_client()
    proj = Client.Instrument.Projection.FUNDAMENTAL

    # Schwab get_instruments accepts symbol or list; batch if needed (API may limit)
    result: dict[str, dict[str, str | None]] = {}
    for sym in symbols:
        try:
            resp = client.get_instruments(sym, proj)
            if resp.status_code != 200:
                result[sym.upper()] = {"sector": None, "industry": None}
                continue
            data = resp.json()
            sector, industry = _parse_fundamental(data, sym.upper())
            result[sym.upper()] = {"sector": sector, "industry": industry}
        except Exception:
            result[sym.upper()] = {"sector": None, "industry": None}
    return result


def _parse_fundamental(data: Any, symbol: str) -> tuple[str | None, str | None]:
    """Extract sector and industry from Schwab fundamental response."""
    sector: str | None = None
    industry: str | None = None

    if isinstance(data, dict):
        sector = _get_str(data, "sector", "Sector")
        industry = _get_str(data, "industry", "Industry")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                s = item.get("symbol") or item.get("symbolId") or item.get("ticker")
                if s and str(s).upper() == symbol:
                    sector = _get_str(item, "sector", "Sector")
                    industry = _get_str(item, "industry", "Industry")
                    break
    return sector, industry


def _get_str(d: dict[str, Any], *keys: str) -> str | None:
    for k in keys:
        v = d.get(k)
        if v is not None and isinstance(v, str) and v.strip():
            return v.strip()
    return None
