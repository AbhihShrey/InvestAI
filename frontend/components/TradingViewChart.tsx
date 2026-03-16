"use client";

import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  ColorType,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { IndicatorSeriesResponse } from "@/lib/api";

export interface OHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function computeRsi(closes: number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      out.push(50);
      continue;
    }
    let gains = 0;
    let losses = 0;
    for (let j = i - period; j < i; j++) {
      const d = closes[j + 1]! - closes[j]!;
      if (d > 0) gains += d;
      else losses -= d;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) {
      out.push(100);
      continue;
    }
    const rs = avgGain / avgLoss;
    out.push(100 - 100 / (1 + rs));
  }
  return out;
}

function ema(arr: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period; i++) out.push(prev);
  for (let i = period; i < arr.length; i++) {
    prev = arr[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

/** PPO (10, 16, 9): (EMA10 - EMA16) / EMA16 * 100; signal = EMA9(PPO); hist = PPO - signal */
export function computePpo(
  closes: number[],
  fast = 10,
  slow = 16,
  signalPeriod = 9
): { ppo: number[]; signal: number[]; hist: number[] } {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const ppoLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const slowVal = slowEma[i] ?? 0;
    ppoLine.push(slowVal !== 0 ? ((fastEma[i] ?? 0) - slowVal) / slowVal * 100 : 0);
  }
  const signalLine = ema(ppoLine, signalPeriod);
  const hist: number[] = [];
  for (let i = 0; i < ppoLine.length; i++) {
    hist.push((ppoLine[i] ?? 0) - (signalLine[i] ?? 0));
  }
  return { ppo: ppoLine, signal: signalLine, hist };
}

interface TradingViewChartProps {
  data?: OHLCV[];
  height?: number;
}

/** Main price chart (candlestick only). */
export function TradingViewChart({ data: propData, height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const data = propData && propData.length > 0 ? propData : [];

  useEffect(() => {
    if (!containerRef.current) return;

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
      height,
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

    const cdlData: CandlestickData[] = data.map((d) => ({
      time: Number(d.time) as import("lightweight-charts").UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    if (cdlData.length > 0) {
      const candlestick = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
      });
      candlestick.setData(cdlData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;
    const handleResize = () => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}

export type IndicatorTab = "volume" | "rsi" | "ppo";

export type IndicatorOptions = Record<IndicatorTab, boolean>;

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

const chartOptions = {
  layout: {
    background: { type: ColorType.Solid as const, color: "#27272a" },
    textColor: "#a1a1aa",
  },
  grid: {
    vertLines: { color: "#3f3f46" },
    horzLines: { color: "#3f3f46" },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: "#52525b",
  },
  rightPriceScale: {
    borderColor: "#52525b",
    scaleMargins: { top: 0.1, bottom: 0.2 },
  },
};

interface TradingViewChartWithIndicatorsProps {
  data?: OHLCV[] | null;
  indicators?: IndicatorSeriesResponse | null;
  indicatorOptions?: IndicatorOptions;
}

/** Single chart: OHLC at top, indicators stacked at bottom on the same canvas. */
export function TradingViewChartWithIndicators({
  data: propData,
  indicators,
  indicatorOptions = { volume: true, rsi: true, ppo: true },
}: TradingViewChartWithIndicatorsProps) {
  const data = propData && propData.length > 0 ? propData : [];
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const showVolume = indicatorOptions.volume && indicators?.volume?.length;
  const showRsi = indicatorOptions.rsi && indicators?.rsi?.length;
  const showPpo =
    indicatorOptions.ppo &&
    indicators?.ppo?.line?.length &&
    indicators?.ppo?.signal?.length &&
    indicators?.ppo?.hist?.length;

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    if (width === 0) return;

    const chartHeight = 480;
    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width,
      height: chartHeight,
    });
    chartRef.current = chart;

    // Price (top band ~5%–45%)
    if (data.length > 0) {
      chart.priceScale("right").applyOptions({
        // Visible range: [0.05, 0.45]
        topColor: undefined,
        bottomColor: undefined,
        scaleMargins: { top: 0.05, bottom: 0.55 },
      });

      const cdlData: CandlestickData[] = data.map((d) => ({
        time: Number(d.time) as import("lightweight-charts").UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      const candlestick = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
      });
      candlestick.setData(cdlData);
    }

    // Volume band ~45%–55%
    if (showVolume && indicators?.volume && data.length) {
      const volData: HistogramData[] = indicators.volume.map((p, i) => ({
        time: dateToUnix(p.time),
        value: p.value,
        color:
          data[i] && data[i].close >= data[i].open
            ? "rgba(34, 197, 94, 0.5)"
            : "rgba(239, 68, 68, 0.5)",
      }));
      const volSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: "volume",
      });
      volSeries.priceScale().applyOptions({
        // Visible range: [0.45, 0.55]
        scaleMargins: { top: 0.45, bottom: 0.45 },
        borderVisible: false,
      });
      volSeries.setData(volData);
    }

    // RSI band ~55%–65%
    if (showRsi && indicators?.rsi) {
      const lineData: LineData[] = indicators.rsi.map((p) => ({
        time: dateToUnix(p.time),
        value: p.value,
      }));
      const rsiSeries = chart.addSeries(LineSeries, {
        color: "#a78bfa",
        priceScaleId: "rsi",
        lineWidth: 2,
      });
      rsiSeries.priceScale().applyOptions({
        // Visible range: [0.55, 0.65]
        scaleMargins: { top: 0.55, bottom: 0.35 },
        borderVisible: false,
      });
      rsiSeries.setData(lineData);
    }

    // PPO band ~65%–95%
    if (showPpo && indicators?.ppo) {
      const ppo = indicators.ppo;
      const ppoData: LineData[] = ppo.line.map((p) => ({
        time: dateToUnix(p.time),
        value: p.value,
      }));
      const signalData: LineData[] = ppo.signal.map((p) => ({
        time: dateToUnix(p.time),
        value: p.value,
      }));
      const histData: HistogramData[] = ppo.hist.map((p) => ({
        time: dateToUnix(p.time),
        value: p.value,
        color: p.value >= 0 ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
      }));

      const ppoSeries = chart.addSeries(LineSeries, {
        color: "#06b6d4",
        priceScaleId: "ppo",
        lineWidth: 1,
      });
      ppoSeries.priceScale().applyOptions({
        // Visible range: [0.65, 0.95]
        scaleMargins: { top: 0.65, bottom: 0.05 },
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
      if (!containerRef.current || !chartRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) chartRef.current.applyOptions({ width: w });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, indicators, showVolume, showRsi, showPpo]);

  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center justify-center text-gray-500"
          style={{ height: 400 }}
        >
          Select symbol and date range, then Search to load data.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="font-semibold text-gray-200">Price (OHLC)</span>
        {showVolume && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-emerald-300">
            Vol
          </span>
        )}
        {showRsi && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-violet-300">
            RSI (14)
          </span>
        )}
        {showPpo && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-cyan-300">
            PPO (10, 16, 9)
          </span>
        )}
      </div>
      <div className="relative" style={{ width: "100%", height: 480 }}>
        <div
          ref={containerRef}
          className="absolute inset-0"
        />
        {/* Visual separators between price and indicator bands */}
        {showVolume && (
          <div
            className="absolute left-0 right-0 border-t border-gray-700/80"
            style={{ top: "45%" }}
          />
        )}
        {showRsi && (
          <div
            className="absolute left-0 right-0 border-t border-gray-700/80"
            style={{ top: "55%" }}
          />
        )}
        {showPpo && (
          <div
            className="absolute left-0 right-0 border-t border-gray-700/80"
            style={{ top: "65%" }}
          />
        )}
      </div>
    </div>
  );
}
