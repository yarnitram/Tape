"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { TradeAlert } from "@/lib/types";

interface Props {
  initialAlerts: TradeAlert[];
  refreshIntervalSec?: number;
}

const SORT_KEY = "tape:trades-sort";
const COLS_KEY = "tape:trades-cols";

type SortField =
  | "firedAt"
  | "symbol"
  | "trigger"
  | "firedPrice"
  | "entry"
  | "stop"
  | "target";

interface SortConfig {
  field: SortField;
  dir: "asc" | "desc";
}

const DEFAULT_SORT: SortConfig = { field: "firedAt", dir: "desc" };

const SORT_OPTIONS: { value: SortConfig; label: string }[] = [
  { value: { field: "firedAt", dir: "desc" }, label: "Fired at (new → old)" },
  { value: { field: "firedAt", dir: "asc" }, label: "Fired at (old → new)" },
  { value: { field: "symbol", dir: "asc" }, label: "Coin (A–Z)" },
  { value: { field: "symbol", dir: "desc" }, label: "Coin (Z–A)" },
  { value: { field: "trigger", dir: "desc" }, label: "Trigger (high → low)" },
  { value: { field: "trigger", dir: "asc" }, label: "Trigger (low → high)" },
  { value: { field: "firedPrice", dir: "desc" }, label: "Fired price (high → low)" },
  { value: { field: "firedPrice", dir: "asc" }, label: "Fired price (low → high)" },
  { value: { field: "entry", dir: "desc" }, label: "Entry (high → low)" },
  { value: { field: "entry", dir: "asc" }, label: "Entry (low → high)" },
  { value: { field: "stop", dir: "desc" }, label: "Stop-loss (high → low)" },
  { value: { field: "stop", dir: "asc" }, label: "Stop-loss (low → high)" },
  { value: { field: "target", dir: "desc" }, label: "Take-profit (high → low)" },
  { value: { field: "target", dir: "asc" }, label: "Take-profit (low → high)" },
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

// Toggleable table columns (Coin and Fired at are always shown).
type ColKey =
  | "trigger"
  | "firedPrice"
  | "direction"
  | "plan"
  | "orderType"
  | "notes";

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "trigger", label: "Trigger" },
  { key: "firedPrice", label: "Fired price" },
  { key: "direction", label: "Direction" },
  { key: "plan", label: "EP / SL / TP" },
  { key: "orderType", label: "Order type" },
  { key: "notes", label: "Notes" },
];

const DEFAULT_COLS: Record<ColKey, boolean> = {
  trigger: true,
  firedPrice: true,
  direction: true,
  plan: true,
  orderType: true,
  notes: true,
};

function loadCols(): Record<ColKey, boolean> {
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<ColKey, boolean>>;
      return { ...DEFAULT_COLS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_COLS };
}

function saveCols(cols: Record<ColKey, boolean>) {
  try {
    localStorage.setItem(COLS_KEY, JSON.stringify(cols));
  } catch {
    /* ignore */
  }
}

export function TradesClient({ initialAlerts, refreshIntervalSec = 10 }: Props) {
  // NOTE: initialize with the server-provided order only. Applying any saved
  // localStorage preference must happen AFTER hydration (see effects below),
  // otherwise the server and client render different output and React throws
  // a hydration mismatch error.
  const [alerts, setAlerts] = useState<TradeAlert[]>(initialAlerts);

  // Sort configuration. NOTE: always initialized to the default so the server
  // and client render rows in the same order. The saved preference is applied
  // AFTER hydration in an effect, avoiding a hydration mismatch.
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);

  // Case-insensitive filter for filtering fired alerts by coin.
  const [filter, setFilter] = useState("");

  // Which table columns are visible. NOTE: always initialized to the default
  // (all visible) so the server and client render the same initial columns.
  const [cols, setCols] = useState<Record<ColKey, boolean>>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);

  const colVisible = (key: ColKey) => cols[key] !== false;

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

  // Pagination state. pageSize is one of 10/20/50/100, or Infinity for "All".
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Apply the saved sort AFTER hydration so the server and client render the
  // same initial row order (avoids a hydration mismatch from a non-default
  // saved sort). `loadSort()` already falls back to the default when invalid.
  useEffect(() => {
    const t = setTimeout(() => setSort(loadSort()), 0);
    return () => clearTimeout(t);
  }, []);

  // Apply the saved column visibility preference ONLY after hydration, so the
  // server and client render the same initial columns (avoids a hydration
  // mismatch when a saved value differs from the initial default).
  useEffect(() => {
    const t = setTimeout(() => setCols(loadCols()), 0);
    return () => clearTimeout(t);
  }, []);

  // Close the column picker when clicking outside of it.
  useEffect(() => {
    if (!colsOpen) return;
    function onDocClick(e: MouseEvent) {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) {
        setColsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [colsOpen]);

  // Poll for newly fired alerts so the table stays live while the page is
  // open — alerts fire from the watchlist page poller or the always-on
  // background watcher. The fresh list simply replaces local state.
  useEffect(() => {
    let cancelled = false;
    const intervalMs = Math.max(
      3000,
      (Number(refreshIntervalSec) || 10) * 1000
    );

    async function refresh() {
      try {
        const res = await fetch("/api/trade-alerts");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.alerts)) {
          setAlerts(data.alerts as TradeAlert[]);
        }
      } catch {
        // keep last known data on failure
      }
    }

    const id = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshIntervalSec]);

  // Rows in display order: always sorted by the selected sort option.
  const sortedAlerts = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...alerts].sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();
      switch (sort.field) {
        case "firedAt": {
          const aT = new Date(a.fired_at).getTime();
          const bT = new Date(b.fired_at).getTime();
          if (Number.isNaN(aT) && Number.isNaN(bT)) return aSym.localeCompare(bSym);
          // Invalid timestamps sink to the bottom regardless of direction.
          if (Number.isNaN(aT)) return 1;
          if (Number.isNaN(bT)) return -1;
          return (aT - bT) * dir;
        }
        case "symbol":
          return aSym.localeCompare(bSym) * dir;
        case "trigger":
          return (
            ((a.trigger_price ?? Number.NEGATIVE_INFINITY) -
              (b.trigger_price ?? Number.NEGATIVE_INFINITY)) *
            dir
          );
        case "firedPrice":
          return (
            ((a.fired_price ?? Number.NEGATIVE_INFINITY) -
              (b.fired_price ?? Number.NEGATIVE_INFINITY)) *
            dir
          );
        case "entry":
          return (
            ((a.entry_price ?? Number.NEGATIVE_INFINITY) -
              (b.entry_price ?? Number.NEGATIVE_INFINITY)) *
            dir
          );
        case "stop":
          return (
            ((a.stop_loss ?? Number.NEGATIVE_INFINITY) -
              (b.stop_loss ?? Number.NEGATIVE_INFINITY)) *
            dir
          );
        case "target":
          return (
            ((a.take_profit ?? Number.NEGATIVE_INFINITY) -
              (b.take_profit ?? Number.NEGATIVE_INFINITY)) *
            dir
          );
        default:
          return 0;
      }
    });
  }, [alerts, sort]);

  // Rows after applying the client-side filter (search). Composes with sort:
  // filter first, then the result still goes through sortedAlerts' ordering.
  const filteredAlerts = useMemo(() => {
    const q = filter.trim().toUpperCase();
    if (!q) return sortedAlerts;
    return sortedAlerts.filter((a) => a.symbol.toUpperCase().includes(q));
  }, [sortedAlerts, filter]);

  // ---- Pagination ----
  const total = filteredAlerts.length;
  const hasPaging = Number.isFinite(pageSize);
  const pageCount = hasPaging ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = hasPaging ? Math.min(page, pageCount - 1) : 0;
  const pageAlerts = useMemo(() => {
    if (!hasPaging) return filteredAlerts;
    return filteredAlerts.slice(safePage * pageSize, (safePage + 1) * pageSize);
  }, [filteredAlerts, pageSize, safePage, hasPaging]);

  // Price formatting: up to 7 decimals, with any trailing zeros after the
  // decimal point trimmed (0.5000000 → 0.5).
  function fmtPx(p: number): string {
    const s = p.toLocaleString("en-US", { maximumFractionDigits: 7 });
    return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  }

  // Render one price value, or a muted "—" when unset.
  function fmtPxVal(v: number | null | undefined): ReactNode {
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
          <p className="eyebrow mb-1">Alert log</p>
          <h1 className="text-2xl font-semibold mb-1">Trades</h1>
          <p className="text-sm text-muted">
            Fired watchlist triggers · token data logged automatically ·{" "}
            {alerts.length} total
          </p>
        </div>
      </div>

      {alerts.length > 0 && (
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
              placeholder="Filter by coin…"
            />
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative" ref={colsRef}>
              <button
                type="button"
                onClick={() => setColsOpen((o) => !o)}
                aria-expanded={colsOpen}
                aria-haspopup="true"
                className={`hairline bg-panel px-2 py-1.5 text-xs cursor-pointer rounded-md flex items-center gap-1.5 ${
                  colsOpen ? "border-accent text-accent" : "text-muted hover:text-text"
                }`}
              >
                Columns
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path
                    d="M2 3.5l3 3 3-3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {colsOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 w-52 hairline bg-panel shadow-lg rounded-lg p-2"
                  role="menu"
                >
                  <div className="flex items-center justify-between px-2 pb-1.5 mb-1 hairline-b">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Show columns
                    </span>
                    <button
                      type="button"
                      onClick={showAllCols}
                      className="text-[11px] text-accent hover:underline cursor-pointer"
                    >
                      Show all
                    </button>
                  </div>
                  {COLUMNS.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-text rounded hover:bg-panel-soft cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={colVisible(c.key)}
                        onChange={(e) => toggleCol(c.key, e.target.checked)}
                        className="accent-accent cursor-pointer"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
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
                  <option
                    key={sortConfigKey(o.value)}
                    value={sortConfigKey(o.value)}
                  >
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

      {alerts.length === 0 ? (
        <div className="hairline text-muted p-10 text-center text-sm">
          No triggered trades yet. Arm a price trigger on the Watchlist page —
          when it fires, the token data lands here.
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="hairline text-muted p-10 text-center text-sm">
          No triggered trades match “{filter}”. Try a different search.
        </div>
      ) : (
        <>
          <div className="hairline overflow-x-auto rounded-xl bg-panel/40 striped">
            <table className="w-full text-sm border-collapse min-w-[1040px]">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide hairline-b">
                  <th className="px-3 py-2.5">Coin</th>
                  {colVisible("trigger") && (
                    <th className="px-3 py-2.5 text-right">Trigger</th>
                  )}
                  {colVisible("firedPrice") && (
                    <th className="px-3 py-2.5 text-right">Fired price</th>
                  )}
                  {colVisible("direction") && (
                    <th className="px-3 py-2.5 text-center">Direction</th>
                  )}
                  {colVisible("plan") && (
                    <th className="px-3 py-2.5 text-center">EP / SL / TP</th>
                  )}
                  {colVisible("orderType") && (
                    <th className="px-3 py-2.5 text-right">Order type</th>
                  )}
                  {colVisible("notes") && <th className="px-3 py-2.5">Notes</th>}
                  <th className="px-3 py-2.5">Fired at</th>
                </tr>
              </thead>
              <tbody>
                {pageAlerts.map((a) => {
                  const sym = a.symbol.toUpperCase();
                  return (
                    <tr
                      key={a.id}
                      className="hairline-b hover:bg-paper transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{cleanSymbol(sym)}</span>
                      </td>
                      {colVisible("trigger") && (
                        <td className="px-3 py-2.5 num text-right">
                          {fmtPxVal(a.trigger_price)}
                        </td>
                      )}
                      {colVisible("firedPrice") && (
                        <td className="px-3 py-2.5 num text-right">
                          {fmtPxVal(a.fired_price)}
                        </td>
                      )}
                      {colVisible("direction") && (
                        <td className="px-3 py-2.5 text-center">
                          {a.trigger_direction ? (
                            <span
                              className={
                                a.trigger_direction === "above"
                                  ? "text-gain"
                                  : "text-loss"
                              }
                            >
                              {a.trigger_direction === "above" ? "Above" : "Below"}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      {colVisible("plan") && (
                        <td className="px-3 py-2.5 num text-center whitespace-nowrap">
                          {fmtPxVal(a.entry_price)}
                          <span className="text-muted mx-1">/</span>
                          {fmtPxVal(a.stop_loss)}
                          <span className="text-muted mx-1">/</span>
                          {fmtPxVal(a.take_profit)}
                        </td>
                      )}
                      {colVisible("orderType") && (
                        <td className="px-3 py-2.5 text-right">
                          {a.order_type ? (
                            ORDER_TYPE_LABELS[a.order_type] ?? a.order_type
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      {colVisible("notes") && (
                        <td className="px-3 py-2.5 max-w-[220px]">
                          {a.notes ? (
                            <span className="block truncate" title={a.notes}>
                              {a.notes}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2.5">{fmtDateTime(a.fired_at)}</td>
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
        Every fired watchlist alert is logged here automatically with its token
        data (trigger, fired price, trade plan). Use the Sort by dropdown to
        reorder rows — or toggle visible columns from the “Columns” button.
        Alerts fire from the Watchlist page poller or the always-on watcher
        script.
      </p>
    </div>
  );
}
