"use client";

import { useState } from "react";
import type { IndicatorSeriesResponse } from "@/lib/api";
import {
  TradingViewChartWithIndicators,
  type IndicatorOptions,
  type OHLCV,
} from "./TradingViewChart";

const DEFAULT_INDICATOR_OPTIONS: IndicatorOptions = {
  volume: true,
  rsi: true,
  ppo: true,
};

interface ChartContainerProps {
  data?: OHLCV[] | null;
  indicators?: IndicatorSeriesResponse | null;
  indicatorOptions?: IndicatorOptions;
  onIndicatorOptionsChange?: (options: IndicatorOptions) => void;
}

export function ChartContainer({
  data,
  indicators,
  indicatorOptions: controlledOptions,
  onIndicatorOptionsChange,
}: ChartContainerProps) {
  const [localOptions, setLocalOptions] = useState(DEFAULT_INDICATOR_OPTIONS);
  const isControlled = onIndicatorOptionsChange != null;
  const indicatorOptions = isControlled
    ? (controlledOptions ?? DEFAULT_INDICATOR_OPTIONS)
    : localOptions;

  const setOption = (key: keyof IndicatorOptions, enabled: boolean) => {
    const next: IndicatorOptions = { ...indicatorOptions, [key]: enabled };
    if (isControlled) onIndicatorOptionsChange?.(next);
    else setLocalOptions(next);
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "var(--card-bg)",
        color: "var(--text)",
      }}
    >
      <div className="flex flex-col gap-2 px-2 pt-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-xs font-medium text-muted">Indicators</span>
          {(["volume", "rsi", "ppo"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setOption(key, !indicatorOptions[key])}
              className={`tab-btn text-xs font-medium ${indicatorOptions[key] ? "active" : ""}`}
            >
              {key === "volume" ? "Volume" : key === "rsi" ? "RSI (14)" : "PPO (10, 16, 9)"}
            </button>
          ))}
        </div>
        <TradingViewChartWithIndicators
          data={data}
          indicators={indicators}
          indicatorOptions={indicatorOptions}
        />
      </div>
    </div>
  );
}

