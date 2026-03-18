const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SymbolResponse {
  id: number;
  ticker: string;
  name: string | null;
}

export interface PriceCandleResponse {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface TimeValuePoint {
  time: string;
  value: number;
}

export interface PpoIndicatorSeries {
  line: TimeValuePoint[];
  signal: TimeValuePoint[];
  hist: TimeValuePoint[];
}

export interface IndicatorSeriesResponse {
  volume: TimeValuePoint[];
  rsi: TimeValuePoint[];
  ppo: PpoIndicatorSeries;
}

export interface SymbolPricesResponse {
  candles: PriceCandleResponse[];
  indicators: IndicatorSeriesResponse | null;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string })?.detail ?? "Invalid username or password");
  }
  return res.json();
}

export interface RegisterResponse {
  message: string;
}

export async function register(username: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string })?.detail ?? "Registration failed");
  }
  return res.json();
}

export async function fetchSymbols(): Promise<SymbolResponse[]> {
  const res = await fetch(`${API_BASE}/api/v1/symbols/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function createSymbol(ticker: string, name?: string): Promise<SymbolResponse> {
  const res = await fetch(`${API_BASE}/api/v1/symbols/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ticker: ticker.toUpperCase(), name: name ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { detail?: string })?.detail ?? "Failed to create symbol");
  }
  return res.json();
}

export async function fetchPrices(
  symbolId: number,
  fromDate: string,
  toDate: string,
  timeframe = "1D",
  includeIndicators = true
): Promise<SymbolPricesResponse> {
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
    timeframe,
    include_indicators: String(includeIndicators),
  });
  const res = await fetch(
    `${API_BASE}/api/v1/symbols/${symbolId}/prices?${params}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export interface OptionContract {
  symbol: string | null;
  description: string | null;
  putCall: string;
  strike: number;
  expirationDate: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  volatility: number | null;
  volume: number | null;
}

export interface OptionChainUnderlying {
  symbol: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
}

export interface OptionChainResponse {
  underlying: OptionChainUnderlying | null;
  calls: OptionContract[];
  puts: OptionContract[];
}

export async function fetchOptionChain(
  symbol: string,
  contractType = "ALL",
  strikeRange = "NTM",
  strikeCount = 10
): Promise<OptionChainResponse> {
  const params = new URLSearchParams({
    symbol,
    contract_type: contractType,
    strike_range: strikeRange,
    strike_count: String(strikeCount),
  });
  const res = await fetch(`${API_BASE}/api/v1/options/chain?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export interface GexTrade {
  date: string;
  strategy: string;
  action: string;
  side: string;
  price: number;
  gex: number;
}

export interface GexMetrics {
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

export interface GexStrategyResult {
  name: string;
  equityCurve: { time: string; value: number }[];
  trades: GexTrade[];
  metrics: GexMetrics;
}

export interface GexBacktestResponse {
  rowsLoaded: number;
  dateRange: { from: string; to: string };
  results: GexStrategyResult[];
}

export async function fetchGexBacktest(): Promise<GexBacktestResponse> {
  const res = await fetch(`${API_BASE}/api/v1/gex/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export interface MarketsIndexStat {
  label: string;
  symbol: string;
  price: number;
  changePct: number;
  changeAbs: number;
}

export interface MarketsTableRow {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number | null;
  extra: number | null;
}

export interface MarketsSectorPerformanceItem {
  sector: string;
  changePct: number;
}

export interface MarketsHeatmapItem {
  symbol: string;
  displayName: string;
  changePct: number;
  price: number;
}

export interface MarketsBreadthStats {
  advancers: number;
  decliners: number;
  unchanged: number;
  advVolume: number;
  decVolume: number;
  breadthPct: number;
}

export interface MarketsSummaryResponse {
  indices: MarketsIndexStat[];
  breadth: MarketsBreadthStats;
  topGainers: MarketsTableRow[];
  topLosers: MarketsTableRow[];
  volumeSurge: MarketsTableRow[];
  sectors: MarketsSectorPerformanceItem[];
  heatmap: MarketsHeatmapItem[];
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
  tracked: boolean;
  id?: number;
}

export async function fetchSymbolSearch(
  q: string,
  projection = "symbol-search"
): Promise<SymbolSearchResult[]> {
  const params = new URLSearchParams({ q, projection });
  const res = await fetch(`${API_BASE}/api/v1/symbols/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchMarketsSummary(): Promise<MarketsSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/markets/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export interface MarketHoursResponse {
  date: string;
  equityMarketOpen: boolean;
  optionMarketOpen: boolean;
  equitySessionStart: string | null;
  equitySessionEnd: string | null;
  optionSessionStart: string | null;
  optionSessionEnd: string | null;
}

export async function fetchMarketHours(forDate?: string): Promise<MarketHoursResponse> {
  const params = forDate ? `?for_date=${encodeURIComponent(forDate)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/markets/hours${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}

export interface QuoteResponse {
  symbol: string;
  last: number;
  change: number | null;
  changePct: number | null;
  volume: number;
}

export async function fetchQuotes(symbols: string[]): Promise<QuoteResponse[]> {
  const symStr = symbols.filter((s) => s?.trim()).join(",");
  if (!symStr) return [];
  const res = await fetch(`${API_BASE}/api/v1/quotes/?symbols=${encodeURIComponent(symStr)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `API error: ${res.status}`);
  }
  return res.json();
}
