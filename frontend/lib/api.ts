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
