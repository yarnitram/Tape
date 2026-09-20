"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WatchlistItem } from "@/lib/types";
import { CoinDetailModal } from "./coin-detail-modal";
import { ModalShell } from "@/components/ui/modal-shell";

interface Props {
  initialItems: WatchlistItem[];
  refreshIntervalSec?: number;
}

interface Ticker {
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
  indexPrice: number;
  fundingRate: number;
}

const ORDER_KEY = "tape:watchlist-order";
const SORT_KEY = "tape:watchlist-sort";
const DETAILS_COLS_KEY = "tape:watchlist-details-cols";

type SortField = "coin" | "change" | "volume" | "price" | "trigger";
interface SortConfig {
  field: SortField;
  dir: "asc" | "desc";
}

const DEFAULT_SORT: SortConfig = { field: "coin", dir: "asc" };

const SORT_OPTIONS: { value: SortConfig; label: string }[] = [
  { value: { field: "coin", dir: "asc" }, label: "Coin (A–Z)" },
  { value: { field: "coin", dir: "desc" }, label: "Coin (Z–A)" },
  { value: { field: "change", dir: "desc" }, label: "24h % (high → low)" },
  { value: { field: "change", dir: "asc" }, label: "24h % (low → high)" },
  { value: { field: "volume", dir: "desc" }, label: "Volume (high → low)" },
  { value: { field: "volume", dir: "asc" }, label: "Volume (low → high)" },
  { value: { field: "price", dir: "desc" }, label: "Last price (high → low)" },
  { value: { field: "price", dir: "asc" }, label: "Last price (low → high)" },
  { value: { field: "trigger", dir: "desc" }, label: "Trigger (high → low)" },
  { value: { field: "trigger", dir: "asc" }, label: "Trigger (low → high)" },
];

function sortConfigKey(c: SortConfig): string {
  return `${c.field}:${c.dir}`;
}

function loadSort(): SortConfig {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (!raw) return DEFAULT_SORT;
    const parsed = JSON.parse(raw) as SortConfig;
    if (
      SORT_OPTIONS.some((o) => sortConfigKey(o.value) === sortConfigKey(parsed))
    ) {
      return parsed;
    }
    return DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function saveSort(c: SortConfig) {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/** Transform a symbol like "BTC_USDT" into a readable coin label "BTC". */
function cleanSymbol(s: string): string {
  return s.replace(/_USDT$/i, "");
}

function loadOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveOrder(ids: string[]) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function loadShowDetails(): boolean {
  try {
    const raw = localStorage.getItem(DETAILS_COLS_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function saveShowDetails(show: boolean) {
  try {
    localStorage.setItem(DETAILS_COLS_KEY, show ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function WatchlistClient({ initialItems, refreshIntervalSec = 10 }: Props) {
  // NOTE: initialize with the server-provided order only. Applying any saved
  // localStorage order must happen AFTER hydration (see effect below),
  // otherwise the server and client render different row orders and React
  // throws a hydration mismatch error.
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ticker[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sort configuration. NOTE: always initialized to the default so the server
  // and client render rows in the same order. The saved preference is applied
  // AFTER hydration in an effect (see the row-order effect), avoiding a
  // hydration mismatch from a non-default saved sort.
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);

  // Case-insensitive filter for filtering the saved coins by symbol.
  const [filter, setFilter] = useState("");

  // Whether the optional order-type / trigger-added / fired-at columns show.
  // NOTE: always initialize to `true` so the server and client render the same
  // initial columns. The persisted preference is applied AFTER hydration in an
  // effect below (see the row-order effect), avoiding a hydration mismatch.
  const [showDetails, setShowDetails] = useState<boolean>(true);

  // Live tickers keyed by symbol for all saved coins.
  const [live, setLive] = useState<Record<string, Ticker>>({});
  // Coin icons keyed by symbol (e.g., "BTC_USDT" -> icon URL).
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    symbol: string;
    item: WatchlistItem | null;
  } | null>(null);
  // Id of the row currently awaiting delete confirmation (or null).
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  // Pagination state. pageSize is one of 10/20/50/100, or Infinity for "All".
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const symbolsToTrack = useMemo(
    () => items.map((i) => i.symbol.toUpperCase()),
    [items]
  );

  // Rows in display order: actively sorted if the user picked a non-default
  // option, otherwise the stored drag-and-drop order.
  const sortedItems = useMemo(() => {
    const active =
      sortConfigKey(sort) !== sortConfigKey(DEFAULT_SORT);
    if (!active) return items;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      const aT = live[aSym];
      const bT = live[bSym];
      switch (sort.field) {
        case "coin":
          return aSym.localeCompare(bSym) * dir;
        case "change":
          return ((aT?.riseFallRate ?? 0) - (bT?.riseFallRate ?? 0)) * dir;
        case "volume":
          return ((aT?.amount24 ?? 0) - (bT?.amount24 ?? 0)) * dir;
        case "price":
          return ((aT?.lastPrice ?? 0) - (bT?.lastPrice ?? 0)) * dir;
        case "trigger": {
          const aV = a.trigger_price ?? Number.NEGATIVE_INFINITY;
          const bV = b.trigger_price ?? Number.NEGATIVE_INFINITY;
          return (aV - bV) * dir;
        }
        default:
          return 0;
      }
    });
  }, [items, sort, live]);

  // Rows after applying the client-side filter (search). Composes with sort:
  // filter first, then the result still goes through sortedItems' ordering.
  const filteredItems = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return sortedItems;
    return sortedItems.filter((i) =>
      i.symbol.toUpperCase().includes(q)
    );
  }, [sortedItems, filter]);

  // ---- Pagination ----
  const total = filteredItems.length;
  const hasPaging = Number.isFinite(pageSize);
  const pageCount = hasPaging ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = hasPaging ? Math.min(page, pageCount - 1) : 0;
  const pageItems = useMemo(() => {
    if (!hasPaging) return filteredItems;
    return filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);
  }, [filteredItems, pageSize, safePage, hasPaging]);

  // Apply any previously saved row order, but ONLY after hydration so the
  // server and client render the same initial rows (avoids hydration
  // mismatch). setTimeout defers the state update out of the effect body.
  useEffect(() => {
    const order = loadOrder();
    if (!order || order.length === 0) return;
    const t = setTimeout(() => {
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]));
        const ordered = order
          .map((id) => byId.get(id))
          .filter((x): x is WatchlistItem => !!x);
        const missing = prev.filter((i) => !order.includes(i.id));
        return [...ordered, ...missing];
      });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Apply the saved column-visibility preference ONLY after hydration, so the
  // server and client render the same initial columns (avoids a hydration
  // mismatch when a saved value differs from the initial `true`).
  useEffect(() => {
    const t = setTimeout(() => setShowDetails(loadShowDetails()), 0);
    return () => clearTimeout(t);
  }, []);

  // Apply the saved sort AFTER hydration so the server and client render the
  // same initial row order (avoids a hydration mismatch from a non-default
  // saved sort). `loadSort()` already falls back to the default when invalid.
  useEffect(() => {
    const t = setTimeout(() => setSort(loadSort()), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (symbolsToTrack.length === 0) return;
    let cancelled = false;
    const intervalMs = Math.max(
      1000,
      (Number(refreshIntervalSec) || 10) * 1000
    );

    async function refresh() {
      try {
        const data = await fetch(`/api/mexc/futures`).then((r) => r.json());
        if (cancelled || !data.tickers) return;
        const map: Record<string, Ticker> = {};
        for (const t of data.tickers as Ticker[]) {
          if (symbolsToTrack.includes(t.symbol)) map[t.symbol] = t;
        }
        setLive(map);

        // ---- Check armed price triggers and fire alerts ----
        // Use `items` (state) for trigger config and the freshly fetched `map`
        // for current prices. Firing is client-side on the watchlist page poll.
        const toFire = items.filter((i) => {
          if (i.alert_fired) return false;
          if (i.trigger_price == null || i.trigger_direction == null) return false;
          const t = map[i.symbol.toUpperCase()];
          if (!t) return false;
          const tp = i.trigger_price;
          if (i.trigger_direction === "above" && t.lastPrice >= tp) return true;
          if (i.trigger_direction === "below" && t.lastPrice <= tp) return true;
          return false;
        });

        for (const item of toFire) {
          const nowIso = new Date().toISOString();
          const sym = item.symbol.toUpperCase();
          const triggerPrice = item.trigger_price as number;
          const lastPrice = map[sym]?.lastPrice ?? 0;
          try {
            // Persist fired state so it doesn't re-fire.
            await fetch(`/api/watchlist/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alert_fired: true, alert_fired_at: nowIso }),
            }).catch(() => {});
            // Dispatch across all channels: in-app notification (bell +
            // /notifications) + Discord webhook + desktop toast, based on the
            // user's settings.
            await fetch(`/api/alerts/fire`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "watchlist_trigger",
                title: `${cleanSymbol(sym)} hit your trigger`,
                message: `Last ${fmtPx(lastPrice)} reached your ${fmtPx(triggerPrice)} trigger.`,
                link: "/watchlist",
              }),
            }).catch(() => {});
          } catch {
            // ignore per-item failures; other alerts still process
          }
          // Reflect fired state in local rows immediately (avoid re-firing).
          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id ? { ...x, alert_fired: true, alert_fired_at: nowIso } : x
            )
          );
        }
      } catch {
        // keep last known data on failure
      }
    }

    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsToTrack.join(","), items, refreshIntervalSec]);

  // Fetch coin icons for all tracked symbols.
  useEffect(() => {
    if (symbolsToTrack.length === 0) return;
    let cancelled = false;

    async function fetchIcons() {
      try {
        const results = await Promise.all(
          symbolsToTrack.map(async (sym) => {
            const res = await fetch(`/api/mexc/futures?symbol=${encodeURIComponent(sym)}`);
            if (!res.ok) return { symbol: sym, iconUrl: null };
            const data = await res.json();
            return { symbol: sym, iconUrl: data.detail?.baseCoinIconUrl ?? null };
          })
        );
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const r of results) {
            if (r.iconUrl) map[r.symbol] = r.iconUrl;
          }
          setIcons(map);
        }
      } catch {
        // keep last known icons on failure
      }
    }

    fetchIcons();
    // Refresh icons less frequently (every 5 minutes) since they rarely change.
    const id = setInterval(fetchIcons, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbolsToTrack]);

  // Accepts either a concrete array or an updater function.
  const setItemsAndOrder = (
    next: WatchlistItem[] | ((prev: WatchlistItem[]) => WatchlistItem[])
  ) => {
    setItems((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      // Persist order to localStorage once we know the result.
      queueMicrotask(() => saveOrder(resolved.map((i) => i.id)));
      return resolved;
    });
  };

  async function doSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
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

  function handleQuery(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(e.target.value), 300);
  }

  async function addCoin(symbol: string) {
    setNote(null);
    const sym = symbol.toUpperCase();
    setQuery("");
    setResults(null);

    // If the coin is already saved, don't add a duplicate — just open the
    // existing item so the user can review/update its alert & trade plan.
    const existing = items.find((i) => i.symbol.toUpperCase() === sym);
    if (existing) {
      setDetails({ symbol: existing.symbol.toUpperCase(), item: existing });
      return;
    }

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add");
      }
      const { item } = await res.json();
      setItemsAndOrder([...items, item]);
      setNote(`Added ${cleanSymbol(sym)} to watchlist.`);
      // Open the detail modal right away so the user can set the price
      // trigger and trade plan without hunting for the Modify button.
      setDetails({ symbol: item.symbol.toUpperCase(), item });
    } catch (err) {
      setSearchError((err as Error).message);
    }
  }

  async function removeCoin(id: string) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setItemsAndOrder(items.filter((i) => i.id !== id));
    setConfirmRemove(null);
  }

  // Reload the saved list after an alert/trade-plan save so the row reflects
  // the updated trigger state.
  async function reloadItems() {
    try {
      const res = await fetch(`/api/watchlist`);
      if (!res.ok) return;
      const data = await res.json();
      setItemsAndOrder((data.items ?? []) as WatchlistItem[]);
    } catch {
      /* ignore */
    }
  }

  // ---- Drag & drop reorder (front-end only) ----
  const reorderDrop = (targetId: string) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId) return;
    setItemsAndOrder((prev) => {
      const from = prev.findIndex((i) => i.id === fromId);
      const to = prev.findIndex((i) => i.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      const insertAt = from < to ? to : to;
      next.splice(insertAt, 0, moved);
      return next;
    });
  };

  // ---- Render helpers ----
  const inputCls =
    "hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent";

  function changeClass(v: number): string {
    return v >= 0 ? "text-gain" : "text-loss";
  }
  function fmtPct(f: number): string {
    return `${f >= 0 ? "+" : ""}${(f * 100).toFixed(2)}%`;
  }
  function fmtPx(p: number): string {
    if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 1 });
    if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 3 });
    return p.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  function fmtUsd(v: number): string {
    return compact(v);
  }

  // Render one EP/SL/TP value, or a muted "—" when unset.
  function fmtPlanVal(v: number | null | undefined): ReactNode {
    return v != null ? fmtPx(v) : <span className="text-muted">—</span>;
  }

  const ORDER_TYPE_LABELS: Record<string, string> = {
    limit: "Limit",
    trigger_limit: "Trigger Limit",
    market: "Market",
  };

  // Render an ISO timestamp as full-numeric date on top, time below (SGT / GMT+8).
  function fmtDateTime(iso: string | null | undefined): ReactNode {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    // Format in Singapore time (GMT+8).
    const sgTime = d.toLocaleTimeString("en-SG", {
      timeZone: "Asia/Singapore",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const sgDate = d.toLocaleDateString("en-SG", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className="num">{sgDate}</span>
        <span className="num text-[10px] text-muted">{sgTime}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Market radar</p>
          <h1 className="text-2xl font-semibold mb-1">Futures watchlist</h1>
          <p className="text-sm text-muted">
            MEXC USDT-perpetual coins · live data · {items.length} saved
          </p>
        </div>
        <div className="flex flex-col gap-1 relative">
          <span className="text-xs text-muted">Search MEXC futures</span>
          <input
            className={`${inputCls} w-64`}
            value={query}
            onChange={handleQuery}
            placeholder="e.g. BTC, SOL, DOGE…"
          />
          {searching && (
            <span className="absolute -bottom-4 text-xs text-muted">
              searching…
            </span>
          )}

          {results !== null && query.trim() !== "" && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-72 overflow-auto bg-panel border border-line shadow-lg">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">
                  {searchError || "No matches"}
                </div>
              ) : (
                results.slice(0, 25).map((t) => (
                  <button
                    key={t.symbol}
                    type="button"
                    onClick={() => addCoin(t.symbol)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-paper cursor-pointer"
                  >
                    <span className="font-medium">{cleanSymbol(t.symbol)}</span>
                    <span className="num text-xs text-muted">
                      {fmtPx(t.lastPrice)}{" "}
                      <span className={changeClass(t.riseFallRate)}>
                        {fmtPct(t.riseFallRate)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {note && <div className="text-sm text-gain">{note}</div>}
      {searchError && !query && (
        <div className="text-sm text-loss">{searchError}</div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Search</span>
            <input
              className="hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent w-44"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              placeholder="Filter saved coins…"
            />
          </label>
          <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none" title="Toggle order details columns">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => {
                const next = e.target.checked;
                setShowDetails(next);
                saveShowDetails(next);
              }}
              className="accent-accent cursor-pointer"
            />
            Toggle
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Sort by</span>
            <select
              className="hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent cursor-pointer"
              value={sortConfigKey(sort)}
              onChange={(e) => {
                const next = SORT_OPTIONS.find(
                  (o) => sortConfigKey(o.value) === e.target.value
                );
                if (next) {
                  setSort(next.value);
                  saveSort(next.value);
                }
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={sortConfigKey(o.value)} value={sortConfigKey(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Rows per page</span>
            <select
              className="hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent cursor-pointer"
              value={hasPaging ? String(pageSize) : "all"}
              onChange={(e) => {
                const v = e.target.value;
                setPageSize(v === "all" ? Number.POSITIVE_INFINITY : Number(v));
                setPage(0);
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </label>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="hairline text-muted p-10 text-center text-sm">
          No coins saved yet. Search a MEXC futures coin above to add it.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="hairline text-muted p-10 text-center text-sm">
          No saved coins match “{filter}”. Try a different search.
        </div>
      ) : (
        <>
          <div className="hairline overflow-x-auto rounded-xl bg-panel/40 striped">
          <table className="w-full text-sm border-collapse min-w-[1240px]">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide hairline-b">
                <th className="px-2 py-2.5 w-8"></th>
                <th className="px-2 py-2.5 w-10"></th>
                <th className="px-3 py-2.5">Coin</th>
                <th className="px-3 py-2.5 text-right">24h %</th>
                <th className="px-3 py-2.5 text-right">Volume (24h)</th>
                <th className="px-3 py-2.5 text-right">Last Price</th>
                <th className="px-3 py-2.5 text-right">Trigger</th>
                <th className="px-3 py-2.5 text-center">EP / SL / TP</th>
                {showDetails && (
                  <th className="px-3 py-2.5 text-right">Order type</th>
                )}
                {showDetails && (
                  <>
                    <th className="px-3 py-2.5">Trigger added</th>
                    <th className="px-3 py-2.5">Fired at</th>
                  </>
                )}
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((i) => {
                const sym = i.symbol.toUpperCase();
                const t = live[sym];
                return (
                  <tr
                    key={i.id}
                    draggable
                    onDragStart={() => {
                      dragIdRef.current = i.id;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorderDrop(i.id);
                    }}
                    onDragEnd={() => {
                      dragIdRef.current = null;
                    }}
                    className="hairline-b hover:bg-paper transition-colors"
                  >
                    <td className="px-2 py-2.5 cursor-grab text-muted select-none" title="Drag to reorder">
                      <span className="inline-block cursor-grab">⋮⋮</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {icons[sym] && (
                        <img
                          src={icons[sym]}
                          alt={cleanSymbol(sym)}
                          className="h-5 w-5 rounded-full object-contain inline-block"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setDetails({ symbol: sym, item: i })}
                        className="text-left group"
                        title={`View ${cleanSymbol(sym)} details`}
                      >
                        <span className="font-medium group-hover:text-accent group-hover:underline">
                          {cleanSymbol(sym)}
                        </span>
                        <span className="text-xs text-muted ml-1 block">
                          {sym.replace("_USDT", "")}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 num">
                      {t ? (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono tabular-nums ${
                            t.riseFallRate >= 0
                              ? "bg-gain/10 text-gain"
                              : "bg-loss/10 text-loss"
                          }`}
                        >
                          {fmtPct(t.riseFallRate)}
                        </span>
                      ) : (
                        "…"
                      )}
                    </td>
                    <td className="px-3 py-2.5 num">
                      {t ? fmtUsd(t.amount24) : "…"}
                    </td>
                    <td className="px-3 py-2.5 num">
                      {t ? fmtPx(t.lastPrice) : "…"}
                    </td>
                    <td className="px-3 py-2.5 num text-muted">
                      {i.trigger_price != null ? fmtPx(i.trigger_price) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5 text-center font-mono tabular-nums leading-tight">
                        <span className="whitespace-nowrap">
                          <span className="text-[10px] text-muted">EP: </span>
                          <span>{fmtPlanVal(i.entry_price)}</span>
                        </span>
                        <span className="whitespace-nowrap">
                          <span className="text-[10px] text-muted">SL: </span>
                          <span>{fmtPlanVal(i.stop_loss)}</span>
                        </span>
                        <span className="whitespace-nowrap">
                          <span className="text-[10px] text-muted">TP: </span>
                          <span>{fmtPlanVal(i.take_profit)}</span>
                        </span>
                      </div>
                    </td>
                    {showDetails && (
                      <td className="px-3 py-2.5 num text-right">
                        {i.order_type ? (
                          ORDER_TYPE_LABELS[i.order_type] ?? i.order_type
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    {showDetails && (
                      <td className="px-3 py-2.5 num text-muted whitespace-nowrap text-center">
                        {i.trigger_price != null
                          ? fmtDateTime(i.trigger_created_at)
                          : "—"}
                      </td>
                    )}
                    {showDetails && (
                      <td className="px-3 py-2.5 num text-muted whitespace-nowrap text-center">
                        {i.alert_fired ? fmtDateTime(i.alert_fired_at) : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs text-center">
                      {i.alert_fired ? (
                        <span className="inline-flex items-center rounded-md bg-loss/10 px-2 py-0.5 text-xs font-semibold font-mono text-loss">
                          ● Triggered
                        </span>
                      ) : i.trigger_price != null ? (
                        <span className="inline-flex items-center rounded-md bg-gain/10 px-2 py-0.5 text-xs font-semibold font-mono text-gain">
                          ● Ongoing
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setDetails({ symbol: sym, item: i })}
                        className="text-accent hover:underline text-xs mr-3 cursor-pointer"
                        title="View details"
                      >
                        Modify
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(i.id)}
                        className="text-loss hover:underline text-xs cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasPaging && (
          <div className="flex items-center justify-center gap-4 text-xs text-muted mt-3">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-ghost px-3 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="num">
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="btn-ghost px-3 py-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}

      <p className="text-xs text-muted">
        Live data refreshes every {refreshIntervalSec}s from the MEXC contract
        (futures) API. Drag <span className="inline-block">⋮⋮</span> to reorder
        rows (default order is saved locally), or use the sort picker to view by
        24h %, volume, price, or trigger.
      </p>

      {details && (
        <CoinDetailModal
          symbol={details.symbol}
          item={details.item}
          onClose={() => setDetails(null)}
          onSaved={reloadItems}
        />
      )}

      {confirmRemove && (() => {
        const pending = items.find((x) => x.id === confirmRemove);
        if (!pending) return null;
        const sym = pending.symbol.toUpperCase();
        return (
          <ModalShell
            title={`Remove ${cleanSymbol(sym)}?`}
            onClose={() => setConfirmRemove(null)}
            maxWidth="max-w-sm"
            center
          >
            <p className="text-sm">
              Remove <span className="font-medium">{cleanSymbol(sym)}</span> from
              your watchlist? This won&apos;t affect any live alert status.
            </p>
            <div className="flex justify-end gap-2 hairline-t pt-4 mt-4">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="px-3 py-2 text-sm btn-ghost cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeCoin(pending.id)}
                className="px-4 py-2 text-sm font-semibold bg-loss text-panel rounded-md cursor-pointer"
              >
                Remove
              </button>
            </div>
          </ModalShell>
        );
      })()}
    </div>
  );
}

function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}