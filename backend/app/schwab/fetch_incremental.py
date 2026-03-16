"""
Incremental fetch: pull new daily price data from Schwab for all symbols that already
have stored candles, from (last stored date + 1) through yesterday, and upsert.

Run as an offline/scheduled process (e.g. cron daily after market close):
  python -m app.schwab.fetch_incremental

Run from repo root with PYTHONPATH=backend.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

from app.schwab.env import get_repo_root, load_schwab_env

load_schwab_env()
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(
        get_repo_root(), "backend", "app.db"
    )

from app.core.database import async_session_maker
from app.repositories.price_candle import PriceCandleRepository
from app.repositories.symbol import SymbolRepository
from app.schwab import fetch_daily_range


async def run_incremental() -> None:
    """For each symbol that has at least one candle, fetch from (last_date+1) to yesterday and upsert."""
    async with async_session_maker() as session:
        symbol_repo = SymbolRepository(session)
        price_repo = PriceCandleRepository(session)
        all_symbols = await symbol_repo.get_all()
        if not all_symbols:
            print(
                "No symbols in DB. Run bulk fetch first (e.g. python -m app.schwab.fetch_bulk --default)."
            )
            return

        today_utc = datetime.now(timezone.utc).date()
        end_date = today_utc - timedelta(days=1)

        total_upserted = 0
        for sym in all_symbols:
            last = await price_repo.get_latest_date(sym.id, "1D")
            if last is None:
                print(f"  {sym.ticker}: no stored data, skip (run bulk first)")
                continue
            start_date = last + timedelta(days=1)
            if start_date > end_date:
                print(f"  {sym.ticker}: already up to date through {last}")
                continue
            print(f"  {sym.ticker}: fetching {start_date} to {end_date}...")
            candles = fetch_daily_range(sym.ticker, start_date, end_date)
            for c in candles:
                c.symbol_id = sym.id
            await price_repo.upsert_candles(candles)
            await session.commit()
            total_upserted += len(candles)
            print(f"    upserted {len(candles)} candles.")

        print(f"Incremental done. Total new/updated candles: {total_upserted}")


def main() -> None:
    asyncio.run(run_incremental())


if __name__ == "__main__":
    main()
