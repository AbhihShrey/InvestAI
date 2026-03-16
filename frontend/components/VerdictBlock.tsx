"use client";

export type VerdictKind = "BUY" | "SELL" | "HOLD";

interface VerdictBlockProps {
  verdict: VerdictKind;
  confidence?: string;
  showRiskStrip?: boolean;
}

export function VerdictBlock({
  verdict,
  confidence = "Moderate Confidence",
  showRiskStrip = true,
}: VerdictBlockProps) {
  const verdictStyle =
    verdict === "BUY"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
      : verdict === "SELL"
        ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
        : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded px-3 py-1 text-lg font-bold ${verdictStyle}`}
        >
          {verdict}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {confidence}
        </span>
      </div>
      {showRiskStrip && (
        <div
          className="mt-3 h-2 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #22c55e 0%, #eab308 33%, #f97316 66%, #ef4444 100%)",
          }}
          title="Risk strip"
        />
      )}
    </div>
  );
}
