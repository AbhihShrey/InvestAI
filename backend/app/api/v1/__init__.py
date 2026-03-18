# API v1 routes

from fastapi import APIRouter

from app.api.v1 import auth, gex, markets, options, quotes, symbols

router = APIRouter()
router.include_router(symbols.router, prefix="/symbols", tags=["symbols"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(gex.router, prefix="/gex", tags=["gex"])
router.include_router(markets.router, prefix="/markets", tags=["markets"])
router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
router.include_router(options.router, prefix="/options", tags=["options"])
