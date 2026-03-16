"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: (options: any) => void;
    };
  }
}

interface TradingViewEmbeddedChartProps {
  symbol: string;
  height?: number;
}

export function TradingViewEmbeddedChart({
  symbol,
  height = 520,
}: TradingViewEmbeddedChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;

    const containerId = "tv-advanced-chart";

    const renderWidget = () => {
      if (!window.TradingView || !containerRef.current) return;

      // Clear previous content when symbol changes
      containerRef.current.innerHTML = "";

      window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#131722",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        withdateranges: true,
        details: true,
        allow_symbol_change: true,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        container_id: containerId,
      });
    };

    if (window.TradingView) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [symbol]);

  if (!symbol) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        Select a symbol and search to load the chart.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="tv-advanced-chart"
      style={{ width: "100%", height }}
    />
  );
}

