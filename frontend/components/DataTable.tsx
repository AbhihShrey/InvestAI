"use client";

import { useState, useMemo } from "react";

export type OrderType = "Calls Bought" | "Puts Bought" | "Puts Sold";

export interface OptionsFlowRow {
  id: string;
  tradeDate: string;
  orderType: OrderType;
  strike: number;
  expiry: string;
  premium: number;
  contracts: number;
}

const COLS: { key: keyof OptionsFlowRow; label: string }[] = [
  { key: "tradeDate", label: "Trade Date" },
  { key: "orderType", label: "Order Type" },
  { key: "strike", label: "Strike" },
  { key: "expiry", label: "Expiry" },
  { key: "premium", label: "Premium" },
  { key: "contracts", label: "Contracts" },
];

const MOCK_ROWS: OptionsFlowRow[] = [
  {
    id: "1",
    tradeDate: "2025-03-14",
    orderType: "Calls Bought",
    strike: 450,
    expiry: "2025-04-18",
    premium: 12.5,
    contracts: 10,
  },
  {
    id: "2",
    tradeDate: "2025-03-14",
    orderType: "Puts Bought",
    strike: 440,
    expiry: "2025-04-18",
    premium: 8.2,
    contracts: 5,
  },
  {
    id: "3",
    tradeDate: "2025-03-13",
    orderType: "Puts Sold",
    strike: 430,
    expiry: "2025-03-21",
    premium: 5.1,
    contracts: 20,
  },
];

function OrderTypeBadge({ orderType }: { orderType: OrderType }) {
  const style =
    orderType === "Calls Bought"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : orderType === "Puts Bought"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${style}`}>
      {orderType}
    </span>
  );
}

const PAGE_SIZE = 5;

export function DataTable({ rows = MOCK_ROWS }: { rows?: OptionsFlowRow[] }) {
  const [sortKey, setSortKey] = useState<keyof OptionsFlowRow>("tradeDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: keyof OptionsFlowRow) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              {COLS.map(({ key, label }) => (
                <th
                  key={key}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2">{row.tradeDate}</td>
                <td className="px-3 py-2">
                  <OrderTypeBadge orderType={row.orderType} />
                </td>
                <td className="px-3 py-2">{row.strike}</td>
                <td className="px-3 py-2">{row.expiry}</td>
                <td className="px-3 py-2">{row.premium.toFixed(2)}</td>
                <td className="px-3 py-2">{row.contracts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
