"use client";

import {
  createChart,
  HistogramSeries,
  LineSeries,
  type HistogramData,
  type LineData,
  ColorType,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { IndicatorSeriesResponse } from "@/lib/api";
import type { OHLCV } from "./TradingViewChart";

const INDICATOR_HEIGHT = 160;

export type IndicatorTab = "volume" | "rsi" | "ppo";

const INDICATOR_LABELS: Record<IndicatorTab, string> = {
  volume: "Volume",
  rsi: "RSI (14)",
  ppo: "PPO (10, 16, 9)",
};

function dateToUnix(timeStr: string): number {
  return Math.floor(
    new Date(timeStr + "T12:00:00Z").getTime() / 1000
  ) as import("lightweight-charts").UTCTimestamp;
}

interface IndicatorChartProps {
  data: OHLCV[];
  indicator: IndicatorTab;
  serverIndicators?: IndicatorSeriesResponse | null;
}

export function IndicatorChart({
  data,
  indicator,
  serverIndicators,
}: IndicatorChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const indicators = serverIndicators;
    const hasVolume =
      indicators?.volume && indicators.volume.length > 0;
    const hasRsi = indicators?.rsi && indicators.rsi.length > 0;
    const hasPpo =
      indicators?.ppo &&
      indicators.ppo.line.length > 0 &&
      indicators.ppo.signal.length > 0 &&
      indicators.ppo.hist.length > 0;

    const hasData =
      (indicator === "volume" && hasVolume) ||
      (indicator === "rsi" && hasRsi) ||
      (indicator === "ppo" && hasPpo);

    if (!hasData) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#27272a" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#3f3f46" },
        horzLines: { color: "#3f3f46" },
      },
      width: containerRef.current.clientWidth,
      height: INDICATOR_HEIGHT,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#52525b",
      },
      rightPriceScale: {
        borderColor: "#52525b",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });

    if (indicator === "volume" && hasVolume && indicators) {
      const volData = indicators.volume.map((p, i) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
        color:
          data[i] && data[i].close >= data[i].open
            ? "rgba(34, 197, 94, 0.5)"
            : "rgba(239, 68, 68, 0.5)",
      }));
      const series = chart.addSeries(HistogramSeries, { priceScaleId: "volume" });
      series.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      series.setData(volData);
    } else if (indicator === "rsi" && hasRsi && indicators) {
      const lineData = indicators.rsi.map((p) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
      }));
      const series = chart.addSeries(LineSeries, {
        color: "#a78bfa",
        priceScaleId: "rsi",
        lineWidth: 2,
      });
      series.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
      });
      series.setData(lineData);
    } else if (indicator === "ppo" && hasPpo && indicators) {
      const { ppo } = indicators;
      const ppoData = ppo.line.map((p) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
      }));
      const signalData = ppo.signal.map((p) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
      }));
      const histData = ppo.hist.map((p) => ({
        time: dateToUnix(p.time) as import("lightweight-charts").UTCTimestamp,
        value: p.value,
        color: p.value >= 0 ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
      }));
      const ppoSeries = chart.addSeries(LineSeries, {
        color: "#06b6d4",
        priceScaleId: "ppo",
        lineWidth: 1,
      });
      ppoSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.2, bottom: 0 },
        borderVisible: false,
      });
      ppoSeries.setData(ppoData);
      const signalSeries = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        priceScaleId: "ppo",
        lineWidth: 1,
      });
      signalSeries.setData(signalData);
      const histSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: "ppo",
      });
      histSeries.setData(histData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chart)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, indicator, serverIndicators]);

  const hasAnyIndicators =
    serverIndicators &&
    ((serverIndicators.volume?.length ?? 0) > 0 ||
      (serverIndicators.rsi?.length ?? 0) > 0 ||
      (serverIndicators.ppo?.line?.length ?? 0) > 0);

  if (!hasAnyIndicators || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height: INDICATOR_HEIGHT }}
      >
        Select symbol and date range, then Search to load indicators.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="mb-1 text-xs font-medium text-gray-400">
        {INDICATOR_LABELS[indicator]}
      </p>
      <div ref={containerRef} style={{ width: "100%", height: INDICATOR_HEIGHT }} />
    </div>
  );
}

export { INDICATOR_LABELS };
