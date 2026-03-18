"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchOptionChain,
  type OptionChainResponse,
  type OptionContract,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

function ContractTable({
  title,
  contracts,
}: {
  title: string;
  contracts: OptionContract[];
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
              <th className="p-2">Strike</th>
              <th className="p-2">Exp</th>
              <th className="p-2">Bid</th>
              <th className="p-2">Ask</th>
              <th className="p-2">Last</th>
              <th className="p-2">IV</th>
              <th className="p-2">Delta</th>
              <th className="p-2">Vol</th>
            </tr>
          </thead>
          <tbody>
            {contracts.slice(0, 50).map((c, idx) => (
              <tr
                key={`${c.strike}-${c.expirationDate}-${c.putCall}-${idx}`}
                className="border-b"
                style={{ borderColor: "var(--card-border)" }}
              >
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {c.strike.toFixed(2)}
                </td>
                <td className="p-2" style={{ color: "var(--text-muted)" }}>
                  {c.expirationDate}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {c.bid?.toFixed(2) ?? "—"}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {c.ask?.toFixed(2) ?? "—"}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text)" }}>
                  {c.last?.toFixed(2) ?? "—"}
                </td>
                <td className="p-2" style={{ color: "var(--text-muted)" }}>
                  {c.volatility != null ? `${(c.volatility * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="p-2" style={{ color: "var(--text-muted)" }}>
                  {c.delta?.toFixed(3) ?? "—"}
                </td>
                <td className="p-2 font-mono" style={{ color: "var(--text-muted)" }}>
                  {c.volume ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OptionsPage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("SPY");
  const [querySymbol, setQuerySymbol] = useState("SPY");
  const [data, setData] = useState<OptionChainResponse | null>(null);
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
    if (!authChecked || !querySymbol.trim()) return;
    setLoading(true);
    setError(null);
    fetchOptionChain(querySymbol.trim().toUpperCase())
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Failed to load options chain"
        )
      )
      .finally(() => setLoading(false));
  }, [authChecked, querySymbol]);

  if (!authChecked) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed) setQuerySymbol(trimmed);
  };

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
          Options Chain
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          View options chain from Schwab for any symbol.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. SPY)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="theme-input"
            style={{ minWidth: 120 }}
          />
          <button type="submit" className="theme-btn-primary">
            Load
          </button>
        </form>

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
            {data.underlying && (
              <div className="theme-card mt-6">
                <div className="theme-card-header">
                  <h3 style={{ color: "var(--text)" }}>
                    Underlying: {data.underlying.symbol}
                  </h3>
                </div>
                <div className="theme-card-body">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Last: </span>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>
                        ${data.underlying.last?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Bid: </span>
                      <span style={{ color: "var(--text)" }}>
                        ${data.underlying.bid?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Ask: </span>
                      <span style={{ color: "var(--text)" }}>
                        ${data.underlying.ask?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ContractTable title="Calls" contracts={data.calls} />
              <ContractTable title="Puts" contracts={data.puts} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
