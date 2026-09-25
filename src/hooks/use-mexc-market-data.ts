"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FuturesTicker, FuturesDetail } from "@/app/api/mexc/futures/route";

export interface MexcMarketDataParams {
  symbols?: string[];
  refreshIntervalSec?: number;
  enableDetails?: boolean;
}

export interface MexcMarketDataState {
  tickers: FuturesTicker[];
  prices: Record<string, number | null>;
  details: Record<string, FuturesDetail>;
  loading: boolean;
  error: string | null;
  lastRefreshed: number | null;
  refreshIntervalSec: number;
  refetch: () => Promise<void>;
}

/**
 * Unified custom hook for polling MEXC futures ticker and contract detail data.
 * Used across Watchlist page, Trades page, and modally embedded views.
 * 
 * Key Features:
 *  - 1 Single API Request: Batches tickers and contract details in one payload.
 *  - Smart Tab Pause: Automatically pauses polling when document.hidden is true.
 *  - Graceful Fallback: Network errors preserve last-known price snapshots.
 */
export function useMexcMarketData({
  symbols,
  refreshIntervalSec = 10,
  enableDetails = true,
}: MexcMarketDataParams = {}): MexcMarketDataState {
  const [tickers, setTickers] = useState<FuturesTicker[]>([]);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [details, setDetails] = useState<Record<string, FuturesDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const cancelledRef = useRef(false);

  const fetchData = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);

    const trackedList = symbolsRef.current
      ?.map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    let url = "/api/mexc/futures";
    const params = new URLSearchParams();

    if (trackedList && trackedList.length > 0) {
      params.set("symbols", trackedList.join(","));
    } else if (enableDetails) {
      params.set("with_details", "true");
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        setError(`MEXC API error: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        tickers?: FuturesTicker[];
        details?: Record<string, FuturesDetail>;
      };

      if (cancelledRef.current) return;

      if (data.tickers && Array.isArray(data.tickers)) {
        setTickers(data.tickers);

        const nextPrices: Record<string, number | null> = {};
        for (const t of data.tickers) {
          if (typeof t.lastPrice === "number") {
            nextPrices[t.symbol.toUpperCase()] = t.lastPrice;
          }
        }

        // Preserve last known prices for any tracked symbol absent from this tick
        if (trackedList) {
          setPrices((prev) => {
            const merged = { ...prev, ...nextPrices };
            return merged;
          });
        } else {
          setPrices(nextPrices);
        }
      }

      if (data.details) {
        setDetails((prev) => ({ ...prev, ...data.details }));
      }

      setLastRefreshed(Date.now());
    } catch (err: unknown) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : "Fetch failed");
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [enableDetails]);

  // Initial fetch and smart polling interval with tab visibility pause
  useEffect(() => {
    cancelledRef.current = false;

    // Fetch immediately on mount / params change
    fetchData();

    const intervalMs = Math.max(1000, refreshIntervalSec * 1000);
    let timerId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!timerId) {
        timerId = setInterval(() => {
          if (document.hidden) return; // Skip tick when tab is inactive
          fetchData();
        }, intervalMs);
      }
    };

    const stopPolling = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    startPolling();

    // Listen to tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchData(); // Fetch immediately when coming back to tab
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelledRef.current = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, refreshIntervalSec]);

  return {
    tickers,
    prices,
    details,
    loading,
    error,
    lastRefreshed,
    refreshIntervalSec,
    refetch: fetchData,
  };
}
