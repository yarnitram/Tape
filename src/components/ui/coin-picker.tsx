"use client";

import { useEffect, useRef, useState } from "react";
import { cleanSymbol, fmtPx, fmtPct } from "@/lib/format";

export interface SelectedCoin {
  symbol: string; // e.g. "BTC_USDT" or "SPY"
  label: string; // e.g. "BTC" or "SPY"
  lastPrice?: number;
  riseFallRate?: number;
  iconUrl?: string;
  isCustom?: boolean;
}

interface TickerResult {
  symbol: string;
  lastPrice: number;
  riseFallRate: number;
  amount24?: number;
}

export interface CoinPickerProps {
  selectedCoin: SelectedCoin | null;
  onSelectCoin: (coin: SelectedCoin) => void;
  onClearCoin: () => void;
  placeholder?: string;
  allowCustomSymbol?: boolean;
  icons?: Record<string, string>;
  className?: string;
  autoFocus?: boolean;
}

export const POPULAR_TOKENS = [
  "BTC",
  "ETH",
  "SOL",
  "DOGE",
  "XRP",
  "SUI",
  "PEPE",
  "NEAR",
  "AVAX",
  "BNB",
];

export function CoinPicker({
  selectedCoin,
  onSelectCoin,
  onClearCoin,
  placeholder = "Search MEXC futures (e.g. BTC, ETH, SOL)...",
  allowCustomSymbol = false,
  icons = {},
  className = "",
  autoFocus = false,
}: CoinPickerProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TickerResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !selectedCoin) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [autoFocus, selectedCoin]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function searchMexc(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/mexc/futures?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.tickers ?? []);
    } catch (err) {
      setSearchError((err as Error).message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMexc(val), 250);
  }

  async function handleSelectChip(token: string) {
    const fullSym = token.includes("_") ? token.toUpperCase() : `${token.toUpperCase()}_USDT`;
    try {
      const res = await fetch(`/api/mexc/futures?symbol=${encodeURIComponent(fullSym)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ticker) {
          handleSelectTicker(data.ticker, data.detail?.baseCoinIconUrl);
          return;
        }
      }
    } catch {
      // fallback to search
    }
    setQuery(token);
    searchMexc(token);
  }

  async function handleSelectTicker(t: TickerResult, directIconUrl?: string) {
    const sym = t.symbol.toUpperCase();
    const label = cleanSymbol(sym);
    const iconUrl = directIconUrl || icons[sym];

    onSelectCoin({
      symbol: sym,
      label,
      lastPrice: t.lastPrice,
      riseFallRate: t.riseFallRate,
      iconUrl,
      isCustom: false,
    });
    setQuery("");
    setResults(null);

    // If icon is not available yet, fetch contract detail in background to populate it
    if (!iconUrl) {
      try {
        const res = await fetch(`/api/mexc/futures?symbol=${encodeURIComponent(sym)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.detail?.baseCoinIconUrl) {
            onSelectCoin({
              symbol: sym,
              label,
              lastPrice: t.lastPrice,
              riseFallRate: t.riseFallRate,
              iconUrl: data.detail.baseCoinIconUrl,
              isCustom: false,
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  function handleSelectCustom() {
    const clean = query.trim().toUpperCase();
    if (!clean) return;
    onSelectCoin({
      symbol: clean,
      label: clean,
      isCustom: true,
    });
    setQuery("");
    setResults(null);
  }

  // If a coin is already selected, render the Selected Coin Card Banner
  if (selectedCoin) {
    const sym = selectedCoin.symbol.toUpperCase();
    const label = selectedCoin.label || cleanSymbol(sym);
    const iconUrl = selectedCoin.iconUrl || icons[sym];
    const lastPrice = selectedCoin.lastPrice;
    const hasPrice = lastPrice != null && lastPrice > 0;

    return (
      <div
        className={`p-3.5 rounded-xl bg-panel-soft/60 border border-line flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={label}
              draggable={false}
              className="w-9 h-9 rounded-full object-contain shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-panel border border-line flex items-center justify-center font-mono font-bold text-xs text-muted shrink-0">
              {label.slice(0, 2)}
            </div>
          )}
          <div className="flex flex-col leading-tight min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text text-base truncate">
                {label}
              </span>
              <span className="text-[10px] font-mono text-muted uppercase">
                {selectedCoin.isCustom ? "Custom Asset" : "USDT Perpetual"}
              </span>
            </div>
            {hasPrice && (
              <div className="flex items-center gap-2 mt-0.5 text-xs font-mono">
                <span className="text-text font-semibold">
                  {fmtPx(lastPrice)}
                </span>
                {selectedCoin.riseFallRate != null && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums ${
                      selectedCoin.riseFallRate >= 0
                        ? "bg-gain/15 text-gain"
                        : "bg-loss/15 text-loss"
                    }`}
                  >
                    {fmtPct(selectedCoin.riseFallRate)} 24h
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClearCoin();
            setQuery("");
            setResults(null);
          }}
          className="text-xs font-medium text-accent hover:underline px-2.5 py-1.5 rounded-lg bg-panel hover:bg-panel-soft border border-line transition-colors cursor-pointer shrink-0"
        >
          Change Coin
        </button>
      </div>
    );
  }

  // Search & Discovery View
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-panel-soft/80 border border-line text-text placeholder:text-muted/60 text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              searchInputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-text cursor-pointer"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Trending Chips */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
          Quick Select Popular Markets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => handleSelectChip(token)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer border bg-panel-soft/60 hover:bg-accent/15 hover:border-accent/40 hover:text-accent text-muted border-line"
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* Results Dropdown Container */}
      {(searching || results || (allowCustomSymbol && query.trim())) && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted tracking-wider px-1">
            <span>
              {searching
                ? "Searching MEXC..."
                : results
                ? `${results.length} Markets Found`
                : "Results"}
            </span>
            <span>MEXC Futures</span>
          </div>

          <div className="hairline rounded-xl bg-panel/30 max-h-56 overflow-y-auto divide-y divide-line">
            {/* Custom symbol option when allowCustomSymbol is true */}
            {allowCustomSymbol && query.trim() && (
              <div
                onClick={handleSelectCustom}
                className="p-3 flex items-center justify-between gap-3 hover:bg-panel-soft/70 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                    +
                  </div>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="font-bold text-accent text-sm truncate">
                      Use &ldquo;{query.trim().toUpperCase()}&rdquo;
                    </span>
                    <span className="font-mono text-[10px] text-muted truncate">
                      Custom Asset / Equity / Forex
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-accent/15 border border-accent/25 text-accent group-hover:bg-accent group-hover:text-panel transition-colors">
                  Select Custom
                </span>
              </div>
            )}

            {searching ? (
              <div className="p-6 text-center text-muted font-mono flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Searching MEXC live futures...</span>
              </div>
            ) : searchError ? (
              <div className="p-4 text-center text-loss text-xs">
                {searchError}
              </div>
            ) : results && results.length === 0 ? (
              <div className="p-6 text-center text-muted flex flex-col gap-1">
                <span className="font-semibold text-text">No matches found</span>
                <span className="text-muted text-[11px]">
                  No MEXC futures contracts match &ldquo;{query}&rdquo;.
                </span>
              </div>
            ) : results ? (
              results.map((t) => {
                const sym = t.symbol.toUpperCase();
                const label = cleanSymbol(sym);
                const iconUrl = icons[sym];

                return (
                  <div
                    key={t.symbol}
                    onClick={() => handleSelectTicker(t)}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-panel-soft/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={label}
                          draggable={false}
                          className="w-6 h-6 rounded-full object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-panel-soft border border-line flex items-center justify-center font-mono font-bold text-[10px] text-muted shrink-0">
                          {label.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-text text-sm group-hover:text-accent transition-colors truncate">
                          {label}
                        </span>
                        <span className="font-mono text-[10px] text-muted truncate">
                          {sym.replace("_USDT", "")} · USDT Perpetual
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end leading-tight">
                        <span className="font-mono font-medium text-text text-xs">
                          {fmtPx(t.lastPrice)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-medium tabular-nums ${
                            t.riseFallRate >= 0
                              ? "bg-gain/10 text-gain"
                              : "bg-loss/10 text-loss"
                          }`}
                        >
                          {fmtPct(t.riseFallRate)}
                        </span>
                      </div>
                      <span className="accent-btn px-2.5 py-1 text-xs font-semibold rounded-lg">
                        Select
                      </span>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
