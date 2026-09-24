"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Minimal ticker shape from GET /api/mexc/futures.
 * We only need the symbol and last price for the trades table.
 */
export interface Ticker {
  symbol: string;
  lastPrice: number;
}

/**
 * Return shape of useLivePrices.
 */
export interface LivePricesState {
  /** Last price keyed by symbol (e.g. "BTC_USDT" → 64123.5), or null when unset. */
  prices: Record<string, number | null>;
  /** True while the first poll is in flight after mount (show the Live pill). */
  loading: boolean;
  /** Most recent poll error, if any. Null when the last poll succeeded. */
  error: string | null;
  /** Timestamp of the last successful price refresh (ms since epoch). */
  lastRefreshed: number | null;
  /** Human-readable refresh interval, for the footer note. */
  refreshIntervalSec: number;
}

/**
 * Custom hook that polls the MEXC futures ticker REST endpoint and keeps a
 * symbol → last-price map live. Prices feed LP and UPNL on the /trades page.
 *
 * Design notes (matching the Watchlist page behaviour):
 *  - REST fallback: fetches /api/mexc/futures on a fixed interval. A WS stream
 *    (Option A) is intentionally not used here — the REST endpoint is cached
 *    server-side for 5s, so polling is cheap and keeps the trades page simple.
 *  - The Live pill is shown once the first poll lands and stays while polling.
 *  - Errors are captured but non-fatal: prices are cosmetic, so a failed poll
 *    keeps the last known snapshot rather than clearing the table.
 *  - The refresh interval is configurable via `refreshIntervalSec` (default 10s).
 */
export function useLivePrices(
  symbols: string[],
  refreshIntervalSec = 10
): LivePricesState {
  // Symbols currently being tracked (sorted so the effect deps are stable).
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  // In-flight flag so a stale interval callback can't write after unmount.
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    cancelledRef.current = false;

    // Reset loading on the first call after mount / symbol change.
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mexc/futures", {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        setError(`MEXC futures error: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json() as { success: boolean; tickers?: Ticker[] };
      if (!data.tickers) {
        setError("MEXC futures returned no tickers");
        setLoading(false);
        return;
      }

      // Build a map of the symbols we care about.
      const next: Record<string, number | null> = {};
      const tracked = new Set(symbolsRef.current.map((s) => s.toUpperCase()));
      for (const t of data.tickers) {
        if (tracked.has(t.symbol.toUpperCase()) && typeof t.lastPrice === "number") {
          next[t.symbol.toUpperCase()] = t.lastPrice;
        }
      }

      // Preserve any previously-seen symbols that weren't in this response
      // (e.g. a coin that left the markets). Don't clear them to null unless
      // the user explicitly removed the row.
      for (const sym of tracked) {
        if (!(sym in next)) {
          next[sym] = prices[sym] ?? null;
        }
      }

      setPrices(next);
      setLastRefreshed(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [prices]);

  // Initial fetch + polling interval.
  useEffect(() => {
    cancelledRef.current = false;

    // Fetch once on mount.
    refresh();

    // Then poll on the configured interval.
    const intervalMs = Math.max(1000, refreshIntervalSec * 1000);
    const id = setInterval(refresh, intervalMs);

    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [refresh, refreshIntervalSec]);

  return {
    prices,
    loading,
    error,
    lastRefreshed,
    refreshIntervalSec,
  };
}

/**
 * Format a last-refreshed timestamp into a short relative label like "2s ago".
 */
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
