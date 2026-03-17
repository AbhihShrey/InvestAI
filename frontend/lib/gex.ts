/**
 * GEX (Gamma Exposure) CSV parsing, strategy signals, backtest, and metrics.
 * CSV columns: date, price, dix, gex
 */

export interface GexRow {
  date: string;
  price: number;
  dix: number;
  gex: number;
}

export type StrategyName = "Extreme GEX" | "Binary GEX" | "GEX Trend";

export interface GexTrade {
  date: string;
  strategy: StrategyName;
  action: "Buy" | "Sell";
  side: "Long" | "Short";
  price: number;
  gex: number;
}

export interface StrategyResult {
  name: StrategyName;
  equityCurve: { time: string; value: number }[];
  trades: GexTrade[];
  metrics: StrategyMetrics;
}

export interface StrategyMetrics {
  totalReturnPct: number;
  cagrPct: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdownPct: number;
  maxDrawdownDays: number;
  annualizedVolPct: number;
  numTrades: number;
  winRatePct: number;
  profitFactor: number;
  avgWinPct: number;
  avgLossPct: number;
}

const REQUIRED_COLUMNS = ["date", "price", "gex"];

export function parseGexCsv(csvText: string): GexRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0]!.toLowerCase().replace(/\s/g, "").split(",").map((h) => h.trim());
  const dateIdx = header.indexOf("date");
  const priceIdx = header.indexOf("price");
  const gexIdx = header.indexOf("gex");
  const dixIdx = header.indexOf("dix");
  if (dateIdx === -1 || priceIdx === -1 || gexIdx === -1) {
    throw new Error("CSV must have columns: date, price, gex (dix optional)");
  }
  const rows: GexRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",").map((p) => p.trim());
    const date = parts[dateIdx];
    const price = parseFloat(parts[priceIdx]!);
    const gex = parseFloat(parts[gexIdx]!);
    if (!date || Number.isNaN(price) || Number.isNaN(gex)) continue;
    rows.push({
      date,
      price,
      dix: dixIdx >= 0 ? parseFloat(parts[dixIdx] ?? "0") || 0 : 0,
      gex,
    });
  }
  return rows;
}

function rollingPercentile(arr: number[], window: number, p: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const sorted = [...slice].sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor((p / 100) * (sorted.length - 1)));
    out.push(sorted[idx] ?? arr[i]!);
  }
  return out;
}

function simpleMA(arr: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      out.push(arr[i]!);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += arr[j]!;
    out.push(sum / period);
  }
  return out;
}

/** Extreme GEX: long when GEX below low percentile, short when above high percentile; else 0. */
function positionsExtremeGex(
  gex: number[],
  window: number,
  lowPct: number,
  highPct: number
): number[] {
  const pLow = rollingPercentile(gex, window, lowPct);
  const pHigh = rollingPercentile(gex, window, highPct);
  const pos: number[] = [];
  for (let i = 0; i < gex.length; i++) {
    const g = gex[i]!;
    const pl = pLow[i]!;
    const ph = pHigh[i]!;
    if (g <= pl) pos.push(1);
    else if (g >= ph) pos.push(-1);
    else pos.push(0);
  }
  return pos;
}

/** Binary GEX: long when gex > 0, short when gex <= 0. */
function positionsBinaryGex(gex: number[]): number[] {
  return gex.map((g) => (g > 0 ? 1 : -1));
}

/** GEX Trend: long when short MA > long MA, short otherwise. */
function positionsGexTrend(gex: number[], shortPeriod: number, longPeriod: number): number[] {
  const shortMA = simpleMA(gex, shortPeriod);
  const longMA = simpleMA(gex, longPeriod);
  const pos: number[] = [];
  for (let i = 0; i < gex.length; i++) {
    const s = shortMA[i] ?? 0;
    const l = longMA[i] ?? 0;
    if (i < longPeriod - 1) pos.push(0);
    else pos.push(s > l ? 1 : -1);
  }
  return pos;
}

function positionChanges(pos: number[]): { idx: number; from: number; to: number }[] {
  const changes: { idx: number; from: number; to: number }[] = [];
  for (let i = 1; i < pos.length; i++) {
    const prev = pos[i - 1]!;
    const curr = pos[i]!;
    if (prev !== curr) changes.push({ idx: i, from: prev, to: curr });
  }
  return changes;
}

function buildTrades(
  rows: GexRow[],
  positions: number[],
  strategyName: StrategyName
): GexTrade[] {
  const changes = positionChanges(positions);
  const trades: GexTrade[] = [];
  for (const { idx, from, to } of changes) {
    const row = rows[idx]!;
    if (from !== 0) {
      trades.push({
        date: row.date,
        strategy: strategyName,
        action: "Sell",
        side: from === 1 ? "Long" : "Short",
        price: row.price,
        gex: row.gex,
      });
    }
    if (to !== 0) {
      trades.push({
        date: row.date,
        strategy: strategyName,
        action: "Buy",
        side: to === 1 ? "Long" : "Short",
        price: row.price,
        gex: row.gex,
      });
    }
  }
  return trades;
}

function backtest(rows: GexRow[], positions: number[]): { equity: number[]; returns: number[] } {
  const equity = [1];
  const returns: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const pos = positions[i] ?? 0;
    const p0 = rows[i]!.price;
    const p1 = rows[i + 1]!.price;
    const ret = pos * ((p1 - p0) / p0);
    returns.push(ret);
    equity.push(equity[equity.length - 1]! * (1 + ret));
  }
  return { equity, returns };
}

function computeMetrics(
  rows: GexRow[],
  equity: number[],
  returns: number[],
  trades: GexTrade[]
): StrategyMetrics {
  const n = returns.length;
  const totalReturnPct = n > 0 ? (equity[equity.length - 1]! - 1) * 100 : 0;
  const days = n;
  const years = days / 252;
  const cagrPct = years > 0 && equity[equity.length - 1]! > 0
    ? (Math.pow(equity[equity.length - 1]!, 1 / years) - 1) * 100
    : 0;

  const meanRet = n > 0 ? returns.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 0
    ? returns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / n
    : 0;
  const std = Math.sqrt(variance);
  const annualizedVolPct = std * Math.sqrt(252) * 100;

  const riskFree = 0;
  const sharpe = annualizedVolPct > 0
    ? ((meanRet * 252 - riskFree) / (std * Math.sqrt(252))) || 0
    : 0;

  const downsideReturns = returns.filter((r) => r < 0);
  const downsideStd =
    downsideReturns.length > 0
      ? Math.sqrt(
          downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length
        )
      : 0;
  const sortino =
    downsideStd > 0 ? (meanRet * 252) / (downsideStd * Math.sqrt(252)) : 0;

  let peak = 1;
  let maxDrawdownPct = 0;
  let maxDrawdownDays = 0;
  let ddStart = 0;
  for (let i = 0; i < equity.length; i++) {
    const e = equity[i]!;
    if (e > peak) {
      peak = e;
      ddStart = i;
    }
    const dd = ((peak - e) / peak) * 100;
    if (dd > maxDrawdownPct) {
      maxDrawdownPct = dd;
      maxDrawdownDays = i - ddStart;
    }
  }
  const calmar = maxDrawdownPct > 0 ? cagrPct / maxDrawdownPct : 0;

  const tradeReturns: number[] = [];
  let openPrice: number | null = null;
  let openSide: "Long" | "Short" | null = null;
  for (const t of trades) {
    if (t.action === "Buy") {
      openPrice = t.price;
      openSide = t.side;
    } else if (t.action === "Sell" && openPrice != null && openSide) {
      const ret =
        openSide === "Long"
          ? (t.price - openPrice) / openPrice
          : (openPrice - t.price) / openPrice;
      tradeReturns.push(ret * 100);
      openPrice = null;
      openSide = null;
    }
  }
  const roundTrips = tradeReturns.length;
  const wins = tradeReturns.filter((r) => r > 0).length;
  const winRatePct = roundTrips > 0 ? (wins / roundTrips) * 100 : 0;
  const grossProfit = tradeReturns.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(
    tradeReturns.filter((r) => r < 0).reduce((a, b) => a + b, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgWinPct =
    tradeReturns.filter((r) => r > 0).length > 0
      ? tradeReturns.filter((r) => r > 0).reduce((a, b) => a + b, 0) /
        tradeReturns.filter((r) => r > 0).length
      : 0;
  const avgLossPct =
    tradeReturns.filter((r) => r < 0).length > 0
      ? tradeReturns.filter((r) => r < 0).reduce((a, b) => a + b, 0) /
        tradeReturns.filter((r) => r < 0).length
      : 0;

  return {
    totalReturnPct,
    cagrPct,
    sharpe,
    sortino,
    calmar,
    maxDrawdownPct,
    maxDrawdownDays,
    annualizedVolPct,
    numTrades: roundTrips,
    winRatePct,
    profitFactor,
    avgWinPct,
    avgLossPct,
  };
}

export interface GexBacktestParams {
  extremeWindow?: number;
  extremeLowPct?: number;
  extremeHighPct?: number;
  trendShort?: number;
  trendLong?: number;
}

const DEFAULT_PARAMS: Required<GexBacktestParams> = {
  extremeWindow: 252,
  extremeLowPct: 10,
  extremeHighPct: 90,
  trendShort: 5,
  trendLong: 20,
};

export function runGexBacktest(
  rows: GexRow[],
  params: GexBacktestParams = {}
): StrategyResult[] {
  const p = { ...DEFAULT_PARAMS, ...params };
  const gex = rows.map((r) => r.gex);

  const posExtreme = positionsExtremeGex(
    gex,
    p.extremeWindow,
    p.extremeLowPct,
    p.extremeHighPct
  );
  const posBinary = positionsBinaryGex(gex);
  const posTrend = positionsGexTrend(gex, p.trendShort, p.trendLong);

  const results: StrategyResult[] = [];

  for (const { name, positions } of [
    { name: "Extreme GEX" as StrategyName, positions: posExtreme },
    { name: "Binary GEX" as StrategyName, positions: posBinary },
    { name: "GEX Trend" as StrategyName, positions: posTrend },
  ]) {
    const { equity, returns } = backtest(rows, positions);
    const trades = buildTrades(rows, positions, name);
    const metrics = computeMetrics(rows, equity, returns, trades);
    const equityCurve = rows.slice(0, equity.length).map((r, i) => ({
      time: r.date,
      value: equity[i] ?? 1,
    }));
    results.push({ name, equityCurve, trades, metrics });
  }

  return results;
}
