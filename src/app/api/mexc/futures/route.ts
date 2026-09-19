import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FUTURES_BASE = "https://contract.mexc.com/api/v1/contract";

// Simple in-memory TTL cache to avoid hammering MEXC on every keystroke.
const cache: {
  data: unknown;
  fetchedAt: number;
} = { data: null, fetchedAt: 0 };

interface FuturesTicker {
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

interface FuturesDetail {
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

// Separate short cache for contract details keyed by symbol.
const detailCache: Record<string, { data: unknown; fetchedAt: number }> = {};
const DETAIL_TTL_MS = 60_000;

async function fetchContractDetail(symbol: string): Promise<FuturesDetail | null> {
  const cached = detailCache[symbol];
  if (cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS) {
    return cached.data as FuturesDetail | null;
  }

  const res = await fetch(
    `${FUTURES_BASE}/detail?symbol=${encodeURIComponent(symbol)}`,
    { cache: "no-store", signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { success: boolean; data: FuturesDetail };
  const out = json.success ? json.data : null;
  detailCache[symbol] = { data: out, fetchedAt: Date.now() };
  return out;
}

async function fetchAllTickers(): Promise<FuturesTicker[]> {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < TTL_MS) {
    return cache.data as FuturesTicker[];
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

  // Restrict to USDT-margined perpetual contracts (symbols are "XXX_USDT").
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
 *   ?symbol=BTC_USDT   -> single ticker for that symbol (404 if not found)
 *   ?q=BTC             -> search USDT perpetuals by symbol substring
 *   (no params)        -> all USDT perpetuals
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const q = searchParams.get("q")?.toUpperCase();

  try {
    const all = await fetchAllTickers();

    if (symbol) {
      const hit = all.find((t) => t.symbol === symbol);
      if (!hit) {
        return NextResponse.json(
          { error: "Futures symbol not found" },
          { status: 404 }
        );
      }
      const detail = await fetchContractDetail(symbol);
      return NextResponse.json({ ticker: hit, detail });
    }

    if (q) {
      const matches = all
        .filter((t) => t.symbol.includes(q))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      return NextResponse.json({ tickers: matches, count: matches.length });
    }

    return NextResponse.json({ tickers: all, count: all.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}