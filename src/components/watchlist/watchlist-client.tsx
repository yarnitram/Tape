"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WatchlistItem, TriggeredWatchlistItem } from "@/lib/types";
import { cleanSymbol, fmtPx, fmtPct, fmtPlanPx } from "@/lib/format";
import { CoinDetailModal } from "./coin-detail-modal";
import { ModalShell } from "@/components/ui/modal-shell";
import { WatchlistToolbar } from "./watchlist-toolbar";
import { WatchlistTable } from "./watchlist-table";
import { WatchlistTriggeredTab } from "./watchlist-triggered-tab";
import type { ColKey, SortConfig, Ticker } from "./watchlist-types";
import {
  DEFAULT_COLS,
  DEFAULT_SORT,
  loadCols,
  loadSort,
  saveCols,
  saveSort,
} from "./watchlist-types";

// ---- Component props ----

interface Props {
  initialItems: WatchlistItem[];
  initialTriggeredItems?: TriggeredWatchlistItem[];
  refreshIntervalSec?: number;
}

// ---- Main component ----

export function WatchlistClient({
  initialItems,
  initialTriggeredItems = [],
  refreshIntervalSec = 10,
}: Props) {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);
  const [triggeredItems, setTriggeredItems] = useState<TriggeredWatchlistItem[]>(
    initialTriggeredItems
  );
  const [activeTab, setActiveTab] = useState<"active" | "triggered">("active");

  // ---- Search state ----
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ticker[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Sort ----
  // NOTE: always initialized to the default so the server and client render
  // rows in the same order. The saved preference is applied AFTER hydration.
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);

  // ---- Filter (client-side coin search within saved items) ----
  const [filter, setFilter] = useState("");

  // ---- Column visibility ----
  // NOTE: always initialized to DEFAULT_COLS (all visible) for the same
  // hydration-safety reason as sort above.
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);

  // ---- Live data + icons ----
  const [live, setLive] = useState<Record<string, Ticker>>({});
  const [icons, setIcons] = useState<Record<string, string>>({});

  // ---- UI state ----
  const [note, setNote] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    symbol: string;
    item: WatchlistItem | null;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // ---- Pagination ----
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // ---- Derived data ----

  const symbolsToTrack = useMemo(
    () => Array.from(new Set(items.map((i) => i.symbol.toUpperCase()))),
    [items]
  );

  const sortedItems = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      const aT = live[aSym];
      const bT = live[bSym];
      switch (sort.field) {
        case "status": {
          // Triggered â†’ Ongoing (trigger set, not fired) â†’ None.
          const rank = (x: WatchlistItem) =>
            x.alert_fired ? 0 : x.trigger_price != null ? 1 : 2;
          const byStatus = rank(a) - rank(b);
          return byStatus !== 0 ? byStatus : aSym.localeCompare(bSym);
        }
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

  const filteredItems = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return sortedItems;
    return sortedItems.filter((i) => i.symbol.toUpperCase().includes(q));
  }, [sortedItems, filter]);

  const total = filteredItems.length;
  const hasPaging = Number.isFinite(pageSize);
  const pageCount = hasPaging ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = hasPaging ? Math.min(page, pageCount - 1) : 0;

  const pageItems = useMemo(() => {
    if (!hasPaging) return filteredItems;
    return filteredItems.slice(safePage * pageSize, (safePage + 1) * pageSize);
  }, [filteredItems, pageSize, safePage, hasPaging]);

  // ---- Effects: hydrate preferences after mounting ----

  // Apply the saved column visibility ONLY after hydration to avoid a
  // server/client mismatch when the saved value differs from the default.
  useEffect(() => {
    const t = setTimeout(() => setCols(loadCols()), 0);
    return () => clearTimeout(t);
  }, []);

  // Apply the saved sort AFTER hydration for the same reason.
  useEffect(() => {
    const t = setTimeout(() => setSort(loadSort()), 0);
    return () => clearTimeout(t);
  }, []);

  // ---- Effect: live ticker polling + alert firing ----

  useEffect(() => {
    let cancelled = false;
    const intervalMs = Math.max(
      1000,
      (Number(refreshIntervalSec) || 10) * 1000
    );

    async function refresh() {
      try {
        // Also sync triggered items in background
        fetch("/api/triggered-watchlist")
          .then((r) => r.json())
          .then((data) => {
            if (!cancelled && data?.items) {
              setTriggeredItems(data.items as TriggeredWatchlistItem[]);
            }
          })
          .catch(() => {});

        if (symbolsToTrack.length === 0) return;

        const data = await fetch(`/api/mexc/futures`).then((r) => r.json());
        if (cancelled || !data.tickers) return;
        const map: Record<string, Ticker> = {};
        for (const t of data.tickers as Ticker[]) {
          if (symbolsToTrack.includes(t.symbol)) map[t.symbol] = t;
        }
        setLive(map);

        // ---- Check armed price triggers and fire alerts ----
        const toFire = items.filter((i) => {
          if (i.alert_fired) return false;
          if (i.trigger_price == null || i.trigger_direction == null)
            return false;
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
            // Atomic claim on watchlist row
            const res = await fetch(`/api/watchlist/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                alert_fired: true,
                alert_fired_at: nowIso,
              }),
            });
            const claimed = await res
              .json()
              .then((j) => j?.claimed !== false)
              .catch(() => false);

            if (claimed) {
              // 1. Move to triggered archive table
              const trigRes = await fetch("/api/triggered-watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  source_item_id: item.id,
                  symbol: sym,
                  trigger_price: triggerPrice,
                  trigger_direction: item.trigger_direction,
                  fired_price: lastPrice,
                  entry_price: item.entry_price,
                  stop_loss: item.stop_loss,
                  take_profit: item.take_profit,
                  order_type: item.order_type,
                  notes: item.notes,
                  fired_at: nowIso,
                }),
              });

              if (trigRes.ok) {
                const { item: trigItem } = await trigRes.json();
                setTriggeredItems((prev) => [
                  trigItem,
                  ...prev.filter((x) => x.id !== trigItem.id),
                ]);
              }

              // 2. Remove from active watchlist
              await fetch(`/api/watchlist/${item.id}`, { method: "DELETE" });
              setItems((prev) => prev.filter((x) => x.id !== item.id));

              // 3. Handle Order Type branching
              if (item.order_type === "trigger_limit") {
                // Trigger Limit: spawn new watchlist item with trigger = EP, order_type = Limit
                if (item.entry_price != null) {
                  const epDirection =
                    lastPrice > item.entry_price ? "below" : "above";
                  await fetch("/api/watchlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      symbol: sym,
                      trigger_price: item.entry_price,
                      trigger_direction: epDirection,
                      entry_price: item.entry_price,
                      stop_loss: item.stop_loss,
                      take_profit: item.take_profit,
                      order_type: "limit",
                      notes: item.notes,
                    }),
                  });
                  await reloadItems();
                }

                // Send notification without creating a /trades alert row
                await fetch(`/api/alerts/fire`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "watchlist_trigger",
                    title: `${cleanSymbol(sym)} TL trigger hit — Limit order armed`,
                    message: `Trigger ${fmtPlanPx(triggerPrice)} fired. New watchlist item created at EP ${fmtPlanPx(item.entry_price ?? 0)}.`,
                    link: "/watchlist",
                  }),
                }).catch(() => {});
              } else {
                // Limit or Market: send notification + log trade alert for /trades page
                await fetch(`/api/alerts/fire`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "watchlist_trigger",
                    title: `${cleanSymbol(sym)} hit your trigger`,
                    message: `Last ${fmtPx(lastPrice)} reached your ${fmtPlanPx(triggerPrice)} trigger.`,
                    link: "/watchlist",
                    symbol: sym,
                    trigger_price: triggerPrice,
                    trigger_direction: item.trigger_direction,
                    fired_price: lastPrice,
                    entry_price: item.entry_price,
                    stop_loss: item.stop_loss,
                    take_profit: item.take_profit,
                    order_type: item.order_type,
                    notes: item.notes,
                    watchlist_item_id: item.id,
                  }),
                }).catch(() => {});
              }
            }
          } catch {
            // ignore per-item failures
          }
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

  // ---- Effect: coin icon fetching ----

  useEffect(() => {
    if (symbolsToTrack.length === 0) return;
    let cancelled = false;

    async function fetchIcons() {
      try {
        const fetched = await Promise.all(
          symbolsToTrack.map(async (sym) => {
            const res = await fetch(
              `/api/mexc/futures?symbol=${encodeURIComponent(sym)}`
            );
            if (!res.ok) return { symbol: sym, iconUrl: null };
            const data = await res.json();
            return {
              symbol: sym,
              iconUrl: data.detail?.baseCoinIconUrl ?? null,
            };
          })
        );
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const r of fetched) {
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

  // ---- Column helpers ----

  function toggleCol(key: ColKey, on: boolean) {
    setCols((prev) => {
      const next = { ...prev, [key]: on };
      saveCols(next);
      return next;
    });
  }

  function showAllCols() {
    setCols(() => {
      saveCols({ ...DEFAULT_COLS });
      return { ...DEFAULT_COLS };
    });
  }

  // ---- Search handlers ----

  async function doSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/mexc/futures?q=${encodeURIComponent(trimmed)}`
      );
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

  // ---- CRUD operations ----

  async function addCoin(symbol: string) {
    setNote(null);
    const sym = symbol.toUpperCase();
    setQuery("");
    setResults(null);

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
      setItems([...items, item]);
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
    setItems(items.filter((i) => i.id !== id));
    setConfirmRemove(null);
  }

  // Reload the list after an alert/trade-plan save so the row reflects
  // the updated trigger state.
  async function reloadItems() {
    try {
      const res = await fetch(`/api/watchlist`);
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.items ?? []) as WatchlistItem[]);
    } catch {
      /* ignore */
    }
  }

  // ---- Render ----

  const inputCls =
    "hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Header + MEXC search ---- */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Market radar</p>
          <h1 className="text-2xl font-semibold mb-1">Futures watchlist</h1>
          <p className="text-sm text-muted">
            MEXC USDT-perpetual coins Â· live data Â· {items.length} saved
          </p>
        </div>

        {/* MEXC coin search */}
        <div className="flex flex-col gap-1 relative">
          <span className="text-xs text-muted">Search MEXC futures</span>
          <input
            className={`${inputCls} w-64`}
            value={query}
            onChange={handleQuery}
            placeholder="e.g. BTC, SOL, DOGEâ€¦"
          />
          {searching && (
            <span className="absolute -bottom-4 text-xs text-muted">
              searchingâ€¦
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
                      <span
                        className={
                          t.riseFallRate >= 0 ? "text-gain" : "text-loss"
                        }
                      >
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

      {/* ---- Status messages ---- */}
      {note && <div className="text-sm text-gain">{note}</div>}
      {searchError && !query && (
        <div className="text-sm text-loss">{searchError}</div>
      )}

      {/* ---- Tab Navigation ---- */}
      <div className="flex items-center gap-1 border-b border-hairline pb-0 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "active"
              ? "border-accent text-foreground font-semibold"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Watchlist
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-hairline font-mono">
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("triggered")}
          className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "triggered"
              ? "border-accent text-foreground font-semibold"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Triggered
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-hairline font-mono">
            {triggeredItems.length}
          </span>
        </button>
      </div>

      {/* ---- Tab Content ---- */}
      {activeTab === "triggered" ? (
        <WatchlistTriggeredTab
          triggeredItems={triggeredItems}
          onItemRestored={(restored, triggeredId) => {
            setItems((prev) => [...prev, restored]);
            setTriggeredItems((prev) =>
              prev.filter((x) => x.id !== triggeredId)
            );
            setNote(`Moved ${cleanSymbol(restored.symbol)} back to active Watchlist.`);
          }}
          onItemDeleted={(id) => {
            setTriggeredItems((prev) => prev.filter((x) => x.id !== id));
          }}
        />
      ) : items.length === 0 ? (
        <div className="hairline text-muted p-10 text-center text-sm">
          No coins saved yet. Search a MEXC futures coin above to add it.
        </div>
      ) : (
        <>
          <WatchlistToolbar
            filter={filter}
            onFilterChange={(v) => {
              setFilter(v);
              setPage(0);
            }}
            sort={sort}
            onSortChange={(next) => {
              setSort(next);
              saveSort(next);
            }}
            cols={cols}
            onToggleCol={toggleCol}
            onShowAllCols={showAllCols}
            pageSize={pageSize}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(0);
            }}
          />

          {filteredItems.length === 0 ? (
            <div className="hairline text-muted p-10 text-center text-sm">
              No saved coins match &ldquo;{filter}&rdquo;. Try a different
              search.
            </div>
          ) : (
            <WatchlistTable
              pageItems={pageItems}
              live={live}
              icons={icons}
              cols={cols}
              onModify={(item) =>
                setDetails({ symbol: item.symbol.toUpperCase(), item })
              }
              onRemove={(id) => setConfirmRemove(id)}
              hasPaging={hasPaging}
              safePage={safePage}
              pageCount={pageCount}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() =>
                setPage((p) => Math.min(pageCount - 1, p + 1))
              }
            />
          )}
        </>
      )}

      {/* ---- Footer note ---- */}
      <p className="text-xs text-muted">
        Live data refreshes every {refreshIntervalSec}s from the MEXC contract
        (futures) API. Rows default to Status sort (Triggered â†’ Ongoing â†’
        None). Use the Sort by dropdown to reorder by coin, 24h %, volume,
        price, trigger, or change text â€” or toggle visible columns from the
        &ldquo;Columns&rdquo; button.
      </p>

      {/* ---- Coin detail modal ---- */}
      {details && (
        <CoinDetailModal
          symbol={details.symbol}
          item={details.item}
          onClose={() => setDetails(null)}
          onSaved={reloadItems}
        />
      )}

      {/* ---- Remove confirmation modal ---- */}
      {confirmRemove &&
        (() => {
          const pending = items.find((x) => x.id === confirmRemove);
          if (!pending) return null;
          const sym = cleanSymbol(pending.symbol.toUpperCase());
          return (
            <ModalShell
              title={`Remove ${sym}?`}
              onClose={() => setConfirmRemove(null)}
              maxWidth="max-w-sm"
              center
            >
              <p className="text-sm">
                Remove <span className="font-medium">{sym}</span> from your
                watchlist? This won&apos;t affect any live alert status.
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

