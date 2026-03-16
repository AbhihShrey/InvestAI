# InvestAI backend – production image
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir -e .

# Application and migrations
COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Run migrations then server (override CMD for migration-only jobs)
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
