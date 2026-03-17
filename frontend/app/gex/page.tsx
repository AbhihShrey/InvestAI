"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createChart,
  LineSeries,
  ColorType,
} from "lightweight-charts";
import { isAuthenticated } from "@/lib/auth";
import { fetchGexBacktest, type GexStrategyResult } from "@/lib/api";
import { MetricsGrid } from "@/components/MetricsGrid";

function dateToUnix(timeStr: string): number {
  return Math.floor(
    new Date(timeStr + "T12:00:00Z").getTime() / 1000
  ) as import("lightweight-charts").UTCTimestamp;
}

/** Subtle, muted line colors for equity curves */
const EQUITY_COLORS = ["#64748b", "#5a7a6e", "#8b7355"];

function GexEquityChart({ results }: { results: GexStrategyResult[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || results.length === 0) return;
    const width = containerRef.current.clientWidth;
    if (width === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "var(--card-bg)" },
        textColor: "var(--text-muted)",
      },
      grid: {
        vertLines: { color: "var(--card-border)" },
        horzLines: { color: "var(--card-border)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "var(--card-border)",
      },
      rightPriceScale: {
        borderColor: "var(--card-border)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      width,
      height: 360,
    });
    chartRef.current = chart;

    results.forEach((r, i) => {
      const lineData = r.equityCurve.map((p) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
      }));
      const series = chart.addSeries(LineSeries, {
        color: EQUITY_COLORS[i] ?? "var(--text-dim)",
        lineWidth: 2,
        title: r.name,
      });
      series.setData(lineData);
    });

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [results]);

  return <div ref={containerRef} className="h-[360px] w-full" />;
}

function metricsToItems(m: GexStrategyResult["metrics"]): { label: string; value: string }[] {
  return [
    { label: "Total return", value: `${m.totalReturnPct.toFixed(2)}%` },
    { label: "CAGR", value: `${m.cagrPct.toFixed(2)}%` },
    { label: "Sharpe", value: m.sharpe.toFixed(2) },
    { label: "Sortino", value: m.sortino.toFixed(2) },
    { label: "Calmar", value: m.calmar.toFixed(2) },
    { label: "Max DD", value: `${m.maxDrawdownPct.toFixed(2)}%` },
    { label: "Max DD days", value: String(m.maxDrawdownDays) },
    { label: "Ann. vol", value: `${m.annualizedVolPct.toFixed(2)}%` },
    { label: "Trades", value: String(m.numTrades) },
    { label: "Win rate", value: `${m.winRatePct.toFixed(1)}%` },
    { label: "Profit factor", value: m.profitFactor.toFixed(2) },
    { label: "Avg win", value: `${m.avgWinPct.toFixed(2)}%` },
    { label: "Avg loss", value: `${m.avgLossPct.toFixed(2)}%` },
  ];
}

export default function GexPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [results, setResults] = useState<GexStrategyResult[] | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    setError(null);
    fetchGexBacktest()
      .then((data) => {
        setResults(data.results);
        setDateRange(data.dateRange);
        setRowsLoaded(data.rowsLoaded);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load GEX data"))
      .finally(() => setLoading(false));
  }, [authChecked]);

  if (!authChecked) {
    return null;
  }

  return (
    <div
      className="flex min-h-[calc(100vh-var(--header-height))] flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto w-full max-w-[var(--content-max-width)] flex-1 px-4 py-6 md:px-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to CHARTS
        </Link>

        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          GEX (Gamma Exposure)
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Backtest results from Extreme GEX, Binary GEX, and GEX Trend. Data from backend CSV (update daily as needed).
        </p>

        {error && (
          <div
            className="theme-card mt-4 rounded px-3 py-2 text-sm"
            style={{ background: "var(--red-dim)", color: "var(--red)" }}
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            Loading…
          </p>
        )}

        {!loading && dateRange && rowsLoaded != null && (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {rowsLoaded} rows · {dateRange.from} to {dateRange.to}
          </p>
        )}

        {!loading && results && results.length > 0 && (
          <>
            <section className="theme-card mt-6">
              <div className="theme-card-header">
                <h3 style={{ color: "var(--text)" }}>Equity curves</h3>
              </div>
              <div className="theme-card-body min-h-[360px]">
                <GexEquityChart results={results} />
              </div>
            </section>

            <section className="mt-6">
              <h2
                className="mb-3 text-sm font-bold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Metrics by strategy
              </h2>
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                {results.map((r) => (
                  <div key={r.name} className="theme-card">
                    <div className="theme-card-header">
                      <h3 style={{ color: "var(--text)" }}>{r.name}</h3>
                    </div>
                    <div className="theme-card-body">
                      <MetricsGrid items={metricsToItems(r.metrics)} columns={2} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="theme-card mt-6">
              <div className="theme-card-header">
                <h3 style={{ color: "var(--text)" }}>Trades</h3>
              </div>
              <div className="theme-card-body overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr
                      className="border-b"
                      style={{ borderColor: "var(--card-border)", background: "var(--card-hover)" }}
                    >
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Date</th>
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Strategy</th>
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Action</th>
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Side</th>
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Price</th>
                      <th className="p-3 font-semibold" style={{ color: "var(--text-muted)" }}>GEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .flatMap((r) => r.trades)
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((t, i) => (
                        <tr
                          key={`${t.date}-${t.strategy}-${t.action}-${i}`}
                          className="border-b"
                          style={{ borderColor: "var(--card-border)" }}
                        >
                          <td className="p-3" style={{ color: "var(--text)" }}>{t.date}</td>
                          <td className="p-3" style={{ color: "var(--text)" }}>{t.strategy}</td>
                          <td className="p-3">
                            <span
                              style={{
                                color: t.action === "Buy" ? "var(--green)" : "var(--red)",
                                opacity: 0.9,
                              }}
                            >
                              {t.action}
                            </span>
                          </td>
                          <td className="p-3" style={{ color: "var(--text)" }}>{t.side}</td>
                          <td className="p-3 font-mono" style={{ color: "var(--text)" }}>{t.price.toFixed(2)}</td>
                          <td className="p-3 font-mono" style={{ color: "var(--text-muted)" }}>{t.gex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
