"""Fetch intraday price history from Schwab (1m, 5m)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def fetch_intraday(
    symbol: str,
    timeframe: str = "5m",
    start_datetime: datetime | None = None,
    end_datetime: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch intraday candles from Schwab.
    timeframe: "1m" (~48 days) or "5m" (~9 months)
    Returns list of { time, open, high, low, close, volume } (time as ISO string).
    """
    from app.schwab.client import get_client

    client = get_client()
    end = end_datetime or datetime.now(timezone.utc)
    if timeframe == "1m":
        start = start_datetime or (end - timedelta(days=48))
        resp = client.get_price_history_every_minute(symbol, start_datetime=start, end_datetime=end)
    else:
        start = start_datetime or (end - timedelta(days=9 * 30))
        resp = client.get_price_history_every_five_minutes(
            symbol, start_datetime=start, end_datetime=end
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab API error {resp.status_code}: {resp.text}")
    data = resp.json()
    candles_raw = data.get("candles") or []
    out: list[dict[str, Any]] = []
    for c in candles_raw:
        dt = _parse_datetime(c)
        if dt is None:
            continue
        try:
            open_ = float(c["open"])
            high = float(c["high"])
            low = float(c["low"])
            close = float(c["close"])
            volume = c.get("volume")
            volume = int(volume) if volume is not None else None
        except (KeyError, TypeError, ValueError):
            continue
        time_str = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        out.append(
            {
                "time": time_str,
                "open": open_,
                "high": high,
                "low": low,
                "close": close,
                "volume": volume,
            }
        )
    return out


def _parse_datetime(candle: dict) -> datetime | None:
    """Extract datetime from Schwab intraday candle."""
    dt = candle.get("datetime")
    if dt is not None:
        if isinstance(dt, (int, float)):
            return datetime.fromtimestamp(dt / 1000.0, tz=timezone.utc)
        if isinstance(dt, str) and len(dt) >= 19:
            try:
                return datetime.fromisoformat(dt.replace("Z", "+00:00"))
            except ValueError:
                pass
    d = candle.get("date")
    if isinstance(d, str) and len(d) >= 10:
        try:
            return datetime.fromisoformat(d[:10] + "T12:00:00+00:00")
        except ValueError:
            pass
    return None
