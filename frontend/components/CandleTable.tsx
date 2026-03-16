"use client";

import { useMemo } from "react";

export interface CandleRow {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const COLS: { key: keyof CandleRow; label: string }[] = [
  { key: "time", label: "Date" },
  { key: "open", label: "Open" },
  { key: "high", label: "High" },
  { key: "low", label: "Low" },
  { key: "close", label: "Close" },
  { key: "volume", label: "Volume" },
];

export function CandleTable({ rows }: { rows: CandleRow[] }) {
  const maxVol = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.volume)) : 0),
    [rows]
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
        Select a symbol and date range, then click Search to load chart data from the database.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {COLS.map(({ key, label }) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-600"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isUp = row.close >= row.open;
              const volPct = maxVol ? (row.volume / maxVol) * 100 : 0;
              return (
                <tr
                  key={`${row.time}-${i}`}
                  className="border-b border-gray-100 hover:bg-gray-50/60"
                >
                  <td className="px-4 py-2 text-gray-700">{row.time}</td>
                  <td className="px-4 py-2 text-gray-700">{row.open.toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-700">{row.high.toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-700">{row.low.toFixed(2)}</td>
                  <td
                    className={`px-4 py-2 font-medium ${
                      isUp ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {row.close.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 min-w-[40px] rounded bg-gray-100"
                        title={`${row.volume.toLocaleString()}`}
                      >
                        <div
                          className="h-full rounded bg-amber-500/80"
                          style={{ width: `${Math.max(4, volPct)}%` }}
                        />
                      </div>
                      <span className="text-gray-600">
                        {row.volume.toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
