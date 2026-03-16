# InvestAI Backend

FastAPI backend for InvestAI. See project root README for run and deploy instructions.

## Local development

```bash
# From backend/
python -m venv .venv
.venv/bin/pip install -e .
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Database

Set `DATABASE_URL` in `config/.env` (or backend `.env`). Default: `sqlite+aiosqlite:///./app.db`. The app loads `config/.env` first when present.

**Switching to PostgreSQL (or any other backend):** Change only the connection string. No application code changes are required; the repository layer and `get_db()` use SQLAlchemy's async engine and sessions.

- **Local (SQLite):** `DATABASE_URL=sqlite+aiosqlite:///./app.db`
- **Production (PostgreSQL):** `DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname`

Run migrations with the same Alembic commands; they target whichever database `DATABASE_URL` points to. Use managed PostgreSQL (Neon, Supabase, RDS) in production for best reliability.
