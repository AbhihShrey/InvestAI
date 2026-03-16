"use client";

export interface ScoreItem {
  name: string;
  value: number;
}

interface ScoreBreakdownProps {
  items: ScoreItem[];
}

export function ScoreBreakdown({ items }: ScoreBreakdownProps) {
  return (
    <ul className="space-y-2">
      {items.map(({ name, value }) => (
        <li
          key={name}
          className="flex justify-between border-b border-zinc-100 py-2 last:border-b-0 dark:border-zinc-800"
        >
          <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
          <span
            className={`font-mono font-medium ${
              value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {value >= 0 ? "+" : ""}
            {value}
          </span>
        </li>
      ))}
    </ul>
  );
}
