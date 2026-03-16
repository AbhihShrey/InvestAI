"""
Bulk fetch: pull last 10 years of daily price history from Schwab for given symbol(s)
and store in the backend database. Run once per symbol to backfill chart data.

  python -m app.schwab.fetch_bulk NVDA AAPL
  python -m app.schwab.fetch_bulk --symbols NVDA,AAPL
  python -m app.schwab.fetch_bulk --default

Run from repo root with PYTHONPATH=backend (e.g. devbox run fetch:prices).
"""
from __future__ import annotations

import asyncio
import os
import sys

from app.schwab.env import get_repo_root, load_schwab_env

load_schwab_env()
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(
        get_repo_root(), "backend", "app.db"
    )

from app.core.database import async_session_maker
from app.repositories.price_candle import PriceCandleRepository
from app.repositories.symbol import SymbolRepository
from app.schwab import fetch_daily_10_years

# Default symbol list for fetch:prices (devbox) and --default (MAG7 + SPY, QQQ)
DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ"]


async def run_bulk(symbols: list[str]) -> None:
    """Resolve symbol ids, fetch from Schwab, upsert into DB. Skips symbols that fail (e.g. delisted)."""
    async with async_session_maker() as session:
        symbol_repo = SymbolRepository(session)
        price_repo = PriceCandleRepository(session)
        all_symbols = await symbol_repo.get_all()
        ticker_to_id = {s.ticker.upper(): s.id for s in all_symbols}

        for ticker in symbols:
            ticker = ticker.upper().strip()
            if ticker not in ticker_to_id:
                try:
                    sym = await symbol_repo.create(ticker=ticker, name=None)
                    ticker_to_id[ticker] = sym.id
                    print(f"Created symbol {ticker} (id={sym.id})")
                except Exception as e:
                    print(f"  Skip {ticker}: could not create symbol: {e}", file=sys.stderr)
                    continue
            symbol_id = ticker_to_id[ticker]
            print(f"Fetching 10 years daily for {ticker} (id={symbol_id})...")
            try:
                candles = fetch_daily_10_years(ticker)
            except Exception as e:
                print(f"  Skip {ticker}: fetch failed: {e}", file=sys.stderr)
                continue
            if not candles:
                print(f"  Skip {ticker}: no candles returned", file=sys.stderr)
                continue
            for c in candles:
                c.symbol_id = symbol_id
            await price_repo.upsert_candles(candles)
            await session.commit()
            print(f"  Upserted {len(candles)} candles for {ticker}.")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(
            "Usage: python -m app.schwab.fetch_bulk SYMBOL [SYMBOL ...]",
            file=sys.stderr,
        )
        print(
            "   or: python -m app.schwab.fetch_bulk --symbols NVDA,AAPL",
            file=sys.stderr,
        )
        print(
            "   or: python -m app.schwab.fetch_bulk --default  # MAG7 + SPY, QQQ",
            file=sys.stderr,
        )
        sys.exit(1)
    if args[0] == "--default":
        symbols = list(DEFAULT_SYMBOLS)
        print(f"Using default symbols: {', '.join(symbols)}")
    elif args[0] == "--symbols" and len(args) >= 2:
        symbols = [s.strip() for s in args[1].split(",") if s.strip()]
    else:
        symbols = [s.strip() for s in args if s.strip() and not s.startswith("-")]
    if not symbols:
        print("No symbols given.", file=sys.stderr)
        sys.exit(1)
    asyncio.run(run_bulk(symbols))


if __name__ == "__main__":
    main()
