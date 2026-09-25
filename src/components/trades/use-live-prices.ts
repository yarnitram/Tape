"use client";

import { useMexcMarketData } from "@/hooks/use-mexc-market-data";
import type { FuturesDetail } from "@/app/api/mexc/futures/route";

export interface Ticker {
  symbol: string;
  lastPrice: number;
}

export interface LivePricesState {
  prices: Record<string, number | null>;
  details: Record<string, FuturesDetail>;
  loading: boolean;
  error: string | null;
  lastRefreshed: number | null;
  refreshIntervalSec: number;
}

/**
 * Custom hook wrapping useMexcMarketData for the /trades page.
 * Provides prices map and contract details for sizing and UPNL calculations.
 */
export function useLivePrices(
  symbols: string[],
  refreshIntervalSec = 10
): LivePricesState {
  const data = useMexcMarketData({
    symbols,
    refreshIntervalSec,
    enableDetails: true,
  });

  return {
    prices: data.prices,
    details: data.details,
    loading: data.loading,
    error: data.error,
    lastRefreshed: data.lastRefreshed,
    refreshIntervalSec: data.refreshIntervalSec,
  };
}

export function formatLastRefreshed(ts: number | null): string {
  if (ts == null) return "—";
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
