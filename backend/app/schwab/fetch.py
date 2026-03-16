"""Fetch daily price history from Schwab and map to PriceCandle models."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from app.models.price_candle import PriceCandle


def parse_candle_date(candle: dict) -> date | None:
    """Extract trade date from Schwab candle (datetime ms or date string)."""
    dt = candle.get("datetime")
    if dt is not None:
        if isinstance(dt, (int, float)):
            return datetime.fromtimestamp(dt / 1000.0, tz=timezone.utc).date()
        if isinstance(dt, str) and len(dt) >= 10:
            return date.fromisoformat(dt[:10])
    d = candle.get("date")
    if isinstance(d, str) and len(d) >= 10:
        return date.fromisoformat(d[:10])
    return None


def fetch_daily_10_years(symbol: str) -> list[PriceCandle]:
    """Fetch last 10 years of daily data from Schwab; return PriceCandle list (symbol_id=0)."""
    from app.schwab.client import get_client

    client = get_client()
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=10 * 365)
    resp = client.get_price_history_every_day(
        symbol,
        start_datetime=start,
        end_datetime=end,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab API error {resp.status_code}: {resp.text}")
    data = resp.json()
    candles_raw = data.get("candles") or []
    out: list[PriceCandle] = []
    for c in candles_raw:
        trade_date = parse_candle_date(c)
        if trade_date is None:
            continue
        try:
            open_ = float(c["open"])
            high = float(c["high"])
            low = float(c["low"])
            close = float(c["close"])
            volume = c.get("volume")
            if volume is not None:
                volume = int(volume)
        except (KeyError, TypeError, ValueError):
            continue
        out.append(
            PriceCandle(
                symbol_id=0,
                trade_date=trade_date,
                timeframe="1D",
                open=open_,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
        )
    return out


def fetch_daily_range(symbol: str, start_date: date, end_date: date) -> list[PriceCandle]:
    """Fetch daily data from Schwab for [start_date, end_date]; return PriceCandle list (symbol_id=0)."""
    from app.schwab.client import get_client

    client = get_client()
    start_dt = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc)
    end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
    resp = client.get_price_history_every_day(
        symbol,
        start_datetime=start_dt,
        end_datetime=end_dt,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Schwab API error {resp.status_code}: {resp.text}")
    data = resp.json()
    candles_raw = data.get("candles") or []
    out: list[PriceCandle] = []
    for c in candles_raw:
        trade_date = parse_candle_date(c)
        if trade_date is None:
            continue
        try:
            open_ = float(c["open"])
            high = float(c["high"])
            low = float(c["low"])
            close = float(c["close"])
            volume = c.get("volume")
            if volume is not None:
                volume = int(volume)
        except (KeyError, TypeError, ValueError):
            continue
        out.append(
            PriceCandle(
                symbol_id=0,
                trade_date=trade_date,
                timeframe="1D",
                open=open_,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
        )
    return out
