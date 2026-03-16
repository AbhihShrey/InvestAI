"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartContainer } from "@/components/ChartContainer";
import { FilterBar } from "@/components/FilterBar";
import type { OHLCV } from "@/components/TradingViewChart";
import { isAuthenticated } from "@/lib/auth";
import { fetchPrices, fetchSymbols } from "@/lib/api";
import type {
  IndicatorSeriesResponse,
  PriceCandleResponse,
  SymbolResponse,
} from "@/lib/api";

function dateToUnixTime(dateStr: string): string {
  return Math.floor(new Date(dateStr + "T12:00:00Z").getTime() / 1000).toString();
}

function apiCandlesToOhlcv(candles: PriceCandleResponse[]): OHLCV[] {
  return candles.map((c) => ({
    time: dateToUnixTime(c.time),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? 0,
  }));
}

export default function Home() {
  const router = useRouter();
  const [symbols, setSymbols] = useState<SymbolResponse[]>([]);
  const [symbol, setSymbol] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [candles, setCandles] = useState<PriceCandleResponse[]>([]);
  const [indicators, setIndicators] = useState<IndicatorSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetchSymbols()
      .then(setSymbols)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load symbols"));
  }, [authChecked]);

  const search = useCallback(() => {
    const sym = symbols.find((s) => s.ticker.toUpperCase() === symbol.toUpperCase());
    if (!sym) {
      setError(
        symbols.length === 0
          ? "No symbols in database. Run bulk fetch (e.g. devbox run fetch:prices) to populate."
          : "Select a symbol from the list."
      );
      return;
    }
    if (!fromDate || !toDate) {
      setError("Set From and To dates.");
      return;
    }
    if (fromDate > toDate) {
      setError("From date must be before To date.");
      return;
    }
    setError(null);
    setLoading(true);
    fetchPrices(sym.id, fromDate, toDate, "1D", true)
      .then((data) => {
        setCandles(data.candles);
        setIndicators(data.indicators);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load prices"))
      .finally(() => setLoading(false));
  }, [symbols, symbol, fromDate, toDate]);

  const chartData = useMemo(() => apiCandlesToOhlcv(candles), [candles]);

  if (!authChecked) {
    return null;
  }

  return (
    <div
      className="flex min-h-[calc(100vh-var(--header-height))] flex-col"
      style={{ background: "var(--bg)" }}
    >
      <FilterBar
        symbol={symbol}
        fromDate={fromDate}
        toDate={toDate}
        onSymbolChange={setSymbol}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearch={search}
        symbolOptions={symbols.map((s) => ({ id: s.id, ticker: s.ticker }))}
      />
      {error && (
        <div
          className="px-4 py-2 text-sm"
          style={{ background: "var(--yellow-dim)", color: "var(--yellow)" }}
        >
          {error}
        </div>
      )}
      {loading && (
        <div className="px-4 py-2 text-sm text-muted">Loading…</div>
      )}
      <div className="min-h-0 flex-1 p-4">
        <section className="theme-card flex h-full min-h-[320px] flex-col">
          <div className="theme-card-body min-h-0 flex-1">
            <ChartContainer
              data={chartData.length > 0 ? chartData : undefined}
              indicators={indicators}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
