"""Fetch market hours from Schwab API."""

from __future__ import annotations

from datetime import date
from typing import Any

from app.schwab.client import get_client


def fetch_market_hours(
    for_date: date | None = None,
) -> dict[str, Any]:
    """
    Fetch market hours for equity and option markets.
    Returns dict with market status and session times.
    """
    from schwab.client import Client

    client = get_client()
    markets = [Client.MarketHours.Market.EQUITY, Client.MarketHours.Market.OPTION]
    target_date = for_date or date.today()

    resp = client.get_market_hours(markets, date=target_date)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Schwab market hours API error {resp.status_code}: {resp.text}"
        )

    data = resp.json()
    return _parse_market_hours(data, target_date)


def _parse_market_hours(data: dict[str, Any], target_date: date) -> dict[str, Any]:
    """Parse Schwab response into simplified structure."""
    equity = data.get("equity") or data.get("EQUITY") or {}
    option = data.get("option") or data.get("OPTION") or {}

    def session_info(market_data: dict) -> dict[str, Any]:
        if not market_data:
            return {"isOpen": False, "sessionStart": None, "sessionEnd": None}
        # Schwab returns structure like: { "equity": { "EQ": { "sessionHours": {...} } } }
        # or { "equity": { "isOpen": true, "sessionHours": { "regularMarket": { "start": "...", "end": "..." } } } }
        session = (
            market_data.get("sessionHours")
            or market_data.get("regularMarket")
            or market_data
        )
        if isinstance(session, dict) and "regularMarket" in session:
            session = session["regularMarket"]
        elif isinstance(session, dict) and "sessionHours" in market_data:
            inner = market_data["sessionHours"]
            session = (
                inner.get("regularMarket")
                if isinstance(inner, dict)
                else inner
            ) or inner

        is_open = market_data.get("isOpen", False) if isinstance(market_data.get("isOpen"), bool) else False
        start = None
        end = None
        if isinstance(session, dict):
            start = session.get("start") or session.get("open")
            end = session.get("end") or session.get("close")

        return {
            "isOpen": is_open,
            "sessionStart": start,
            "sessionEnd": end,
        }

    eq_info = session_info(equity.get("EQ", equity) if isinstance(equity.get("EQ"), dict) else equity)
    opt_info = session_info(option.get("option", option) if isinstance(option.get("option"), dict) else option)

    # Determine overall market status (equity drives the main market)
    is_open = eq_info.get("isOpen", False)
    return {
        "date": target_date.isoformat(),
        "equityMarketOpen": is_open,
        "optionMarketOpen": opt_info.get("isOpen", False),
        "equitySessionStart": eq_info.get("sessionStart"),
        "equitySessionEnd": eq_info.get("sessionEnd"),
        "optionSessionStart": opt_info.get("sessionStart"),
        "optionSessionEnd": opt_info.get("sessionEnd"),
    }
