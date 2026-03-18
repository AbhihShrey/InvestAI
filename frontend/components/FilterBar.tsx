"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSymbolSearch, type SymbolSearchResult } from "@/lib/api";

export interface FilterBarProps {
  symbol?: string;
  fromDate?: string;
  toDate?: string;
  timeframe?: string;
  onSymbolChange?: (v: string) => void;
  onFromDateChange?: (v: string) => void;
  onToDateChange?: (v: string) => void;
  onTimeframeChange?: (v: string) => void;
  onSearch?: () => void;
  symbolOptions?: { id: number; ticker: string }[];
  /** When true, show searchable symbol input using Schwab search API */
  enableSearch?: boolean;
}

export function FilterBar({
  symbol: controlledSymbol,
  fromDate: controlledFrom,
  toDate: controlledTo,
  timeframe: controlledTimeframe,
  onSymbolChange,
  onFromDateChange,
  onToDateChange,
  onTimeframeChange,
  onSearch,
  symbolOptions = [],
  enableSearch = false,
}: FilterBarProps) {
  const [symbol, setSymbol] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const symbolVal = controlledSymbol ?? symbol;
  const fromVal = controlledFrom ?? fromDate;
  const toVal = controlledTo ?? toDate;
  const timeframeVal = controlledTimeframe ?? "1D";
  const setSymbolVal = onSymbolChange ?? setSymbol;
  const setFromVal = onFromDateChange ?? setFromDate;
  const setToVal = onToDateChange ?? setToDate;
  const setTimeframeVal = onTimeframeChange;

  const runSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    fetchSymbolSearch(q)
      .then(setSearchResults)
      .catch(() => setSearchResults([]));
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSymbolSelect = (ticker: string) => {
    setSymbolVal(ticker);
    setSearchQuery(ticker);
    setSearchOpen(false);
  };

  return (
    <div className="theme-filter-bar">
      {enableSearch ? (
        <div ref={searchRef} className="relative" style={{ minWidth: 160 }}>
          <input
            type="text"
            placeholder="Search symbol (e.g. AAPL)"
            value={searchQuery || symbolVal}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => searchQuery.trim() && setSearchOpen(true)}
            className="theme-input"
            style={{ minWidth: 160 }}
            aria-label="Symbol search"
          />
          {searchOpen && searchResults.length > 0 && (
            <ul
              className="absolute left-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                minWidth: 240,
              }}
            >
              {searchResults.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--card-hover)]"
                    onClick={() => handleSymbolSelect(r.symbol)}
                  >
                    <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                    {r.description && (
                      <span
                        className="ml-2"
                        style={{ color: "var(--text-muted)", fontSize: 12 }}
                      >
                        {r.description}
                      </span>
                    )}
                    {r.tracked && (
                      <span
                        className="ml-1 rounded px-1 text-[10px]"
                        style={{ background: "var(--green-dim)", color: "var(--green)" }}
                      >
                        tracked
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : symbolOptions.length > 0 ? (
        <select
          value={symbolVal}
          onChange={(e) => setSymbolVal(e.target.value)}
          className="theme-select"
          style={{ minWidth: 100 }}
          aria-label="Symbol"
        >
          <option value="">Symbol</option>
          {symbolOptions.map((s) => (
            <option key={s.id} value={s.ticker}>
              {s.ticker}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          placeholder="e.g. SPY"
          value={symbolVal}
          onChange={(e) => setSymbolVal(e.target.value)}
          className="theme-input"
          style={{ minWidth: 100 }}
          aria-label="Symbol"
        />
      )}
      <input
        type="date"
        value={fromVal}
        onChange={(e) => setFromVal(e.target.value)}
        className="theme-input"
        aria-label="From date"
      />
      <input
        type="date"
        value={toVal}
        onChange={(e) => setToVal(e.target.value)}
        className="theme-input"
        aria-label="To date"
      />
      <select
        value={timeframeVal}
        onChange={(e) => setTimeframeVal?.(e.target.value)}
        className="theme-select"
        style={{ minWidth: 70 }}
        aria-label="Timeframe"
      >
        <option value="1D">1D</option>
        <option value="5m">5m</option>
        <option value="1m">1m</option>
      </select>
      <button
        type="button"
        onClick={() => onSearch?.()}
        className="theme-btn-primary"
      >
        Search
      </button>
    </div>
  );
}
