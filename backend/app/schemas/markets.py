"""Schemas for markets overview API."""

from __future__ import annotations

from pydantic import BaseModel


class IndexStat(BaseModel):
    label: str
    symbol: str
    price: float
    changePct: float
    changeAbs: float


class TableRow(BaseModel):
    symbol: str
    price: float
    changePct: float
    volume: float
    avgVolume: float | None = None
    extra: float | None = None  # e.g. surge multiple


class SectorPerformanceItem(BaseModel):
    sector: str
    changePct: float


class HeatmapItem(BaseModel):
    symbol: str
    displayName: str
    changePct: float
    price: float


class BreadthStats(BaseModel):
    advancers: int
    decliners: int
    unchanged: int
    advVolume: float
    decVolume: float
    breadthPct: float


class MarketsSummaryResponse(BaseModel):
    indices: list[IndexStat]
    breadth: BreadthStats
    topGainers: list[TableRow]
    topLosers: list[TableRow]
    volumeSurge: list[TableRow]
    sectors: list[SectorPerformanceItem]
    heatmap: list[HeatmapItem]


class MarketHoursResponse(BaseModel):
    date: str
    equityMarketOpen: bool
    optionMarketOpen: bool
    equitySessionStart: str | None
    equitySessionEnd: str | None
    optionSessionStart: str | None
    optionSessionEnd: str | None

