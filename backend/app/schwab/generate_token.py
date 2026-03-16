"""
Generate a Schwab OAuth token via browser login.
Run once to create the token file; then use get_client() without re-auth.

  python -m app.schwab.generate_token
  # or from repo root: python scripts/generate_schwab_token.py
"""
import os
import sys

from schwab.auth import client_from_login_flow

from app.schwab.env import (
    SCHWAB_API_KEY,
    SCHWAB_APP_SECRET,
    SCHWAB_TOKEN_PATH,
    get_config_dir,
    get_repo_root,
    load_schwab_env,
)

CALLBACK_URL = "https://127.0.0.1:8182"


def main() -> None:
    load_schwab_env()
    api_key = (os.environ.get(SCHWAB_API_KEY) or "").strip()
    app_secret = (os.environ.get(SCHWAB_APP_SECRET) or "").strip()
    token_path = (os.environ.get(SCHWAB_TOKEN_PATH) or "").strip()

    if not api_key or not app_secret:
        print(
            f"Set {SCHWAB_API_KEY} and {SCHWAB_APP_SECRET} in config/.env (see config/.env.example).",
            file=sys.stderr,
        )
        sys.exit(1)
    if not token_path:
        token_path = os.path.join(get_config_dir(), ".schwab_token.json")
        print(f"No {SCHWAB_TOKEN_PATH} in .env; using {token_path}", file=sys.stderr)
    elif not os.path.isabs(token_path):
        token_path = os.path.normpath(os.path.join(get_repo_root(), token_path))

    print(f"Token will be written to: {token_path}")
    print("A browser window will open for Schwab login...")

    client_from_login_flow(
        api_key=api_key,
        app_secret=app_secret,
        callback_url=CALLBACK_URL,
        token_path=token_path,
    )
    print("Token saved. Run: pytest tests/schwab/ or devbox run fetch:prices")


if __name__ == "__main__":
    main()
