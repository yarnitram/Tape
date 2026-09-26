"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import { CandleData } from "@/app/api/mexc/kline/route";
import { fmtPx, cleanSymbol } from "@/lib/format";

export interface TradeSetupOverlay {
  symbol: string;
  side?: "LONG" | "SHORT" | null;
  trigger_price?: number | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  order_type?: string | null;
}

interface Props {
  symbol: string;
  setup?: TradeSetupOverlay | null;
  height?: number;
  initialInterval?: string;
  showOverlayToggle?: boolean;
}

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

export function InteractiveCandlestickChart({
  symbol,
  setup,
  height = 450,
  initialInterval = "15m",
  showOverlayToggle = true,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [klineInterval, setKlineInterval] = useState<string>(initialInterval);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(true);
  const [lastCandle, setLastCandle] = useState<CandleData | null>(null);
  const [hoverData, setHoverData] = useState<CandleData | null>(null);

  const isFirstLoadRef = useRef<boolean>(true);

  const cleanSym = cleanSymbol(symbol);

  // Fetch Kline candles from API proxy
  const fetchCandles = useCallback(
    async (isSilentRefresh = false) => {
      try {
        if (!isSilentRefresh) {
          setLoading(true);
        }
        setError(null);

        const res = await fetch(
          `/api/mexc/kline?symbol=${encodeURIComponent(symbol)}&interval=${klineInterval}`
        );
        const json = await res.json();

        if (!json.success || !Array.isArray(json.candles)) {
          throw new Error(json.error || "Failed to load candlestick chart data");
        }

        const candles: CandleData[] = json.candles;

        if (candles.length === 0) {
          throw new Error(`No chart data available for ${cleanSym}`);
        }

        setLastCandle(candles[candles.length - 1]);

        if (candlestickSeriesRef.current && volumeSeriesRef.current) {
          // Format candlestick data
          const candleData = candles.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));

          // Format volume histogram data
          const volumeData = candles.map((c) => ({
            time: c.time as Time,
            value: c.volume,
            color:
              c.close >= c.open
                ? "rgba(16, 185, 129, 0.4)" // Green for bullish
                : "rgba(239, 68, 68, 0.4)", // Red for bearish
          }));

          candlestickSeriesRef.current.setData(candleData);
          volumeSeriesRef.current.setData(volumeData);

          // Only fit content on initial load or timeframe switch, preserving user zoom/scroll
          if (chartRef.current && isFirstLoadRef.current) {
            chartRef.current.timeScale().fitContent();
            isFirstLoadRef.current = false;
          }
        }
      } catch (err) {
        if (!isSilentRefresh) {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    },
    [symbol, klineInterval, cleanSym]
  );

  // Initialize TradingView chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create lightweight-chart instance with Tape dark aesthetic
    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e14" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "Inter, Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: "#3b82f6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "#3b82f6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(30, 41, 59, 0.8)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave room for volume bars at bottom
        },
      },
      timeScale: {
        borderColor: "rgba(30, 41, 59, 0.8)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // Add Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // Overlay on main price scale
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Position volume at the bottom 20%
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair move handler for legend tooltip
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setHoverData(null);
      } else {
        const data = param.seriesData.get(candlestickSeries) as {
          open: number;
          high: number;
          low: number;
          close: number;
        } | undefined;
        const volData = param.seriesData.get(volumeSeries) as { value: number } | undefined;

        if (data) {
          setHoverData({
            time: Number(param.time),
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: volData?.value || 0,
          });
        }
      }
    });

    // Handle container resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // Load candle data whenever symbol or interval changes
  useEffect(() => {
    isFirstLoadRef.current = true;
    fetchCandles(false);
    const timer = setInterval(() => fetchCandles(true), 10_000); // Silent background auto-refresh
    return () => clearInterval(timer);
  }, [fetchCandles]);

  // Update Trade Overlay Lines when setup or showSetup changes
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    // Remove old price lines if any exist
    // Note: lightweight-charts price lines can be removed by priceLine instance
    // To cleanly update, we re-apply setup lines
  }, [setup, showSetup]);

  // Handle drawing trade overlay lines on candlestick series
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    // Store active price line instances to remove on cleanup
    const lines: Array<{ remove: () => void }> = [];

    if (showSetup && setup) {
      // 1. Trigger Price Line
      if (setup.trigger_price && setup.trigger_price > 0) {
        const line = series.createPriceLine({
          price: setup.trigger_price,
          color: "#f59e0b", // Amber/Orange
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `⚡ TRIGGER: ${fmtPx(setup.trigger_price)}`,
        });
        lines.push({ remove: () => series.removePriceLine(line) });
      }

      // 2. Entry Price Line
      if (setup.entry_price && setup.entry_price > 0) {
        const line = series.createPriceLine({
          price: setup.entry_price,
          color: "#06b6d4", // Cyan/Blue
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🎯 ENTRY: ${fmtPx(setup.entry_price)}`,
        });
        lines.push({ remove: () => series.removePriceLine(line) });
      }

      // 3. Stop Loss Line
      if (setup.stop_loss && setup.stop_loss > 0) {
        let riskPctStr = "";
        const basePx = setup.entry_price || setup.trigger_price;
        if (basePx && basePx > 0) {
          const diff = Math.abs(setup.stop_loss - basePx);
          const pct = (diff / basePx) * 100;
          riskPctStr = ` (-${pct.toFixed(2)}%)`;
        }

        const line = series.createPriceLine({
          price: setup.stop_loss,
          color: "#ef4444", // Red
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `🛑 SL: ${fmtPx(setup.stop_loss)}${riskPctStr}`,
        });
        lines.push({ remove: () => series.removePriceLine(line) });
      }

      // 4. Take Profit Line
      if (setup.take_profit && setup.take_profit > 0) {
        let rewardPctStr = "";
        const basePx = setup.entry_price || setup.trigger_price;
        if (basePx && basePx > 0) {
          const diff = Math.abs(setup.take_profit - basePx);
          const pct = (diff / basePx) * 100;
          rewardPctStr = ` (+${pct.toFixed(2)}%)`;
        }

        const line = series.createPriceLine({
          price: setup.take_profit,
          color: "#10b981", // Green
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `🏁 TP: ${fmtPx(setup.take_profit)}${rewardPctStr}`,
        });
        lines.push({ remove: () => series.removePriceLine(line) });
      }
    }

    return () => {
      for (const l of lines) {
        l.remove();
      }
    };
  }, [setup, showSetup, loading]);

  const activeCandle = hoverData || lastCandle;

  return (
    <div className="w-full bg-[#0b0e14] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header Controls Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Symbol & Price Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-white tracking-wide">
              {cleanSym}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 font-semibold border border-cyan-800/40">
              MEXC Futures
            </span>
            {setup?.side && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  setup.side === "LONG"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                    : "bg-red-950/80 text-red-400 border border-red-800/40"
                }`}
              >
                {setup.side}
              </span>
            )}
          </div>

          {activeCandle && (
            <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-slate-400 border-l border-slate-800 pl-3">
              <span>
                O: <strong className="text-slate-200">{fmtPx(activeCandle.open)}</strong>
              </span>
              <span>
                H: <strong className="text-emerald-400">{fmtPx(activeCandle.high)}</strong>
              </span>
              <span>
                L: <strong className="text-red-400">{fmtPx(activeCandle.low)}</strong>
              </span>
              <span>
                C:{" "}
                <strong
                  className={
                    activeCandle.close >= activeCandle.open
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {fmtPx(activeCandle.close)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Timeframe Selector & Overlay Toggle */}
        <div className="flex items-center gap-2">
          {showOverlayToggle && setup && (
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer mr-2 bg-slate-800/60 px-2.5 py-1 rounded border border-slate-700/50 hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={showSetup}
                onChange={(e) => setShowSetup(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
              />
              <span className="font-medium text-slate-200">Setup Overlay</span>
            </label>
          )}

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {INTERVALS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => {
                  isFirstLoadRef.current = true;
                  setKlineInterval(tf.value);
                }}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition ${
                  klineInterval === tf.value
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchCandles(false)}
            disabled={loading}
            title="Refresh Chart"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative w-full flex-1 min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl">
              <svg
                className="w-5 h-5 animate-spin text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xs font-mono text-slate-300">
                Loading {cleanSym} Candlesticks...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-800/40 text-red-400 flex items-center justify-center mb-3 text-xl">
              ⚠️
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Chart Data Unavailable</h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4">{error}</p>
            <button
              onClick={() => fetchCandles(false)}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
