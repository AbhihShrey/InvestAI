"use client";

import { useState } from "react";

export interface FilterBarProps {
  symbol?: string;
  fromDate?: string;
  toDate?: string;
  onSymbolChange?: (v: string) => void;
  onFromDateChange?: (v: string) => void;
  onToDateChange?: (v: string) => void;
  onSearch?: () => void;
  symbolOptions?: { id: number; ticker: string }[];
}

export function FilterBar({
  symbol: controlledSymbol,
  fromDate: controlledFrom,
  toDate: controlledTo,
  onSymbolChange,
  onFromDateChange,
  onToDateChange,
  onSearch,
  symbolOptions = [],
}: FilterBarProps) {
  const [symbol, setSymbol] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const symbolVal = controlledSymbol ?? symbol;
  const fromVal = controlledFrom ?? fromDate;
  const toVal = controlledTo ?? toDate;
  const setSymbolVal = onSymbolChange ?? setSymbol;
  const setFromVal = onFromDateChange ?? setFromDate;
  const setToVal = onToDateChange ?? setToDate;

  return (
    <div className="theme-filter-bar">
      {symbolOptions.length > 0 ? (
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
