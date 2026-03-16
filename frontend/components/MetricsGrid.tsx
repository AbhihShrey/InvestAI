"use client";

export interface MetricItem {
  label: string;
  value: string;
}

interface MetricsGridProps {
  items: MetricItem[];
  columns?: number;
}

export function MetricsGrid({
  items,
  columns = 6,
}: MetricsGridProps) {
  return (
    <div
      className="grid gap-px rounded-lg border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white p-3 dark:bg-zinc-900"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
