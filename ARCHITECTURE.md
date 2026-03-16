## Architecture and Data Flow

This document describes how the frontend and backend fit together, how data flows between them, how it is stored, and how each side is deployed.

---

## High-level overview

- **Frontend (`frontend/`)**
  - Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
  - Renders the investing dashboard UI (symbol search, filters, TradingView-style charts, report views).
  - Talks to the backend over HTTPS/JSON using a thin API client in `frontend/lib/api.ts`.
  - Computes no technical indicators; it only renders the series returned by the backend.

- **Backend (`backend/`)**
  - FastAPI application (`app.main:app`) with async SQLAlchemy and Alembic migrations.
  - Stores symbols and OHLCV candles in a relational database (SQLite by default, PostgreSQL in production) via models in `app/models/`.
  - Schwab integration in `app/schwab/` fetches price data and writes it into the DB.
  - Indicator engine in `app/indicators.py` computes RSI and PPO server‑side for any symbol + date range.
  - Public HTTP API under `/api/v1/` serves symbols and prices + indicators to the frontend.

---

## Backend components

### Configuration and app entrypoint

- `app/core/config.py`
  - Central config via pydantic settings (e.g. `DATABASE_URL`, API prefix, Schwab env).
  - Reads from `config/.env` in local/dev setups.

- `app/main.py`
  - Creates the FastAPI app and wires:
    - Lifespan handler (startup/shutdown).
    - CORS middleware for the Next.js frontend (`http://localhost:3000`).
    - API router under `settings.api_v1_prefix` (typically `/api/v1`).

### Database and models

- `app/core/database.py`
  - Creates the async SQLAlchemy engine and `AsyncSession` factory.
  - Dependency `get_db()` is injected into API endpoints.

- `app/models/base.py`
  - Declarative base class for ORM models.

- `app/models/symbol.py`
  - `Symbol` table with `id`, `ticker`, `name`, timestamps.
  - Represents a single ticker tracked by the system (e.g. NVDA).

- `app/models/price_candle.py`
  - `PriceCandle` table with:
    - `symbol_id` (FK to `Symbol`),
    - `trade_date` (daily bar),
    - `open`, `high`, `low`, `close`, `volume`,
    - `timeframe` (e.g. `"1D"`).
  - Stores the OHLCV time series used to drive charts and indicators.

### Repositories and schemas

- `app/repositories/symbol.py`
  - Encapsulates DB access for `Symbol`:
    - `get_all()` – list all symbols.
    - `get_by_id(id)` – load one symbol or `None`.
    - `create(ticker, name)` – insert a new row.

- `app/repositories/price_candle.py`
  - Encapsulates DB access for `PriceCandle`:
    - `get_range(symbol_id, from_date, to_date, timeframe)` – load candles in a date range.
    - Upsert helpers used by Schwab ingestion (insert new bars, update existing).

- `app/schemas/price_candle.py`
  - Pydantic model `PriceCandleResponse` used in API responses.

- `app/schemas/symbol.py`
  - `SymbolResponse` and `SymbolCreate` for API I/O.

- `app/schemas/indicators.py`
  - `TimeValuePoint { time: str, value: float }` – generic time‑series point.
  - `PpoIndicatorSeries` – `{ line, signal, hist }` arrays of `TimeValuePoint`.
  - `IndicatorSeriesResponse` – `{ volume, rsi, ppo }`.
  - `SymbolPricesResponse` – `{ candles: PriceCandleResponse[], indicators: IndicatorSeriesResponse | None }`.

### Indicator computation

- `app/indicators.py`
  - `compute_rsi(closes: list[float], period: int = 14) -> list[float]`
    - Classic RSI algorithm using gains/losses over a sliding window.
  - `compute_ppo(closes, fast=10, slow=16, signal_period=9)`
    - EMA‑based PPO:
      - `ppo = (EMA_fast - EMA_slow) / EMA_slow * 100`.
      - `signal = EMA_signalPeriod(ppo)`.
      - `hist = ppo - signal`.
  - All indicator math is **server‑side**; the frontend receives final series only.

### Schwab ingestion

- `app/schwab/client.py`
  - Typed Schwab HTTP client; handles authentication using credentials/token from `config/.env`.

- `app/schwab/fetch_bulk.py`
  - CLI entrypoint for bulk backfill:
    - For each symbol requested, fetches ~10 years of daily OHLCV.
    - Upserts into `PriceCandle` table; creates `Symbol` rows as needed.

- `app/schwab/fetch_incremental.py`
  - CLI entrypoint for daily incremental updates:
    - For each symbol with existing data, finds the latest `trade_date`.
    - Fetches new candles from Schwab after that date up to yesterday.
    - Upserts them into the DB.

Data from Schwab is therefore **pulled offline** (via scripts or scheduled jobs) and stored; the API only reads from the DB and never calls Schwab on demand for end‑user requests.

### HTTP API

- `app/api/v1/symbols.py`
  - `GET /api/v1/symbols/`
    - Returns all tracked symbols as `SymbolResponse[]`.
    - Used by the frontend to populate the symbol search/dropdown.
  - `POST /api/v1/symbols/`
    - Creates a new symbol row; mainly used by ingestion / admin flows.
  - `GET /api/v1/symbols/{symbol_id}/prices`
    - Query params:
      - `from_date`: `YYYY-MM-DD`
      - `to_date`: `YYYY-MM-DD`
      - `timeframe`: default `"1D"`
      - `include_indicators`: default `true`
    - Flow:
      1. Validate symbol exists; validate `from_date <= to_date`.
      2. Use `PriceCandleRepository.get_range(...)` to load candles.
      3. Build `PriceCandleResponse` list (`candles`).
      4. If `include_indicators` and candles exist:
         - Extract `times = trade_date.isoformat()` and `closes`, `volumes`.
         - Compute:
           - Volume: `TimeValuePoint` per bar (`time`, `volume`).
           - RSI: `compute_rsi(closes, 14)` mapped to `TimeValuePoint` per `time`.
           - PPO: `compute_ppo(closes, 10, 16, 9)` assembled into `PpoIndicatorSeries`.
         - Pack them into `IndicatorSeriesResponse`.
      5. Return `SymbolPricesResponse(candles=candles, indicators=indicators | None)`.

---

## Frontend components

### API client

- `frontend/lib/api.ts`
  - `API_BASE` from `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000` in dev).
  - Types mirror backend schemas:
    - `SymbolResponse`, `PriceCandleResponse`, `TimeValuePoint`,
      `PpoIndicatorSeries`, `IndicatorSeriesResponse`, `SymbolPricesResponse`.
  - `fetchSymbols(): Promise<SymbolResponse[]>`
    - `GET ${API_BASE}/api/v1/symbols/`.
  - `fetchPrices(symbolId, fromDate, toDate, timeframe = "1D", includeIndicators = true)`
    - `GET ${API_BASE}/api/v1/symbols/{id}/prices?from_date=...&to_date=...&timeframe=...&include_indicators=...`.
    - Returns `SymbolPricesResponse`.

### Main page and data flow

- `frontend/app/page.tsx`
  - React client component (uses hooks).
  - Local state:
    - `symbols`: list of tickers from `fetchSymbols()`.
    - `symbol`: user‑entered symbol string.
    - `fromDate`, `toDate`: date filter inputs.
    - `candles`: raw `PriceCandleResponse[]` from API.
    - `indicators`: `IndicatorSeriesResponse | null` from API.
    - `loading`, `error`: UI feedback.
  - On mount:
    - Calls `fetchSymbols()` once and populates `symbols`.
  - `search` handler:
    1. Validates symbol exists in `symbols` (case‑insensitive).
    2. Validates `fromDate`/`toDate` are set and ordered.
    3. Calls `fetchPrices(sym.id, fromDate, toDate, "1D", true)`.
    4. On success:
       - Stores `data.candles` in `candles`.
       - Stores `data.indicators` in `indicators`.
  - `apiCandlesToOhlcv`:
    - Converts `PriceCandleResponse` to `OHLCV` format expected by lightweight‑charts:
      - `time` converted from `YYYY-MM-DD` to a UNIX second string using `dateToUnixTime`.
  - Renders:
    - `FilterBar` for symbol/date inputs and search button.
    - Error / loading banners.
    - `ChartContainer` with:
      - `data={chartData}` (converted OHLCV).
      - `indicators={indicators}` (server‑computed).

### Chart container and integrated indicators

- `frontend/components/ChartContainer.tsx`
  - Thin wrapper around the integrated chart.
  - Props:
    - `data?: OHLCV[] | null` – candlestick data.
    - `indicators?: IndicatorSeriesResponse | null` – server‑side indicators.
    - Optional `indicatorOptions`, `onIndicatorOptionsChange` to externally control which panels are visible.
  - Maintains local `indicatorOptions` if not controlled:
    - `{ volume: boolean, rsi: boolean, ppo: boolean }`.
  - Renders:
    - A row of checkboxes to enable/disable Volume, RSI, PPO.
    - `TradingViewChartWithIndicators` with the current options.

- `frontend/components/TradingViewChart.tsx`
  - Exports:
    - `OHLCV` type.
    - Basic `TradingViewChart` (price‑only) – currently unused by the main page.
    - `TradingViewChartWithIndicators` – **integrated multi‑pane chart**:
      - Top pane: candlestick price chart.
      - Below: one panel per enabled indicator:
        - Volume histogram (green/red by candle direction).
        - RSI line.
        - PPO line + signal line + histogram.
  - Uses `lightweight-charts` to create separate chart instances for price and each indicator panel.
  - Time scale synchronization:
    - Attaches `subscribeVisibleLogicalRangeChange` on each chart.
    - When any pane scrolls/zooms, `syncRange` propagates the visible range to all other panes via `applyVisibleLogicalRange`.
    - This keeps all panels aligned in time so cross‑inspection is easy.

### Other UI components (brief)

- `frontend/components/FilterBar.tsx`
  - Symbol input (with autocomplete), date pickers, and “Search” button.
  - Emits callbacks to update `symbol`, `fromDate`, `toDate`, and to trigger `search`.

- `frontend/components/CandleTable.tsx`, `DataTable.tsx`, `MetricsGrid.tsx`, `ScoreBreakdown.tsx`, `VerdictBlock.tsx`, `SplitPane.tsx`, `AppBar.tsx`, `CollapsibleSection.tsx`
  - Supporting layout and reporting components used on chart/report pages.
  - Consume props derived from API data; they do not make network calls themselves.

---

## End-to-end data flow

Below is a typical user interaction and how data moves through the system.

### 1. Data ingestion (offline, before user interacts)

1. Operator runs:
   - `PYTHONPATH=backend python -m app.schwab.fetch_bulk --default`
     or `devbox run fetch:prices`.
2. `fetch_bulk` uses `app.schwab.client` to call Schwab’s API for each symbol.
3. Responses are normalized into candle records and persisted via `PriceCandleRepository` into `PriceCandle` (and `Symbol` if missing).
4. On an ongoing basis, operator (or cron) runs:
   - `PYTHONPATH=backend python -m app.schwab.fetch_incremental`.
5. That script fetches only new days of data for each symbol and upserts them.

At this point, the SQL database contains historical OHLCV series for the tracked symbols.

### 2. Frontend symbol and date selection

1. User opens the Next.js app at `http://localhost:3000`.
2. The `Home` component mounts and calls `fetchSymbols()`:
   - Browser → `GET /api/v1/symbols/` (FastAPI).
3. Backend:
   - `list_symbols` uses `SymbolRepository` to read all `Symbol` rows.
   - Converts them to `SymbolResponse[]` and returns JSON.
4. Frontend:
   - Stores `symbols` in state and uses them to drive the symbol input/autocomplete.

User then chooses:

- A symbol from the dropdown.
- A `from` and `to` date.
- Clicks **Search**.

### 3. Frontend → backend: price + indicators request

1. `search` handler validates:
   - The symbol exists in `symbols`.
   - Dates are present and `fromDate <= toDate`.
2. Calls:

   ```ts
   fetchPrices(sym.id, fromDate, toDate, "1D", true);
   ```

   which issues:

   ```http
   GET /api/v1/symbols/{id}/prices?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&timeframe=1D&include_indicators=true
   ```

3. Request flows:
   - Browser → Next.js server (proxy or direct) → FastAPI backend.

### 4. Backend: retrieve candles and compute indicators

In `get_symbol_prices`:

1. Validate:
   - Symbol exists (`SymbolRepository.get_by_id`).
   - `from_date <= to_date`.
2. Load candles:
   - `PriceCandleRepository.get_range(symbol_id, from_date, to_date, timeframe)`.
   - Returns ORM `PriceCandle` rows sorted by `trade_date`.
3. Map to response candles:
   - `price_candle_to_response(...)` → `PriceCandleResponse[]`.
4. If `include_indicators` and there are candles:
   - Extract:
     - `times = [c.trade_date.isoformat() for c in candles]`.
     - `closes = [float(c.close) ...]`.
     - `volumes = [float(c.volume or 0) ...]`.
   - Build:
     - Volume series: `TimeValuePoint(time, volume)` per bar.
     - RSI series: `compute_rsi(closes, 14)` mapped to `TimeValuePoint(time, rsiValue)`.
     - PPO series:
       - `ppo_line, ppo_signal, ppo_hist = compute_ppo(closes, 10, 16, 9)`.
       - Each zipped with `times` into `TimeValuePoint`.
   - Pack into:

     ```python
     indicators = IndicatorSeriesResponse(
       volume=volume_series,
       rsi=rsi_series,
       ppo=ppo_series,
     )
     ```

5. Return `SymbolPricesResponse(candles=candle_responses, indicators=indicators)` as JSON.

No indicator logic runs in the browser; the frontend merely visualizes the backend’s output.

### 5. Backend → frontend: response handling

Frontend receives `SymbolPricesResponse`:

- `candles`: raw, date‑based OHLCV.
- `indicators`: possibly `null` or an object with volume/RSI/PPO series.

It updates React state:

- `setCandles(data.candles);`
- `setIndicators(data.indicators);`

Then recalculates `chartData` (the `OHLCV[]` with numeric `time` values) from `candles`.

### 6. Frontend rendering and charting

1. `ChartContainer` receives:
   - `data={chartData}`.
   - `indicators={indicators}`.
2. User toggles Volume / RSI / PPO checkboxes:
   - `ChartContainer` updates local `indicatorOptions`.
3. `TradingViewChartWithIndicators`:
   - Creates one lightweight‑charts instance for the price panel, plus one per enabled indicator.
   - Converts:
     - `OHLCV.time` (stringified UNIX seconds) back to `UTCTimestamp` for the price pane.
     - `IndicatorSeriesResponse.time` (ISO date strings) to `UTCTimestamp` using `dateToUnix`.
   - Feeds data into:
     - Price: `CandlestickSeries`.
     - Volume: `HistogramSeries` with color based on `open`/`close`.
     - RSI: `LineSeries`.
     - PPO: `LineSeries` (line + signal) + `HistogramSeries` (hist).
   - Subscribes to time‑scale visible range changes on every chart and synchronizes them, so all panes scroll/zoom together.

From the user’s perspective, they:

- Pick a symbol and date range.
- Click search.
- See the price chart and any enabled indicator panels update in sync.

---

## Storage and retrieval summary

- **Storage**
  - All canonical market data is stored in the **database**:
    - `Symbol` rows for tickers.
    - `PriceCandle` rows for daily OHLCV, keyed by symbol and trade date.
  - No candles or indicators are persisted in the frontend; they are always fetched from the API.
  - Indicators are **derived on the fly** in the API, not stored in the DB.

- **Retrieval**
  - CLI tools (`fetch_bulk`, `fetch_incremental`) retrieve from Schwab and write to DB.
  - API (`/api/v1/symbols/{id}/prices`) retrieves candles from DB and **computes** indicators per request.
  - Frontend retrieves from API only, using typed functions in `frontend/lib/api.ts`.

---

## Deployment topology

### Local development

- **Backend**
  - Run directly with Uvicorn:

    ```bash
    cd backend
    python3 -m venv .venv
    .venv/bin/pip install -e .
    .venv/bin/alembic upgrade head
    PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload
    ```

  - Serves `http://localhost:8000`.
  - Uses SQLite DB by default (file `backend/app.db`), path controlled by `DATABASE_URL` in `config/.env`.

- **Frontend**
  - Run Next.js dev server:

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

  - Serves `http://localhost:3000`.
  - `NEXT_PUBLIC_API_URL` in `frontend/.env.local` points to the backend, typically `http://localhost:8000`.

- **Devbox**
  - `devbox run dev:backend` and `devbox run dev:frontend` for a reproducible local environment.

- **Docker Compose**
  - `docker compose up --build`:
    - Starts backend and frontend containers.
    - Frontend container uses `NEXT_PUBLIC_API_URL` pointing at the backend service within the compose network.

### Production

- **Backend**
  - Typically built and run as a Docker image (see backend `Dockerfile`):
    - `DATABASE_URL` set to a managed PostgreSQL instance (e.g. Neon, Supabase, RDS).
    - `alembic upgrade head` run once before app start.
  - Can be deployed to:
    - Railway, Render, Fly.io, ECS, etc.
  - Exposes public HTTPS endpoint consumed by the frontend (e.g. `https://api.investingapp.com`).

- **Frontend**
  - Built with `npm run build` and deployed to:
    - Vercel or any Node/Next.js host.
  - `NEXT_PUBLIC_API_URL` is configured to use the production backend URL.
  - For static export or non‑Vercel hosts, the build output is served behind a reverse proxy that forwards `/api/` calls to the FastAPI backend.

In all environments, the contract is:

- Frontend talks only to `NEXT_PUBLIC_API_URL` (FastAPI).
- FastAPI talks only to the database (for candles/symbols) and Schwab scripts (offline ingestion).

