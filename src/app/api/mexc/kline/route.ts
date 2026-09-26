import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FUTURES_KLINE_BASE = "https://contract.mexc.com/api/v1/contract/kline";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVAL_MAP: Record<string, string> = {
  "1m": "Min1",
  "5m": "Min5",
  "15m": "Min15",
  "1h": "Min60",
  "4h": "Hour4",
  "1d": "Day1",
};

// In-memory cache for K-line responses to avoid hitting MEXC rate limits
const klineCache: Record<
  string,
  { data: CandleData[]; fetchedAt: number }
> = {};
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const rawInterval = searchParams.get("interval") || "15m";

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing symbol parameter" },
      { status: 400 }
    );
  }

  const mexcInterval = INTERVAL_MAP[rawInterval] || "Min15";
  const cacheKey = `${symbol}_${mexcInterval}`;
  const now = Date.now();

  const cached = klineCache[cacheKey];
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      symbol,
      interval: rawInterval,
      candles: cached.data,
      cached: true,
    });
  }

  try {
    const url = `${FUTURES_KLINE_BASE}/${encodeURIComponent(symbol)}?interval=${mexcInterval}`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `MEXC Kline request failed: HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();

    if (!json.success || !json.data || !Array.isArray(json.data.time)) {
      return NextResponse.json(
        { error: "Invalid data format received from MEXC" },
        { status: 502 }
      );
    }

    const times: number[] = json.data.time;
    const opens: number[] = json.data.open;
    const highs: number[] = json.data.high;
    const lows: number[] = json.data.low;
    const closes: number[] = json.data.close;
    const vols: number[] = json.data.vol || [];

    const candles: CandleData[] = [];
    const seenTimes = new Set<number>();

    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (!t || seenTimes.has(t)) continue;
      seenTimes.add(t);

      const o = Number(opens[i]);
      const h = Number(highs[i]);
      const l = Number(lows[i]);
      const c = Number(closes[i]);
      const v = Number(vols[i] || 0);

      if (!isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
        candles.push({
          time: t,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v,
        });
      }
    }

    // Sort ascending by timestamp as required by lightweight-charts
    candles.sort((a, b) => a.time - b.time);

    klineCache[cacheKey] = { data: candles, fetchedAt: now };

    return NextResponse.json({
      success: true,
      symbol,
      interval: rawInterval,
      candles,
      cached: false,
    });
  } catch (err) {
    if (cached) {
      return NextResponse.json({
        success: true,
        symbol,
        interval: rawInterval,
        candles: cached.data,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch Kline data" },
      { status: 500 }
    );
  }
}
