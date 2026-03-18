"use client";

import { useEffect, useState } from "react";
import { fetchQuotes, type QuoteResponse } from "@/lib/api";

export function LiveQuote({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol?.trim()) {
      setQuote(null);
      return;
    }
    const load = () => {
      setLoading(true);
      fetchQuotes([symbol.trim()])
        .then((data) => setQuote(data[0] ?? null))
        .catch(() => setQuote(null))
        .finally(() => setLoading(false));
    };
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [symbol]);

  if (!symbol?.trim() || !quote) {
    return null;
  }

  const pct = quote.changePct ?? 0;
  const changeColor = pct >= 0 ? "var(--green)" : "var(--red)";
  const changeBg = pct >= 0 ? "var(--green-dim)" : "var(--red-dim)";
  const sign = pct >= 0 ? "+" : "";

  return (
    <div
      className="flex items-center gap-3 rounded px-2 py-1 text-sm"
      style={{ background: "var(--card-hover)" }}
    >
      <span style={{ fontWeight: 700, color: "var(--text)" }}>{quote.symbol}</span>
      <span className="font-mono" style={{ color: "var(--text)" }}>
        ${quote.last.toFixed(2)}
      </span>
      {(quote.changePct != null || quote.change != null) && (
        <span
          className="inline-flex rounded px-2 py-0.5 text-xs"
          style={{ background: changeBg, color: changeColor }}
        >
          {quote.changePct != null
            ? `${sign}${quote.changePct.toFixed(2)}%`
            : quote.change != null
              ? `${sign}${quote.change.toFixed(2)}`
              : null}
        </span>
      )}
      {loading && (
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>…</span>
      )}
    </div>
  );
}
