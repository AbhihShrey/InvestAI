"""
GEX (Gamma Exposure) CSV parsing, strategy signals, backtest, and metrics.
CSV columns: date, price, dix, gex. Reads from a static file; later can be updated daily.
"""
from __future__ import annotations

import csv
import os
from typing import Literal

StrategyName = Literal["Extreme GEX", "Binary GEX", "GEX Trend"]

# Default path: backend/data/gex.csv (relative to this package)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_GEX_CSV_PATH = os.path.join(_BACKEND_DIR, "data", "gex.csv")


def _rolling_percentile(arr: list[float], window: int, p: float) -> list[float]:
    out: list[float] = []
    for i in range(len(arr)):
        start = max(0, i - window + 1)
        slice_arr = arr[start : i + 1]
        sorted_arr = sorted(slice_arr)
        idx = max(0, int((p / 100) * (len(sorted_arr) - 1)))
        out.append(sorted_arr[idx] if sorted_arr else arr[i])
    return out


def _simple_ma(arr: list[float], period: int) -> list[float]:
    out: list[float] = []
    for i in range(len(arr)):
        if i < period - 1:
            out.append(arr[i])
            continue
        out.append(sum(arr[i - period + 1 : i + 1]) / period)
    return out


def _positions_extreme(
    gex: list[float], window: int, low_pct: float, high_pct: float
) -> list[int]:
    p_low = _rolling_percentile(gex, window, low_pct)
    p_high = _rolling_percentile(gex, window, high_pct)
    pos: list[int] = []
    for i, g in enumerate(gex):
        if g <= p_low[i]:
            pos.append(1)
        elif g >= p_high[i]:
            pos.append(-1)
        else:
            pos.append(0)
    return pos


def _positions_binary(gex: list[float]) -> list[int]:
    return [1 if g > 0 else -1 for g in gex]


def _positions_trend(
    gex: list[float], short_period: int, long_period: int
) -> list[int]:
    short_ma = _simple_ma(gex, short_period)
    long_ma = _simple_ma(gex, long_period)
    pos: list[int] = []
    for i in range(len(gex)):
        if i < long_period - 1:
            pos.append(0)
        else:
            pos.append(1 if short_ma[i] > long_ma[i] else -1)
    return pos


def load_gex_csv(path: str | None = None) -> list[dict]:
    """Load and parse GEX CSV. Returns list of {date, price, dix, gex}."""
    p = path or DEFAULT_GEX_CSV_PATH
    if not os.path.isfile(p):
        raise FileNotFoundError(f"GEX CSV not found: {p}")
    rows: list[dict] = []
    with open(p, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                date = (row.get("date") or "").strip()
                price = float((row.get("price") or "0").strip())
                gex = float((row.get("gex") or "0").strip())
                dix = float((row.get("dix") or "0").strip())
            except (ValueError, TypeError):
                continue
            if not date:
                continue
            rows.append({"date": date, "price": price, "dix": dix, "gex": gex})
    return rows


def run_backtest(
    rows: list[dict],
    extreme_window: int = 252,
    extreme_low_pct: float = 10,
    extreme_high_pct: float = 90,
    trend_short: int = 5,
    trend_long: int = 20,
) -> list[dict]:
    """
    Run all three strategies and return list of strategy results, each with
    name, equity_curve [{time, value}], trades [{date, strategy, action, side, price, gex}], metrics.
    """
    if len(rows) < 2:
        return []
    gex = [r["gex"] for r in rows]
    prices = [r["price"] for r in rows]

    pos_extreme = _positions_extreme(
        gex, extreme_window, extreme_low_pct, extreme_high_pct
    )
    pos_binary = _positions_binary(gex)
    pos_trend = _positions_trend(gex, trend_short, trend_long)

    strategies = [
        ("Extreme GEX", pos_extreme),
        ("Binary GEX", pos_binary),
        ("GEX Trend", pos_trend),
    ]

    results: list[dict] = []
    for name, positions in strategies:
        equity, returns = _backtest(prices, positions)
        trades = _build_trades(rows, positions, name)
        metrics = _compute_metrics(equity, returns, trades)
        equity_curve = [
            {"time": rows[i]["date"], "value": equity[i]}
            for i in range(min(len(rows), len(equity)))
        ]
        results.append({
            "name": name,
            "equityCurve": equity_curve,
            "trades": trades,
            "metrics": metrics,
        })
    return results


def _backtest(prices: list[float], positions: list[int]) -> tuple[list[float], list[float]]:
    equity = [1.0]
    returns: list[float] = []
    for i in range(len(prices) - 1):
        pos = positions[i] if i < len(positions) else 0
        ret = pos * ((prices[i + 1] - prices[i]) / prices[i])
        returns.append(ret)
        equity.append(equity[-1] * (1 + ret))
    return equity, returns


def _position_changes(positions: list[int]) -> list[tuple[int, int, int]]:
    changes: list[tuple[int, int, int]] = []
    for i in range(1, len(positions)):
        if positions[i - 1] != positions[i]:
            changes.append((i, positions[i - 1], positions[i]))
    return changes


def _build_trades(
    rows: list[dict], positions: list[int], strategy_name: str
) -> list[dict]:
    changes = _position_changes(positions)
    trades: list[dict] = []
    for idx, from_pos, to_pos in changes:
        row = rows[idx]
        if from_pos != 0:
            trades.append({
                "date": row["date"],
                "strategy": strategy_name,
                "action": "Sell",
                "side": "Long" if from_pos == 1 else "Short",
                "price": row["price"],
                "gex": row["gex"],
            })
        if to_pos != 0:
            trades.append({
                "date": row["date"],
                "strategy": strategy_name,
                "action": "Buy",
                "side": "Long" if to_pos == 1 else "Short",
                "price": row["price"],
                "gex": row["gex"],
            })
    return trades


def _compute_metrics(
    equity: list[float],
    returns: list[float],
    trades: list[dict],
) -> dict:
    n = len(returns)
    total_return_pct = (equity[-1] - 1) * 100 if n > 0 else 0
    years = n / 252
    cagr_pct = (
        (equity[-1] ** (1 / years) - 1) * 100
        if years > 0 and equity[-1] > 0
        else 0
    )
    mean_ret = sum(returns) / n if n > 0 else 0
    variance = (
        sum((r - mean_ret) ** 2 for r in returns) / n if n > 0 else 0
    )
    std = variance ** 0.5
    ann_vol_pct = std * (252 ** 0.5) * 100
    sharpe = (
        (mean_ret * 252) / (std * (252 ** 0.5)) if std > 0 else 0
    )
    downside = [r for r in returns if r < 0]
    downside_std = (
        (sum(r * r for r in downside) / len(downside)) ** 0.5
        if downside else 0
    )
    sortino = (
        (mean_ret * 252) / (downside_std * (252 ** 0.5)) if downside_std > 0 else 0
    )
    peak = 1.0
    max_dd_pct = 0.0
    max_dd_days = 0
    dd_start = 0
    for i, e in enumerate(equity):
        if e > peak:
            peak = e
            dd_start = i
        dd = (peak - e) / peak * 100
        if dd > max_dd_pct:
            max_dd_pct = dd
            max_dd_days = i - dd_start
    calmar = cagr_pct / max_dd_pct if max_dd_pct > 0 else 0

    trade_returns: list[float] = []
    open_price: float | None = None
    open_side: str | None = None
    for t in trades:
        if t["action"] == "Buy":
            open_price = t["price"]
            open_side = t["side"]
        elif t["action"] == "Sell" and open_price is not None and open_side:
            ret = (
                (t["price"] - open_price) / open_price
                if open_side == "Long"
                else (open_price - t["price"]) / open_price
            )
            trade_returns.append(ret * 100)
            open_price = None
            open_side = None
    round_trips = len(trade_returns)
    wins = sum(1 for r in trade_returns if r > 0)
    win_rate_pct = (wins / round_trips * 100) if round_trips > 0 else 0
    gross_profit = sum(r for r in trade_returns if r > 0)
    gross_loss = abs(sum(r for r in trade_returns if r < 0))
    profit_factor = (
        gross_profit / gross_loss if gross_loss > 0 else (999 if gross_profit > 0 else 0)
    )
    wins_list = [r for r in trade_returns if r > 0]
    losses_list = [r for r in trade_returns if r < 0]
    avg_win_pct = sum(wins_list) / len(wins_list) if wins_list else 0
    avg_loss_pct = sum(losses_list) / len(losses_list) if losses_list else 0

    return {
        "totalReturnPct": round(total_return_pct, 2),
        "cagrPct": round(cagr_pct, 2),
        "sharpe": round(sharpe, 2),
        "sortino": round(sortino, 2),
        "calmar": round(calmar, 2),
        "maxDrawdownPct": round(max_dd_pct, 2),
        "maxDrawdownDays": max_dd_days,
        "annualizedVolPct": round(ann_vol_pct, 2),
        "numTrades": round_trips,
        "winRatePct": round(win_rate_pct, 1),
        "profitFactor": round(profit_factor, 2),
        "avgWinPct": round(avg_win_pct, 2),
        "avgLossPct": round(avg_loss_pct, 2),
    }
