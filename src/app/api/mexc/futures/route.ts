import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FUTURES_BASE = "https://contract.mexc.com/api/v1/contract";

const cache: {
  data: FuturesTicker[] | null;
  fetchedAt: number;
} = { data: null, fetchedAt: 0 };

export interface FuturesTicker {
  symbol: string;
  lastPrice: number;
  bid1: number;
  ask1: number;
  volume24: number;
  amount24: number;
  holdVol: number;
  lower24Price: number;
  high24Price: number;
  riseFallRate: number;
  riseFallValue: number;
  indexPrice: number;
  fairPrice: number;
  fundingRate: number;
  timestamp: number;
}

const TTL_MS = 5000;

export interface FuturesDetail {
  symbol: string;
  displayNameEn: string;
  baseCoin: string;
  quoteCoin: string;
  settleCoin: string;
  contractSize: number;
  minLeverage: number;
  maxLeverage: number;
  minVol: number;
  maxVol: number;
  priceScale: number;
  takerFeeRate: number;
  makerFeeRate: number;
  maintenanceMarginRate: number;
  initialMarginRate: number;
  baseCoinIconUrl: string;
  isHot: boolean;
  isNew: boolean;
  state: number;
  openTime?: number;
}

const detailCache: Record<string, { data: FuturesDetail | null; fetchedAt: number }> = {};
const allDetailsCache: { data: Record<string, FuturesDetail> | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};
const DETAIL_TTL_MS = 60_000;

async function fetchContractDetail(symbol: string): Promise<FuturesDetail | null> {
  const cached = detailCache[symbol];
  if (cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `${FUTURES_BASE}/detail?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store", signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: FuturesDetail };
    const out = json.success ? json.data : null;
    detailCache[symbol] = { data: out, fetchedAt: Date.now() };
    return out;
  } catch {
    return cached ? cached.data : null;
  }
}

async function fetchAllContractDetails(): Promise<Record<string, FuturesDetail>> {
  const now = Date.now();
  if (allDetailsCache.data && now - allDetailsCache.fetchedAt < DETAIL_TTL_MS) {
    return allDetailsCache.data;
  }

  try {
    const res = await fetch(`${FUTURES_BASE}/detail`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return allDetailsCache.data || {};
    const json = (await res.json()) as { success: boolean; data: FuturesDetail[] };
    if (!json.success || !Array.isArray(json.data)) return allDetailsCache.data || {};

    const map: Record<string, FuturesDetail> = {};
    for (const d of json.data) {
      if (d.symbol) {
        const symUpper = d.symbol.toUpperCase();
        map[symUpper] = d;
        detailCache[symUpper] = { data: d, fetchedAt: now };
      }
    }

    allDetailsCache.data = map;
    allDetailsCache.fetchedAt = now;
    return map;
  } catch {
    return allDetailsCache.data || {};
  }
}

async function fetchAllTickers(): Promise<FuturesTicker[]> {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  const res = await fetch(`${FUTURES_BASE}/ticker`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`MEXC futures error: ${res.status}`);
  }
  const json = (await res.json()) as { success: boolean; data: FuturesTicker[] };
  if (!json.success) {
    throw new Error("MEXC futures request failed");
  }

  const filtered = json.data.filter(
    (t) =>
      t.symbol.endsWith("_USDT") &&
      typeof t.lastPrice === "number" &&
      t.lastPrice > 0
  );

  cache.data = filtered;
  cache.fetchedAt = Date.now();
  return filtered;
}

/**
 * GET /api/mexc/futures
 *   ?symbols=BTC_USDT,ETH_USDT -> tickers + details map for symbols
 *   ?symbol=BTC_USDT          -> single ticker + detail for symbol
 *   ?q=BTC                    -> search USDT perpetuals by substring
 *   ?with_details=true        -> include contract details map for all/filtered symbols
 *   (no params)               -> all USDT perpetual tickers
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const singleSymbol = searchParams.get("symbol")?.toUpperCase();
  const rawSymbols = searchParams.get("symbols")?.toUpperCase();
  const q = searchParams.get("q")?.toUpperCase();
  const withDetails = searchParams.get("with_details") === "true";

  try {
    const allTickers = await fetchAllTickers();

    // 1. Single symbol lookup
    if (singleSymbol) {
      const hit = allTickers.find((t) => t.symbol === singleSymbol);
      if (!hit) {
        return NextResponse.json(
          { error: "Futures symbol not found" },
          { status: 404 }
        );
      }
      const detail = await fetchContractDetail(singleSymbol);
      return NextResponse.json({ success: true, ticker: hit, detail });
    }

    // 2. Comma-separated symbols lookup (Batch Mode)
    if (rawSymbols) {
      const requestedList = rawSymbols
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const symbolSet = new Set(requestedList);

      const matchedTickers = allTickers.filter((t) => symbolSet.has(t.symbol));
      const allDetails = await fetchAllContractDetails();
      const detailsMap: Record<string, FuturesDetail> = {};

      for (const sym of symbolSet) {
        if (allDetails[sym]) {
          detailsMap[sym] = allDetails[sym];
        }
      }

      return NextResponse.json({
        success: true,
        tickers: matchedTickers,
        details: detailsMap,
        count: matchedTickers.length,
      });
    }

    // 3. Search query lookup
    if (q) {
      const matches = allTickers
        .filter((t) => t.symbol.includes(q))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      return NextResponse.json({ success: true, tickers: matches, count: matches.length });
    }

    // 4. Default: all tickers (+ optional details)
    let detailsMap: Record<string, FuturesDetail> | undefined;
    if (withDetails) {
      detailsMap = await fetchAllContractDetails();
    }

    return NextResponse.json({
      success: true,
      tickers: allTickers,
      details: detailsMap,
      count: allTickers.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}