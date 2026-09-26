import { Time } from "lightweight-charts";
import { CandleData } from "@/app/api/mexc/kline/route";

export interface ScriptPlotOptions {
  title?: string;
  color?: string;
  lineWidth?: number;
}

export interface ScriptPlot {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  data: Array<{ time: Time; value: number }>;
}

export interface ExecutionResult {
  success: boolean;
  plots: ScriptPlot[];
  error?: string;
  outputCount?: number;
}

export interface ScriptTemplate {
  name: string;
  description: string;
  code: string;
}

// 1. Math indicator helper functions (PineScript equivalents)
export function sma(source: number[], period: number): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += source[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < source.length; i++) {
    sum += source[i] - source[i - period];
    result[i] = sum / period;
  }
  return result;
}

export function ema(source: number[], period: number): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length < period || period <= 0) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += source[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < source.length; i++) {
    const currentEma = source[i] * k + prevEma * (1 - k);
    result[i] = currentEma;
    prevEma = currentEma;
  }
  return result;
}

export function stddev(source: number[], period: number): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length < period || period <= 0) return result;

  for (let i = period - 1; i < source.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += source[i - j];
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(source[i - j] - mean, 2);
    }
    result[i] = Math.sqrt(varianceSum / period);
  }
  return result;
}

export function highest(source: number[], period: number): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length < period || period <= 0) return result;

  for (let i = period - 1; i < source.length; i++) {
    let max = -Infinity;
    for (let j = 0; j < period; j++) {
      if (source[i - j] > max) max = source[i - j];
    }
    result[i] = max;
  }
  return result;
}

export function lowest(source: number[], period: number): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length < period || period <= 0) return result;

  for (let i = period - 1; i < source.length; i++) {
    let min = Infinity;
    for (let j = 0; j < period; j++) {
      if (source[i - j] < min) min = source[i - j];
    }
    result[i] = min;
  }
  return result;
}

export function rsi(source: number[], period: number = 14): number[] {
  const result: number[] = new Array(source.length).fill(NaN);
  if (source.length <= period || period <= 0) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = source[i] - source[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < source.length; i++) {
    const diff = source[i] - source[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
  }

  return result;
}

export function crossover(s1: number[], s2: number[]): boolean[] {
  const result: boolean[] = new Array(s1.length).fill(false);
  for (let i = 1; i < s1.length; i++) {
    if (!isNaN(s1[i - 1]) && !isNaN(s2[i - 1]) && !isNaN(s1[i]) && !isNaN(s2[i])) {
      if (s1[i - 1] <= s2[i - 1] && s1[i] > s2[i]) {
        result[i] = true;
      }
    }
  }
  return result;
}

export function crossunder(s1: number[], s2: number[]): boolean[] {
  const result: boolean[] = new Array(s1.length).fill(false);
  for (let i = 1; i < s1.length; i++) {
    if (!isNaN(s1[i - 1]) && !isNaN(s2[i - 1]) && !isNaN(s1[i]) && !isNaN(s2[i])) {
      if (s1[i - 1] >= s2[i - 1] && s1[i] < s2[i]) {
        result[i] = true;
      }
    }
  }
  return result;
}

// 2. Pre-built templates
export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    name: "EMA Ribbon (9 & 21)",
    description: "Fast 9 EMA and Slow 21 EMA trend indicator with crossover colors",
    code: `// Fast 9 EMA and Slow 21 EMA Trend Ribbon
const fast = ema(close, 9);
const slow = ema(close, 21);

plot(fast, { title: "Fast EMA 9", color: "#06b6d4", lineWidth: 2 });
plot(slow, { title: "Slow EMA 21", color: "#f43f5e", lineWidth: 2 });
`,
  },
  {
    name: "Bollinger Bands (20, 2)",
    description: "20 SMA basis with +2 and -2 standard deviation upper and lower bands",
    code: `// 20-period Bollinger Bands
const basis = sma(close, 20);
const dev = stddev(close, 20);

const upper = basis.map((v, i) => v + 2 * dev[i]);
const lower = basis.map((v, i) => v - 2 * dev[i]);

plot(basis, { title: "Basis SMA 20", color: "#f59e0b", lineWidth: 1.5 });
plot(upper, { title: "Upper Band", color: "#34d399", lineWidth: 1.5 });
plot(lower, { title: "Lower Band", color: "#fb7185", lineWidth: 1.5 });
`,
  },
  {
    name: "Donchian Channels (20)",
    description: "20-bar highest high and lowest low breakout channel",
    code: `// 20-bar Donchian Breakout Channel
const upper = highest(high, 20);
const lower = lowest(low, 20);
const mid = upper.map((v, i) => (v + lower[i]) / 2);

plot(upper, { title: "Donchian High", color: "#38bdf8", lineWidth: 2 });
plot(mid, { title: "Donchian Mid", color: "#94a3b8", lineWidth: 1 });
plot(lower, { title: "Donchian Low", color: "#f43f5e", lineWidth: 2 });
`,
  },
  {
    name: "Triple Moving Average (10, 30, 100)",
    description: "Multi-trend confirmation with three moving averages",
    code: `// Triple Moving Average System
const ma10 = ema(close, 10);
const ma30 = ema(close, 30);
const ma100 = sma(close, 100);

plot(ma10, { title: "EMA 10", color: "#a855f7", lineWidth: 2 });
plot(ma30, { title: "EMA 30", color: "#06b6d4", lineWidth: 2 });
plot(ma100, { title: "SMA 100", color: "#facc15", lineWidth: 2.5 });
`,
  },
];

// 3. Script Execution Engine
export function executeChartScript(userCode: string, candles: CandleData[]): ExecutionResult {
  if (!candles || candles.length === 0) {
    return { success: false, plots: [], error: "No candle data loaded to execute script." };
  }

  const close = candles.map((c) => c.close);
  const open = candles.map((c) => c.open);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const volume = candles.map((c) => c.volume);
  const time = candles.map((c) => c.time);

  const collectedPlots: ScriptPlot[] = [];
  let plotIndex = 0;

  const plotFn = (seriesData: number[], options?: ScriptPlotOptions) => {
    if (!Array.isArray(seriesData)) {
      throw new Error(`plot() argument must be an array of numbers.`);
    }

    const title = options?.title || `Plot ${plotIndex + 1}`;
    const color = options?.color || "#8b5cf6";
    const lineWidth = options?.lineWidth || 2;
    const id = `script_plot_${plotIndex++}_${Date.now()}`;

    const formattedData: Array<{ time: Time; value: number }> = [];
    for (let i = 0; i < seriesData.length; i++) {
      const val = seriesData[i];
      if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
        formattedData.push({
          time: time[i] as Time,
          value: val,
        });
      }
    }

    collectedPlots.push({
      id,
      title,
      color,
      lineWidth,
      data: formattedData,
    });
  };

  try {
    // Create sandboxed runner function with math helpers
    const runner = new Function(
      "close",
      "open",
      "high",
      "low",
      "volume",
      "time",
      "sma",
      "ema",
      "stddev",
      "highest",
      "lowest",
      "rsi",
      "crossover",
      "crossunder",
      "plot",
      userCode
    );

    runner(
      close,
      open,
      high,
      low,
      volume,
      time,
      sma,
      ema,
      stddev,
      highest,
      lowest,
      rsi,
      crossover,
      crossunder,
      plotFn
    );

    return {
      success: true,
      plots: collectedPlots,
      outputCount: collectedPlots.length,
    };
  } catch (err) {
    return {
      success: false,
      plots: [],
      error: (err as Error).message || "Unknown error executing script.",
    };
  }
}
