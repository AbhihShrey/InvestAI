"""Fetch option chain from Schwab API."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def fetch_option_chain(
    symbol: str,
    contract_type: str = "ALL",
    strike_range: str = "NTM",
    strike_count: int = 10,
    include_underlying_quote: bool = True,
) -> dict[str, Any]:
    """
    Fetch option chain for symbol from Schwab.
    Returns dict with underlying, calls, puts.
    """
    from schwab.client import Client

    from app.schwab.client import get_client

    client = get_client()
    opts = Client.Options

    ctype = getattr(opts.ContractType, contract_type, opts.ContractType.ALL)

    # Use only strike_count; omit strike_range to avoid Schwab 400 "Invalid Parameter/Value".
    # Docs note that when both are sent, the API overrides range, which can cause errors.
    today = date.today()
    from_date = today
    to_date = today + timedelta(days=90)  # Next 3 months of expirations

    resp = client.get_option_chain(
        symbol.upper(),
        contract_type=ctype,
        strike_count=strike_count,
        include_underlying_quote=include_underlying_quote,
        from_date=from_date,
        to_date=to_date,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab options API error {resp.status_code}: {resp.text}")

    data = resp.json()
    return _parse_option_chain(data, symbol)


def _parse_option_chain(data: dict[str, Any], symbol: str) -> dict[str, Any]:
    """Parse Schwab option chain into simplified structure."""
    underlying = {}
    if "underlying" in data and isinstance(data["underlying"], dict):
        u = data["underlying"]
        underlying = {
            "symbol": u.get("symbol", symbol),
            "last": _float(u, "last", "close", "mark"),
            "bid": _float(u, "bid"),
            "ask": _float(u, "ask"),
        }

    calls: list[dict[str, Any]] = []
    puts: list[dict[str, Any]] = []

    call_map = data.get("callExpDateMap") or {}
    put_map = data.get("putExpDateMap") or {}

    for exp_str, strikes in (call_map or {}).items():
        if not isinstance(strikes, dict):
            continue
        for strike_str, contracts in strikes.items():
            if not isinstance(contracts, list) or not contracts:
                continue
            for c in contracts:
                if isinstance(c, dict):
                    calls.append(_contract_to_row(c, "CALL", exp_str, strike_str))

    for exp_str, strikes in (put_map or {}).items():
        if not isinstance(strikes, dict):
            continue
        for strike_str, contracts in strikes.items():
            if not isinstance(contracts, list) or not contracts:
                continue
            for c in contracts:
                if isinstance(c, dict):
                    puts.append(_contract_to_row(c, "PUT", exp_str, strike_str))

    return {
        "underlying": underlying,
        "calls": calls[:100],
        "puts": puts[:100],
    }


def _contract_to_row(
    c: dict[str, Any],
    put_call: str,
    exp_str: str,
    strike_str: str,
) -> dict[str, Any]:
    """Convert single contract to row dict."""
    strike = _float(c, "strikePrice", "strike") or _float_from_str(strike_str) or 0.0
    return {
        "symbol": c.get("symbol"),
        "description": c.get("description"),
        "putCall": put_call,
        "strike": strike,
        "expirationDate": c.get("expirationDate") or exp_str.split(":")[0] if ":" in exp_str else exp_str,
        "bid": _float(c, "bid"),
        "ask": _float(c, "ask"),
        "last": _float(c, "last", "close", "mark"),
        "delta": _float(c, "delta"),
        "gamma": _float(c, "gamma"),
        "theta": _float(c, "theta"),
        "vega": _float(c, "vega"),
        "volatility": _float(c, "volatility"),
        "volume": c.get("totalVolume"),
    }


def _float(d: dict[str, Any], *keys: str) -> float | None:
    for k in keys:
        v = d.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    return None


def _float_from_str(s: str) -> float | None:
    try:
        return float(str(s).strip())
    except (TypeError, ValueError):
        return None
