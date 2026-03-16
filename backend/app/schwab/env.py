"""
Schwab API environment variable names and loading.

All Schwab-related code should use these constants and load_schwab_env() so
env is loaded from config/.env first, then repo root .env, scripts/.env, and backend/.env.
"""
import os

# Canonical env var names used by app.schwab.client
SCHWAB_API_KEY = "SCHWAB_API_KEY"
SCHWAB_APP_SECRET = "SCHWAB_APP_SECRET"
SCHWAB_TOKEN_PATH = "SCHWAB_TOKEN_PATH"
SCHWAB_TOKEN_JSON = "SCHWAB_TOKEN_JSON"

# Backend package location -> repo root, config dir, scripts dir
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_REPO_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
_CONFIG_DIR = os.path.join(_REPO_ROOT, "config")
_SCRIPTS_DIR = os.path.join(_REPO_ROOT, "scripts")


def get_repo_root() -> str:
    """Return absolute path to repo root (parent of backend/)."""
    return _REPO_ROOT


def get_config_dir() -> str:
    """Return absolute path to central config directory (config/ at repo root)."""
    return _CONFIG_DIR


def get_scripts_dir() -> str:
    """Return absolute path to scripts/ directory."""
    return _SCRIPTS_DIR


def load_schwab_env() -> None:
    """Load .env from config/ first, then repo root, scripts/, backend/. Later files do not override earlier."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(os.path.join(_CONFIG_DIR, ".env"))
    load_dotenv(os.path.join(_REPO_ROOT, ".env"))
    load_dotenv(os.path.join(_SCRIPTS_DIR, ".env"))
    load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
