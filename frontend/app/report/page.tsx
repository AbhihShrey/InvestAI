"use client";

import Link from "next/link";
import { ChartContainer } from "@/components/ChartContainer";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { MetricsGrid } from "@/components/MetricsGrid";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { VerdictBlock } from "@/components/VerdictBlock";

const METRICS = [
  { label: "PRICE", value: "$452.30" },
  { label: "RSI(14)", value: "58" },
  { label: "TA SIGNAL", value: "Neutral" },
  { label: "S/R POSITION", value: "Above" },
  { label: "ATR", value: "12.4" },
  { label: "VOLUME", value: "42.1M" },
];

const SCORES = [
  { name: "Technical Analysis (Sell):", value: -1.5 },
  { name: "Momentum:", value: 0.3 },
  { name: "Volume:", value: 0.2 },
  { name: "Support/Resistance:", value: -0.5 },
];

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to CHARTS
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          NVDA – NVIDIA Corporation
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Stock analysis report
        </p>

        <div className="mt-6">
          <VerdictBlock
            verdict="SELL"
            confidence="Moderate Confidence"
            showRiskStrip
          />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Key metrics
          </h2>
          <MetricsGrid items={METRICS} columns={6} />
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Score breakdown
          </h2>
          <ScoreBreakdown items={SCORES} />
        </div>

        <div className="mt-8 space-y-4">
          <CollapsibleSection
            number={1}
            title="Executive Summary"
            defaultOpen
          >
            <p>
              Price is above key moving averages but RSI suggests limited upside.
              Technical analysis score is slightly negative. Risk strip indicates
              moderate risk zone.
            </p>
          </CollapsibleSection>

          <CollapsibleSection number={2} title="Long-Term Price Action" defaultOpen={false}>
            <p>
              Long-term trend remains bullish with higher highs and higher lows.
              Key support at $420.
            </p>
          </CollapsibleSection>

          <CollapsibleSection number={3} title="Medium-Term" defaultOpen={false}>
            <p>
              Consolidation in a range; breakout above $460 would confirm next
              leg up.
            </p>
          </CollapsibleSection>

          <CollapsibleSection
            number={4}
            title="Short-Term / Intraday"
            defaultOpen={false}
          >
            <p>
              Intraday volatility elevated; watch for volume confirmation on
              moves.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded bg-zinc-900 p-2">
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  DAILY
                </div>
                <ChartContainer />
              </div>
              <div className="rounded bg-zinc-900 p-2">
                <div className="mb-2 text-xs font-medium text-zinc-400">
                  4-HOUR
                </div>
                <ChartContainer />
              </div>
            </div>
            <p className="mt-3 text-sm">
              Support and resistance levels marked on charts. Price currently
              testing resistance at $455.
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
