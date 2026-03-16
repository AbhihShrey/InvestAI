# InvestAI

Full-stack investing dashboard: options flow, TradingView charts, and stock reports. Runs locally on macOS and deploys to the cloud.

For a detailed system overview, see the [Architecture and Data Flow](ARCHITECTURE.md) document.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, TradingView Lightweight Charts
- **Backend:** Python 3.12+, FastAPI, Uvicorn
- **Database:** SQLite locally; PostgreSQL (or any supported DB) in production via `DATABASE_URL`

## Run locally (MacBook)

### 1. Environment

Copy the central config template and set values (backend, frontend, optional Schwab). Frontend still uses its own `.env.local` for `NEXT_PUBLIC_API_URL`:

```bash
cp config/.env.example config/.env
cp frontend/.env.local.example frontend/.env.local
# Edit config/.env and frontend/.env.local as needed (e.g. NEXT_PUBLIC_API_URL in frontend)
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e .
.venv/bin/alembic upgrade head
PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### 3. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Devbox (optional)

If you use [Devbox](https://www.jetpack.io/devbox):

```bash
devbox shell
# Then in two terminals:
devbox run dev:backend
devbox run dev:frontend
```

Run `devbox run install-deps` once (installs backend deps and runs `alembic upgrade head` to apply DB migrations).

### Docker Compose (optional)

One-command run with Docker:

```bash
docker compose up --build
```

Frontend: http://localhost:3000  
Backend: http://localhost:8000

## Deploy to production

### Frontend (e.g. Vercel)

1. Build: `cd frontend && npm run build`
2. Deploy to [Vercel](https://vercel.com) (or any Node host). Connect the repo and set:
   - **Build command:** `npm run build`
   - **Output directory:** `.next` (or default)
   - **Env:** `NEXT_PUBLIC_API_URL=https://your-backend-url`

### Backend (e.g. Railway, Render, Fly.io)

1. Build the Docker image from the backend directory:
   ```bash
   docker build -t investai-api ./backend
   ```
2. Run with a production database:
   - Set `DATABASE_URL` to PostgreSQL (e.g. Neon, Supabase, RDS):  
     `postgresql+asyncpg://user:pass@host:port/dbname`
   - Run migrations (e.g. in CI or a one-off job):  
     `docker run --env DATABASE_URL=... investai-api alembic upgrade head`
   - Start the API:  
     `docker run -p 8000:8000 --env DATABASE_URL=... investai-api`

No code changes are required to switch from SQLite to PostgreSQL; only the `DATABASE_URL` environment variable.

### Database

- **Local:** SQLite (`DATABASE_URL=sqlite+aiosqlite:///./app.db`).
- **Production:** Prefer managed PostgreSQL. Use the same Alembic migrations; set `DATABASE_URL=postgresql+asyncpg://...`.

## Schwab price data (charts)

Schwab API client and fetch logic live in **`backend/app/schwab/`** (package `app.schwab`). Stored OHLCV data for charts comes from the Schwab API. Run from **repo root** with `PYTHONPATH=backend`; env and token are read from **`config/`** (see `config/.env.example`). Backend DB must exist and migrations applied.

### 1. Bulk fetch (initial backfill, ~10 years daily)

Fetches the last 10 years of daily bars for the given symbol(s) and upserts into the backend DB. Creates the symbol in the DB if it does not exist.

```bash
# From repo root; ensure backend with schwab extra installed (e.g. pip install -e backend[schwab])
# DATABASE_URL can be set in config/.env (default: backend app.db)

PYTHONPATH=backend python -m app.schwab.fetch_bulk NVDA AAPL
# or
PYTHONPATH=backend python -m app.schwab.fetch_bulk --symbols NVDA,AAPL
# Default list (MAG7: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META + SPY, QQQ):
PYTHONPATH=backend python -m app.schwab.fetch_bulk --default
```

**Devbox (Python 3.12):** Run `devbox run install-deps` once (installs pinned backend + schwab deps and runs migrations), then:

```bash
devbox run fetch:prices
```

This runs the bulk fetch for the default symbols. Symbols that fail (e.g. delisted like SNDK) are skipped; the rest are stored.

**Env and token:** Use **`config/.env`** for `SCHWAB_API_KEY`, `SCHWAB_APP_SECRET`, and `SCHWAB_TOKEN_PATH` (e.g. `config/.schwab_token.json`). See `config/.env.example`. Generate a token once: `PYTHONPATH=backend python -m app.schwab.generate_token` or `python scripts/generate_schwab_token.py` (from repo root).

**Tests:** From repo root with backend on path: `pytest tests/schwab/ -v`. Unit tests use mocks; the NVDA integration test is skipped when credentials are not set.

### 2. Incremental fetch (offline/scheduled)

Fetches only new days since the last stored date for every symbol that already has data, through yesterday. Intended for a daily cron or scheduler after market close.

```bash
PYTHONPATH=backend python -m app.schwab.fetch_incremental
```

Run after bulk backfill. No arguments; reads symbols and last stored date from the DB.

### API for charts

- `GET /api/v1/symbols/{symbol_id}/prices?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&timeframe=1D` – returns stored OHLCV for the symbol. Use this in the frontend to feed TradingView charts.

## License

Private / use as you wish.
