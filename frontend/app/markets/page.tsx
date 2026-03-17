"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchMarketsSummary,
  type MarketsBreadthStats,
  type MarketsHeatmapItem,
  type MarketsIndexStat,
  type MarketsSectorPerformanceItem,
  type MarketsSummaryResponse,
  type MarketsTableRow,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

function StatCard({ index }: { index: MarketsIndexStat }) {
  const sign = index.changePct >= 0 ? "+" : "";
  const color =
    index.changePct > 0
      ? "var(--green)"
      : index.changePct < 0
        ? "var(--red)"
        : "var(--text-muted)";
  const bg =
    index.changePct > 0
      ? "var(--green-dim)"
      : index.changePct < 0
        ? "var(--red-dim)"
        : "var(--card-hover)";
  return (
    <div className="theme-card">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {index.label}
        </h3>
      </div>
      <div className="theme-card-body">
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
          ${index.price.toFixed(2)}
        </div>
        <div
          className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs"
          style={{ background: bg, color }}
        >
          {sign}
          {index.changePct.toFixed(2)}% ({sign}
          {index.changeAbs.toFixed(2)})
        </div>
      </div>
    </div>
  );
}

function BreadthCard({ breadth }: { breadth: MarketsBreadthStats }) {
  const ratio =
    breadth.decVolume > 0
      ? (breadth.advVolume / breadth.decVolume).toFixed(2)
      : "—";
  return (
    <div className="theme-card span-2">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text-muted)", fontSize: 11 }}>
          Market Breadth
        </h3>
      </div>
      <div className="theme-card-body">
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <div>
            <div>Advancers</div>
            <div style={{ color: "var(--green)", fontWeight: 600 }}>
              {breadth.advancers}
            </div>
          </div>
          <div>
            <div>Decliners</div>
            <div style={{ color: "var(--red)", fontWeight: 600 }}>
              {breadth.decliners}
            </div>
          </div>
          <div>
            <div>Breadth</div>
            <div style={{ fontWeight: 600 }}>
              {breadth.breadthPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div>Up/Down Vol</div>
            <div style={{ fontWeight: 600 }}>{ratio}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Table({
  title,
  rows,
}: {
  title: string;
  rows: MarketsTableRow[];
}) {
  return (
    <div className="theme-card">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text)" }}>{title}</h3>
      </div>
      <div className="theme-card-body overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr
              className="border-b"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--card-hover)",
              }}
            >
              <th className="p-2">#</th>
              <th className="p-2">Symbol</th>
              <th className="p-2">Price</th>
              <th className="p-2">Change</th>
              <th className="p-2">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.symbol + idx}
                className="border-b"
                style={{ borderColor: "var(--card-border)" }}
              >
                <td className="p-2" style={{ color: "var(--text-muted)" }}>
                  {idx + 1}
                </td>
                <td className="p-2" style={{ color: "var(--text)" }}>
                  {r.symbol}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {r.price.toFixed(2)}
                </td>
                <td className="p-2">
                  <span
                    className="inline-flex rounded-full px-2 py-0.5"
                    style={{
                      fontWeight: 600,
                      fontSize: 11,
                      background:
                        r.changePct >= 0
                          ? "var(--green-dim)"
                          : "var(--red-dim)",
                      color:
                        r.changePct >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {r.changePct >= 0 ? "+" : ""}
                    {r.changePct.toFixed(2)}%
                  </span>
                </td>
                <td
                  className="p-2 font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {Math.round(r.volume / 1_000_000).toLocaleString()}M
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VolumeSurgeTable({ rows }: { rows: MarketsTableRow[] }) {
  return (
    <div className="theme-card">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text)" }}>Volume Surge</h3>
      </div>
      <div className="theme-card-body overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr
              className="border-b"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--card-hover)",
              }}
            >
              <th className="p-2">Symbol</th>
              <th className="p-2">Price</th>
              <th className="p-2">Change</th>
              <th className="p-2">Volume</th>
              <th className="p-2">Avg Vol</th>
              <th className="p-2">Surge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.symbol}
                className="border-b"
                style={{ borderColor: "var(--card-border)" }}
              >
                <td className="p-2" style={{ color: "var(--text)" }}>
                  {r.symbol}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {r.price.toFixed(2)}
                </td>
                <td className="p-2">
                  <span
                    className="inline-flex rounded-full px-2 py-0.5"
                    style={{
                      fontWeight: 600,
                      fontSize: 11,
                      background:
                        r.changePct >= 0
                          ? "var(--green-dim)"
                          : "var(--red-dim)",
                      color:
                        r.changePct >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {r.changePct >= 0 ? "+" : ""}
                    {r.changePct.toFixed(2)}%
                  </span>
                </td>
                <td
                  className="p-2 font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {Math.round(r.volume / 1_000_000).toLocaleString()}M
                </td>
                <td
                  className="p-2 font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {r.avgVolume
                    ? `${Math.round(r.avgVolume / 1_000_000).toLocaleString()}M`
                    : "—"}
                </td>
                <td className="p-2" style={{ color: "var(--text)" }}>
                  {r.extra ? `${r.extra.toFixed(1)}x` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectorBars({ sectors }: { sectors: MarketsSectorPerformanceItem[] }) {
  const maxAbs = Math.max(
    1,
    ...sectors.map((s) => Math.abs(s.changePct)),
  );
  return (
    <div className="theme-card">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text)" }}>Sector Performance</h3>
      </div>
      <div className="theme-card-body">
        <div className="space-y-1">
          {sectors.map((s) => {
            const width = Math.min(100, (Math.abs(s.changePct) / maxAbs) * 100);
            const bg =
              s.changePct >= 0 ? "var(--green-dim)" : "var(--red-dim)";
            const color =
              s.changePct >= 0 ? "var(--green)" : "var(--red)";
            return (
              <div
                key={s.sector}
                className="flex items-center justify-between gap-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span>{s.sector}</span>
                <div className="flex flex-1 items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${width}%`, background: bg }}
                  />
                  <span style={{ color }}>{s.changePct.toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ items }: { items: MarketsHeatmapItem[] }) {
  const maxAbs = Math.max(1, ...items.map((i) => Math.abs(i.changePct)));
  const cellStyle = (pct: number) => {
    const norm = Math.min(1, Math.abs(pct) / maxAbs);
    const alpha = 0.1 + norm * 0.35;
    const base =
      pct >= 0 ? "rgba(16,185,129," : "rgba(239,68,68,";
    return {
      background: `${base}${alpha})`,
      borderRadius: 8,
      padding: "10px 8px",
    };
  };
  return (
    <div className="theme-card">
      <div className="theme-card-header">
        <h3 style={{ color: "var(--text)" }}>Market Heatmap</h3>
      </div>
      <div className="theme-card-body">
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {items.map((i) => (
            <div key={i.symbol} style={cellStyle(i.changePct)}>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--text)" }}
              >
                {i.symbol}
              </div>
              <div
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {i.changePct >= 0 ? "+" : ""}
                {i.changePct.toFixed(2)}%
              </div>
              <div
                className="text-[11px] font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                ${i.price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<MarketsSummaryResponse | null>(null);
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
    fetchMarketsSummary()
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Failed to load markets overview",
        ),
      )
      .finally(() => setLoading(false));
  }, [authChecked]);

  if (!authChecked) {
    return null;
  }

  const indices = data?.indices ?? [];

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
          Markets
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          High-level market snapshot: indices, breadth, gainers/losers, sectors,
          and a simple heatmap.
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

        {data && !loading && (
          <>
            {/* Top stat cards row */}
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {indices.slice(0, 2).map((idx) => (
                <StatCard key={idx.symbol} index={idx} />
              ))}
              <BreadthCard breadth={data.breadth} />
            </div>

            {/* Top gainers / losers */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Table title="Top Gainers" rows={data.topGainers.slice(0, 20)} />
              <Table title="Top Losers" rows={data.topLosers.slice(0, 20)} />
            </div>

            {/* Volume surge + sectors */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <VolumeSurgeTable rows={data.volumeSurge.slice(0, 20)} />
              <SectorBars sectors={data.sectors} />
            </div>

            {/* Heatmap */}
            <div className="mt-6">
              <Heatmap items={data.heatmap} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

