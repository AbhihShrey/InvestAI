"""Application configuration from environment."""

import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# When running from backend/, also load config/.env at repo root so one file serves all tools
_THIS_DIR = os.path.abspath(os.path.dirname(__file__))
_BACKEND_DIR = os.path.abspath(os.path.join(_THIS_DIR, "..", ".."))
_REPO_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
_CONFIG_ENV = os.path.join(_REPO_ROOT, "config", ".env")
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "app.db").replace("\\", "/")
_DEFAULT_DATABASE_URL = f"sqlite+aiosqlite:///{_DEFAULT_DB_PATH}"


def _normalize_sqlite_url(url: str) -> str:
    """Resolve relative paths in sqlite+aiosqlite URLs to absolute (repo-root relative)."""
    if "sqlite" not in url.split("://")[0].lower():
        return url
    # URL is like sqlite+aiosqlite:///./backend/app.db or sqlite+aiosqlite:///./app.db
    parts = url.split("://", 1)
    if len(parts) != 2:
        return url
    prefix, path = parts
    path = path.lstrip("/")
    if not path.startswith(".") and not (len(path) > 0 and path[0] != "/" and ":" not in path[:2]):
        # Already absolute or not a simple path
        return url
    # Resolve relative to repo root so it works from any cwd (e.g. backend/ when running alembic)
    abs_path = os.path.normpath(os.path.join(_REPO_ROOT, path)).replace("\\", "/")
    # Absolute path on Unix needs four slashes: sqlite+aiosqlite:////path
    return f"{prefix}:///{abs_path}"


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=[_CONFIG_ENV, ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = _DEFAULT_DATABASE_URL
    api_v1_prefix: str = "/api/v1"
    auth_jwt_secret: str = "change-me-in-production"
    auth_jwt_algorithm: str = "HS256"
    auth_jwt_expire_minutes: int = 60 * 24  # 24 hours

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str) and "sqlite" in v.split("://")[0].lower():
            return _normalize_sqlite_url(v)
        return v


settings = Settings()
