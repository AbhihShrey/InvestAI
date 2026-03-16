"""
Schwab API client factory using client_from_access_functions.
Token from SCHWAB_TOKEN_PATH (file) or SCHWAB_TOKEN_JSON (string). See app.schwab.env for var names.
"""
import json
import logging
import os

from schwab.auth import client_from_access_functions

from app.schwab.env import (
    SCHWAB_API_KEY,
    SCHWAB_APP_SECRET,
    SCHWAB_TOKEN_JSON,
    SCHWAB_TOKEN_PATH,
    _REPO_ROOT,
    load_schwab_env,
)

logger = logging.getLogger(__name__)

# Re-export for scripts/tests that expect ENV_* names
ENV_API_KEY = SCHWAB_API_KEY
ENV_APP_SECRET = SCHWAB_APP_SECRET
ENV_TOKEN_PATH = SCHWAB_TOKEN_PATH
ENV_TOKEN_JSON = SCHWAB_TOKEN_JSON


def _get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value or not value.strip():
        raise SystemExit(
            f"Missing required environment variable: {name}. "
            "Set it (e.g. copy config/.env.example to config/.env)."
        )
    return value.strip()


def get_client():
    """
    Create a Schwab API client using client_from_access_functions.
    Reads SCHWAB_API_KEY, SCHWAB_APP_SECRET; token from SCHWAB_TOKEN_PATH or SCHWAB_TOKEN_JSON.
    """
    load_schwab_env()
    api_key = _get_required_env(SCHWAB_API_KEY)
    app_secret = _get_required_env(SCHWAB_APP_SECRET)
    token_path = os.environ.get(SCHWAB_TOKEN_PATH)
    token_json = os.environ.get(SCHWAB_TOKEN_JSON)

    if not token_path and not token_json:
        raise SystemExit(
            f"Missing token: set {SCHWAB_TOKEN_PATH} (file path) or {SCHWAB_TOKEN_JSON} (JSON string). "
            "Run: python -m app.schwab.generate_token"
        )

    use_path = bool(token_path and token_path.strip())
    path_value = token_path.strip() if token_path else None
    if path_value and not os.path.isabs(path_value):
        path_value = os.path.normpath(os.path.join(_REPO_ROOT, path_value))

    def token_read_func():
        if use_path and path_value:
            with open(path_value, "r", encoding="utf-8") as f:
                return json.load(f)
        if token_json and token_json.strip():
            return json.loads(token_json)
        raise SystemExit(
            f"Cannot read token: {SCHWAB_TOKEN_PATH} is empty or file missing, "
            f"and {SCHWAB_TOKEN_JSON} is not set."
        )

    def token_write_func(*args: object, **kwargs: object) -> None:
        token_dict = args[0] if args and isinstance(args[0], dict) else kwargs
        if not isinstance(token_dict, dict):
            return
        if use_path and path_value:
            with open(path_value, "w", encoding="utf-8") as f:
                json.dump(token_dict, f, indent=2)
        else:
            logger.warning(
                "Token refreshed but not persisted (no %s). Re-auth may be needed after 7 days.",
                SCHWAB_TOKEN_PATH,
            )

    return client_from_access_functions(
        api_key=api_key,
        app_secret=app_secret,
        token_read_func=token_read_func,
        token_write_func=token_write_func,
    )
