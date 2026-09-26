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

export interface RectangleShape {
  id: string;
  type: "rectangle";
  time1: number;
  price1: number;
  time2: number;
  price2: number;
  color: string;
}

export interface PathShape {
  id: string;
  type: "path";
  points: Array<{ time: number; price: number }>;
  color: string;
}

export type ChartDrawing = RectangleShape | PathShape;

export type DrawingTool = "select" | "rectangle" | "path";

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

const DRAWING_COLORS = [
  { label: "Violet", hex: "#8b5cf6" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Amber", hex: "#f59e0b" },
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

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [drawingColor, setDrawingColor] = useState<string>("#8b5cf6");
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [rectStart, setRectStart] = useState<{ time: number; price: number } | null>(null);
  const [pathPoints, setPathPoints] = useState<Array<{ time: number; price: number }>>([]);
  const [mousePos, setMousePos] = useState<{ time: number; price: number } | null>(null);
  const [, setRenderTick] = useState<number>(0);

  const isFirstLoadRef = useRef<boolean>(true);
  const cleanSym = cleanSymbol(symbol);
  const storageKey = `mochex_drawings_${cleanSym}`;

  // Load saved drawings from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setDrawings(JSON.parse(saved));
      } else {
        setDrawings([]);
      }
    } catch {
      setDrawings([]);
    }
  }, [storageKey]);

  // Save drawings to LocalStorage
  const saveDrawings = useCallback(
    (newDrawings: ChartDrawing[]) => {
      setDrawings(newDrawings);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newDrawings));
      } catch (err) {
        console.error("Failed to save drawings:", err);
      }
    },
    [storageKey]
  );

  const clearAllDrawings = () => {
    saveDrawings([]);
    setRectStart(null);
    setPathPoints([]);
  };

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

    // Create lightweight-chart instance with MOCHEX dark aesthetic
    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0c0a17" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "Inter, Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(139, 92, 246, 0.07)" },
        horzLines: { color: "rgba(139, 92, 246, 0.07)" },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: "#8b5cf6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1c1830",
        },
        horzLine: {
          color: "#8b5cf6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1c1830",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(139, 92, 246, 0.15)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave room for volume bars at bottom
        },
      },
      timeScale: {
        borderColor: "rgba(139, 92, 246, 0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
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

    // Re-render SVG drawing overlays whenever chart pans or zooms
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      setRenderTick((t) => t + 1);
    });

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
        setRenderTick((t) => t + 1);
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

  // Handle drawing trade overlay lines on candlestick series
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

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
          color: "#8b5cf6", // Mochex Violet
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
          color: "#fb7185", // Mochex Rose (Loss)
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
          color: "#34d399", // Mochex Emerald (Gain)
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

  // Coordinate conversion helper: Pixel (x, y) -> Chart (time, price)
  const getChartPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !candlestickSeriesRef.current || !chartContainerRef.current) return null;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = candlestickSeriesRef.current.coordinateToPrice(y);

    if (time == null || price == null) return null;
    return { time: Number(time), price, x, y };
  };

  // Convert chart point (time, price) -> screen pixel (x, y)
  const toPixelCoords = (
    time: number,
    price: number
  ): { x: number; y: number } | null => {
    if (!chartRef.current || !candlestickSeriesRef.current) return null;
    const x = chartRef.current.timeScale().timeToCoordinate(time as Time);
    const y = candlestickSeriesRef.current.priceToCoordinate(price);
    if (x === null || y === null) return null;
    return { x: Number(x), y: Number(y) };
  };

  // Mouse interaction handlers for drawing tool SVG canvas
  const handleSVGClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getChartPoint(e);
    if (!pt) return;

    if (activeTool === "rectangle") {
      if (!rectStart) {
        setRectStart({ time: pt.time, price: pt.price });
      } else {
        // Complete rectangle
        const newRect: RectangleShape = {
          id: `rect_${Date.now()}`,
          type: "rectangle",
          time1: rectStart.time,
          price1: rectStart.price,
          time2: pt.time,
          price2: pt.price,
          color: drawingColor,
        };
        saveDrawings([...drawings, newRect]);
        setRectStart(null);
      }
    } else if (activeTool === "path") {
      setPathPoints((prev) => [...prev, { time: pt.time, price: pt.price }]);
    }
  };

  const handleSVGMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getChartPoint(e);
    if (pt) {
      setMousePos({ time: pt.time, price: pt.price });
    }
  };

  const finishPath = () => {
    if (pathPoints.length >= 2) {
      const newPath: PathShape = {
        id: `path_${Date.now()}`,
        type: "path",
        points: pathPoints,
        color: drawingColor,
      };
      saveDrawings([...drawings, newPath]);
    }
    setPathPoints([]);
  };

  const activeCandle = hoverData || lastCandle;

  return (
    <div className="w-full bg-panel border border-line rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header Controls Bar */}
      <div className="px-4 py-2.5 bg-panel-soft/80 border-b border-line flex flex-wrap items-center justify-between gap-3">
        {/* Symbol & Price Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-text tracking-wide">
              {cleanSym}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent/15 text-accent font-semibold border border-accent/30">
              MEXC Futures
            </span>
            {setup?.side && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold border ${
                  setup.side === "LONG"
                    ? "bg-gain/15 text-gain border-gain/30"
                    : "bg-loss/15 text-loss border-loss/30"
                }`}
              >
                {setup.side}
              </span>
            )}
          </div>

          {activeCandle && (
            <div className="hidden lg:flex items-center gap-3 font-mono text-xs text-muted border-l border-line pl-3">
              <span>
                O: <strong className="text-text">{fmtPx(activeCandle.open)}</strong>
              </span>
              <span>
                H: <strong className="text-gain">{fmtPx(activeCandle.high)}</strong>
              </span>
              <span>
                L: <strong className="text-loss">{fmtPx(activeCandle.low)}</strong>
              </span>
              <span>
                C:{" "}
                <strong
                  className={
                    activeCandle.close >= activeCandle.open
                      ? "text-gain"
                      : "text-loss"
                  }
                >
                  {fmtPx(activeCandle.close)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Timeframe Selector & Drawing Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Drawing Tools Selector Bar */}
          <div className="flex items-center bg-panel p-1 rounded-lg border border-line gap-1">
            <button
              onClick={() => {
                setActiveTool("select");
                setRectStart(null);
                setPathPoints([]);
              }}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTool === "select"
                  ? "bg-accent/20 text-accent font-bold border border-accent/40 shadow-xs"
                  : "text-muted hover:text-text"
              }`}
              title="Select / Pan Mode"
            >
              <span>🖐️ Pan</span>
            </button>

            <button
              onClick={() => {
                setActiveTool("rectangle");
                setPathPoints([]);
              }}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTool === "rectangle"
                  ? "bg-accent/20 text-accent font-bold border border-accent/40 shadow-xs"
                  : "text-muted hover:text-text"
              }`}
              title="Draw Rectangle Support/Demand Zone"
            >
              <span>⬛ Rectangle</span>
            </button>

            <button
              onClick={() => {
                setActiveTool("path");
                setRectStart(null);
              }}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                activeTool === "path"
                  ? "bg-accent/20 text-accent font-bold border border-accent/40 shadow-xs"
                  : "text-muted hover:text-text"
              }`}
              title="Draw Multi-Point Path / Wave Line"
            >
              <span>✏️ Path</span>
            </button>
          </div>

          {/* Drawing Colors Swatch */}
          {activeTool !== "select" && (
            <div className="flex items-center gap-1 bg-panel p-1 rounded-lg border border-line">
              {DRAWING_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setDrawingColor(c.hex)}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    drawingColor === c.hex ? "scale-125 ring-2 ring-white" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          )}

          {/* Finish Path button when drafting path */}
          {pathPoints.length >= 2 && (
            <button
              onClick={finishPath}
              className="accent-btn px-2.5 py-1 text-xs font-bold"
            >
              Finish Path ({pathPoints.length})
            </button>
          )}

          {/* Clear Drawings Button */}
          {drawings.length > 0 && (
            <button
              onClick={clearAllDrawings}
              className="px-2 py-1 text-xs font-medium bg-panel text-muted hover:text-loss border border-line hover:border-loss/40 rounded-lg transition-colors"
              title="Clear all drawing shapes for this symbol"
            >
              🗑️ Clear ({drawings.length})
            </button>
          )}

          {showOverlayToggle && setup && (
            <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer bg-panel px-2.5 py-1 rounded-lg border border-line hover:bg-panel-soft transition-colors">
              <input
                type="checkbox"
                checked={showSetup}
                onChange={(e) => setShowSetup(e.target.checked)}
                className="rounded border-line text-accent focus:ring-accent bg-panel-soft"
              />
              <span className="font-medium text-text">Setup Overlay</span>
            </label>
          )}

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-panel p-1 rounded-lg border border-line">
            {INTERVALS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => {
                  isFirstLoadRef.current = true;
                  setKlineInterval(tf.value);
                }}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                  klineInterval === tf.value
                    ? "bg-accent text-white font-bold shadow-xs"
                    : "text-muted hover:text-text hover:bg-panel-soft"
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
            className="p-1.5 text-muted hover:text-text bg-panel border border-line hover:bg-panel-soft rounded-lg transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`}
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
          <div className="absolute inset-0 bg-paper/60 backdrop-blur-xs z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-panel px-4 py-2.5 rounded-xl border border-line shadow-xl">
              <svg
                className="w-5 h-5 animate-spin text-accent"
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
              <span className="text-xs font-mono text-muted">
                Loading {cleanSym} Candlesticks...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-panel/95 z-20 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-loss/15 border border-loss/30 text-loss flex items-center justify-center mb-3 text-xl">
              ⚠️
            </div>
            <h4 className="text-sm font-bold text-text mb-1">Chart Data Unavailable</h4>
            <p className="text-xs text-muted max-w-sm mb-4">{error}</p>
            <button
              onClick={() => fetchCandles(false)}
              className="accent-btn px-4 py-1.5 text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Lightweight-charts Canvas Container */}
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* SVG Drawing Overlay Layer */}
        <div
          onClick={handleSVGClick}
          onMouseMove={handleSVGMouseMove}
          onDoubleClick={finishPath}
          className={`absolute inset-0 z-10 overflow-hidden ${
            activeTool !== "select" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <svg className="w-full h-full">
            {/* Render Saved Rectangle & Path Drawings */}
            {drawings.map((shape) => {
              if (shape.type === "rectangle") {
                const p1 = toPixelCoords(shape.time1, shape.price1);
                const p2 = toPixelCoords(shape.time2, shape.price2);
                if (!p1 || !p2) return null;

                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);
                const minY = Math.min(p1.y, p2.y);
                const maxY = Math.max(p1.y, p2.y);
                const width = Math.max(maxX - minX, 4);
                const height = Math.max(maxY - minY, 4);

                return (
                  <g key={shape.id}>
                    <rect
                      x={minX}
                      y={minY}
                      width={width}
                      height={height}
                      fill={shape.color}
                      fillOpacity={0.2}
                      stroke={shape.color}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      rx={3}
                    />
                  </g>
                );
              }

              if (shape.type === "path") {
                const rawPx = shape.points.map((pt) => toPixelCoords(pt.time, pt.price));
                const pxPoints = rawPx.filter(
                  (p): p is { x: number; y: number } => p !== null
                );

                if (pxPoints.length < 2) return null;

                const pointsStr = pxPoints.map((p) => `${p.x},${p.y}`).join(" ");

                return (
                  <g key={shape.id}>
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={shape.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pxPoints.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill={shape.color}
                        stroke="#0b0e14"
                        strokeWidth={1}
                      />
                    ))}
                  </g>
                );
              }

              return null;
            })}

            {/* Render Drafting Rectangle Preview */}
            {activeTool === "rectangle" && rectStart && mousePos && (
              (() => {
                const p1 = toPixelCoords(rectStart.time, rectStart.price);
                const p2 = toPixelCoords(mousePos.time, mousePos.price);
                if (!p1 || !p2) return null;

                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);
                const minY = Math.min(p1.y, p2.y);
                const maxY = Math.max(p1.y, p2.y);

                return (
                  <rect
                    x={minX}
                    y={minY}
                    width={Math.max(maxX - minX, 4)}
                    height={Math.max(maxY - minY, 4)}
                    fill={drawingColor}
                    fillOpacity={0.25}
                    stroke={drawingColor}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                );
              })()
            )}

            {/* Render Drafting Path Preview */}
            {activeTool === "path" && pathPoints.length > 0 && (
              (() => {
                const rawPx = pathPoints.map((pt) => toPixelCoords(pt.time, pt.price));
                const pxPoints = rawPx.filter(
                  (p): p is { x: number; y: number } => p !== null
                );

                if (mousePos) {
                  const mPx = toPixelCoords(mousePos.time, mousePos.price);
                  if (mPx) pxPoints.push(mPx);
                }

                if (pxPoints.length < 2) return null;

                const pointsStr = pxPoints.map((p) => `${p.x},${p.y}`).join(" ");

                return (
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={drawingColor}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })()
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
