"""Server-side indicator computation for chart data."""

from __future__ import annotations


def _ema(arr: list[float], period: int) -> list[float]:
    k = 2.0 / (period + 1)
    out: list[float] = []
    if len(arr) < period:
        return out
    prev = sum(arr[:period]) / period
    for i in range(period):
        out.append(prev)
    for i in range(period, len(arr)):
        prev = arr[i] * k + prev * (1 - k)
        out.append(prev)
    return out


def compute_rsi(closes: list[float], period: int = 14) -> list[float]:
    out: list[float] = []
    for i in range(len(closes)):
        if i < period:
            out.append(50.0)
            continue
        gains = 0.0
        losses = 0.0
        for j in range(i - period, i):
            d = closes[j + 1] - closes[j]
            if d > 0:
                gains += d
            else:
                losses -= d
        avg_gain = gains / period
        avg_loss = losses / period
        if avg_loss == 0:
            out.append(100.0)
            continue
        rs = avg_gain / avg_loss
        out.append(100.0 - 100.0 / (1 + rs))
    return out


def compute_ppo(
    closes: list[float],
    fast: int = 10,
    slow: int = 16,
    signal_period: int = 9,
) -> tuple[list[float], list[float], list[float]]:
    """PPO line, signal line, histogram."""
    fast_ema = _ema(closes, fast)
    slow_ema = _ema(closes, slow)
    if len(fast_ema) != len(closes) or len(slow_ema) != len(closes):
        return [], [], []
    ppo_line: list[float] = []
    for i in range(len(closes)):
        s = slow_ema[i]
        if s != 0:
            ppo_line.append(((fast_ema[i] - s) / s) * 100.0)
        else:
            ppo_line.append(0.0)
    signal_line = _ema(ppo_line, signal_period)
    hist: list[float] = []
    for i in range(len(ppo_line)):
        hist.append(ppo_line[i] - (signal_line[i] if i < len(signal_line) else 0.0))
    return ppo_line, signal_line, hist
