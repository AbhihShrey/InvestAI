"""GEX (Gamma Exposure) API: returns backtest results from static CSV."""

from fastapi import APIRouter, HTTPException

from app.gex.backtest import load_gex_csv, run_backtest

router = APIRouter()


@router.get("/")
async def get_gex_backtest() -> dict:
    """
    Load GEX CSV from backend/data/gex.csv, run all three strategies,
    and return equity curves, metrics, and trades. CSV is updated separately (e.g. daily).
    """
    try:
        rows = load_gex_csv()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    if len(rows) < 2:
        raise HTTPException(
            status_code=422,
            detail="GEX CSV must have at least 2 data rows (date, price, gex).",
        )
    results = run_backtest(rows)
    return {
        "rowsLoaded": len(rows),
        "dateRange": {"from": rows[0]["date"], "to": rows[-1]["date"]},
        "results": results,
    }
