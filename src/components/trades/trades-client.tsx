"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sideForTrigger, type TradeAlert, type TradeSide } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";
import { TradeEditModal } from "./trade-edit-modal";

interface Props {
  initialAlerts: TradeAlert[];
  refreshIntervalSec?: number;
}

const SORT_KEY = "tape:trades-sort";
const COLS_KEY = "tape:trades-cols";

type SortField =
  | "firedAt"
  | "symbol"
  | "position"
  | "leverage"
  | "pnl"
  | "margin"
  | "lastPrice"
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
  { value: { field: "pnl", dir: "desc" }, label: "Unrealized P&L (high → low)" },
  { value: { field: "pnl", dir: "asc" }, label: "Unrealized P&L (low → high)" },
  { value: { field: "position", dir: "desc" }, label: "Position (high → low)" },
  { value: { field: "position", dir: "asc" }, label: "Position (low → high)" },
  { value: { field: "margin", dir: "desc" }, label: "Margin (high → low)" },
  { value: { field: "margin", dir: "asc" }, label: "Margin (low → high)" },
  { value: { field: "leverage", dir: "desc" }, label: "Leverage (high → low)" },
  { value: { field: "leverage", dir: "asc" }, label: "Leverage (low → high)" },
  { value: { field: "lastPrice", dir: "desc" }, label: "Last price (high → low)" },
  { value: { field: "lastPrice", dir: "asc" }, label: "Last price (low → high)" },
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

/** The only live ticker field we need (see GET /api/mexc/futures). */
interface Ticker {
  symbol: string;
  lastPrice: number;
}

/** The only contract-detail fields we need (see GET /api/mexc/futures). */
interface ContractDetail {
  symbol: string;
  contractSize: number;
  maxLeverage: number;
}

// Every position defaults to $1 of margin. Leverage defaults to the coin's
// maximum from MEXC — and when that is unknown, the row shows "—" rather than
// a fabricated number.
const DEFAULT_MARGIN_USD = 1;

/** A logged alert plus the live price and position numbers derived from it. */
interface TradeRow extends TradeAlert {
  /** Price the position was opened at: the plan's entry, else the fired price. */
  entryUsed: number | null;
  marginUsd: number;
  /** Effective leverage (saved value, or the coin's max when none saved).
   *  NULL when neither is known — the sizing columns then render as "—". */
  leverage: number | null;
  /** True when this is the exchange's maximum (verified, and none saved). */
  leverageIsMax: boolean;
  /** Position size in coins (notional ÷ entry). */
  positionSize: number | null;
  notional: number | null;
  lastPrice: number | null;
  pnl: number | null;
  pnlPct: number | null;
  side: TradeSide;
}

/**
 * Size a position and mark it to the live price.
 *
 *   notional  = margin × leverage
 *   position  = notional ÷ entry
 *   P&L       = side × position × (last − entry)
 *   P&L %     = side × (last ÷ entry − 1) × leverage   (return on margin)
 */
function buildRow(
  a: TradeAlert,
  lastPrice: number | null,
  maxLeverage: number | null
): TradeRow {
  // No stored side: breaking below the trigger is taken long, above is short.
  const side = sideForTrigger(a.trigger_direction);
  const entryUsed = a.entry_price ?? a.fired_price;

  const marginUsd =
    a.margin_usd != null && a.margin_usd > 0 ? a.margin_usd : DEFAULT_MARGIN_USD;

  const savedLev = a.leverage != null && a.leverage > 0 ? a.leverage : null;
  const maxLev = maxLeverage != null && maxLeverage > 0 ? maxLeverage : null;
  const leverage = savedLev ?? maxLev;
  // Only claim "max" once the exchange's maximum has actually been read.
  const leverageIsMax = savedLev == null && maxLev != null;

  const sign = side === "long" ? 1 : -1;

  // Without leverage the position can't be sized, so everything derived from
  // it stays null (rendered as "—") until the contract detail arrives.
  let notional: number | null = null;
  let positionSize: number | null = null;
  let pnl: number | null = null;
  let pnlPct: number | null = null;
  if (leverage != null && entryUsed != null && entryUsed > 0) {
    notional = marginUsd * leverage;
    positionSize = notional / entryUsed;
    if (lastPrice != null) {
      pnl = sign * positionSize * (lastPrice - entryUsed);
      pnlPct = sign * (lastPrice / entryUsed - 1) * leverage;
    }
  }

  return {
    ...a,
    entryUsed,
    marginUsd,
    leverage,
    leverageIsMax,
    positionSize,
    notional,
    lastPrice,
    pnl,
    pnlPct,
    side,
  };
}

// Toggleable table columns (Coin and the action icons are always shown).
// Direction is deliberately not a column — the trigger direction only
// decides the side now (below = long, above = short).
type ColKey =
  | "position"
  | "leverage"
  | "pnl"
  | "margin"
  | "lastPrice"
  | "trigger"
  | "firedPrice"
  | "plan"
  | "orderType"
  | "notes"
  | "firedAt";

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "position", label: "Position" },
  { key: "leverage", label: "Leverage" },
  { key: "pnl", label: "Unrealized PNL" },
  { key: "margin", label: "Margin" },
  { key: "lastPrice", label: "Last price" },
  { key: "trigger", label: "Trigger" },
  { key: "firedPrice", label: "Fired price" },
  { key: "plan", label: "EP / SL / TP" },
  { key: "orderType", label: "Order type" },
  { key: "notes", label: "Notes" },
  { key: "firedAt", label: "Fired at" },
];

const DEFAULT_COLS: Record<ColKey, boolean> = {
  position: true,
  leverage: true,
  pnl: true,
  margin: true,
  lastPrice: true,
  trigger: true,
  firedPrice: true,
  plan: true,
  orderType: true,
  notes: true,
  firedAt: true,
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

  // Live MEXC last price keyed by symbol (e.g. "BTC_USDT" → 64123.5).
  const [live, setLive] = useState<Record<string, number>>({});
  // Contract detail keyed by symbol; supplies the default (max) leverage.
  const [details, setDetails] = useState<Record<string, ContractDetail>>({});
  // Symbols with a detail request currently running, so a symbol is never
  // fetched twice at once. Cleared in `finally` so a failure can be retried.
  const inFlightRef = useRef<Set<string>>(new Set());
  // Failed attempts per symbol — a broken/unlisted symbol stops after a few
  // tries instead of retrying forever.
  const attemptsRef = useRef<Record<string, number>>({});
  // Bumped when a request fails, nudging this effect to run again.
  const [retryTick, setRetryTick] = useState(0);

  // Row actions: the trade open in the edit modal, and the one awaiting
  // delete confirmation.
  const [editing, setEditing] = useState<TradeAlert | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TradeAlert | null>(null);
  // Transient confirmation ("Trade deleted.") shown under the table.
  const [notice, setNotice] = useState<string | null>(null);

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
  // background watcher. The fresh list simply replaces local state. The same
  // tick refreshes the live MEXC prices that feed Last price / Unrealized PNL.
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

      // One request returns every USDT perpetual; the route caches the
      // exchange reply for 5s, so this is cheap on every poll.
      try {
        const res = await fetch("/api/mexc/futures");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.tickers)) return;
        const map: Record<string, number> = {};
        for (const t of data.tickers as Ticker[]) {
          if (typeof t.lastPrice === "number") map[t.symbol] = t.lastPrice;
        }
        setLive(map);
      } catch {
        // prices are cosmetic — keep the previous snapshot
      }
    }

    // Fetch once on mount, then on the poll interval.
    refresh();

    const id = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshIntervalSec]);

  // Distinct coins on the page (sorted so the effect's dependency is stable).
  const symbols = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.symbol.toUpperCase()))).sort(),
    [alerts]
  );

  // Ask MEXC for each coin's contract detail once per page load: maxLeverage
  // is the default leverage, and Position / Unrealized P&L cannot be sized
  // without it. Results are written unconditionally — a response that arrives
  // after this effect is torn down is still correct (React StrictMode mounts
  // effects twice in dev, which used to drop the answer entirely and leave
  // every row on a bogus 1× leverage). Failures retry a few times with
  // backoff, then give up quietly.
  useEffect(() => {
    const missing = symbols.filter(
      (s) => !details[s] && !inFlightRef.current.has(s)
    );
    if (missing.length === 0) return;
    for (const sym of missing) inFlightRef.current.add(sym);

    // Stops further requests after unmount; already-arrived results still land.
    let stopped = false;
    (async () => {
      for (let i = 0; i < missing.length; i++) {
        const sym = missing[i];
        // Stagger, and back off on retries, so a page with many coins doesn't
        // fire one burst of requests.
        const delay = i * 120 + (attemptsRef.current[sym] ?? 0) * 1500;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (stopped) break;
        try {
          const res = await fetch(
            `/api/mexc/futures?symbol=${encodeURIComponent(sym)}`
          );
          const data = res.ok ? await res.json() : null;
          if (data?.detail) {
            attemptsRef.current[sym] = 0;
            const detail = data.detail as ContractDetail;
            setDetails((prev) => ({ ...prev, [sym]: detail }));
          } else {
            throw new Error(`no contract detail (HTTP ${res.status})`);
          }
        } catch {
          attemptsRef.current[sym] = (attemptsRef.current[sym] ?? 0) + 1;
          const done = attemptsRef.current[sym];
          if (done < 3) {
            setTimeout(() => {
              if (!stopped) setRetryTick((t) => t + 1);
            }, done * 1500);
          }
        } finally {
          inFlightRef.current.delete(sym);
        }
      }
    })();

    return () => {
      stopped = true;
    };
  }, [symbols, details, retryTick]);

  // Clear the action notice after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Display rows: stored fields plus the live price and the computed margin /
  // leverage / position / P&L. Rebuilt when the alerts or prices change.
  const rows = useMemo(
    () =>
      alerts.map((a) => {
        const sym = a.symbol.toUpperCase();
        return buildRow(a, live[sym] ?? null, details[sym]?.maxLeverage ?? null);
      }),
    [alerts, live, details]
  );

  // Rows in display order: always sorted by the selected sort option.
  const sortedAlerts = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    // Missing values sink to the bottom regardless of direction.
    const cmpNum = (a: number | null, b: number | null) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return (a - b) * dir;
    };

    return [...rows].sort((a, b) => {
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
          return cmpNum(a.trigger_price, b.trigger_price);
        case "firedPrice":
          return cmpNum(a.fired_price, b.fired_price);
        case "entry":
          return cmpNum(a.entry_price, b.entry_price);
        case "stop":
          return cmpNum(a.stop_loss, b.stop_loss);
        case "target":
          return cmpNum(a.take_profit, b.take_profit);
        case "position":
          return cmpNum(a.positionSize, b.positionSize);
        case "leverage":
          return cmpNum(a.leverage, b.leverage);
        case "margin":
          return cmpNum(a.marginUsd, b.marginUsd);
        case "lastPrice":
          return cmpNum(a.lastPrice, b.lastPrice);
        case "pnl":
          return cmpNum(a.pnl, b.pnl);
        default:
          return 0;
      }
    });
  }, [rows, sort]);

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

  // Signed USD amount, e.g. "+$1.11" / "-$0.42". Used for Unrealized PNL.
  function fmtUsd(v: number | null | undefined, digits = 2): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const abs = Math.abs(v).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${v < 0 ? "-" : "+"}$${abs}`;
  }

  // Unsigned USD amount, e.g. "$1.00". Used for Margin, which is never negative.
  function fmtMoney(v: number | null | undefined, digits = 2): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `$${v.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }

  // Leverage rendered as "50×"; "—" when the exchange max isn't known yet.
  function fmtLev(v: number | null): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v % 1 === 0 ? v : v.toFixed(2)}×`;
  }

  // Position size in coins. Extra decimals for cheap coins (15,033 ZAMA) and
  // for tiny amounts of expensive ones (0.000781 BTC).
  function fmtSize(v: number | null): string {
    if (v == null || !Number.isFinite(v)) return "—";
    if (v === 0) return "0";
    const abs = Math.abs(v);
    const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
    return v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
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

  // ---- Row actions ----

  /** Delete a logged trade. RLS scopes the write to the signed-in user. */
  async function deleteTrade(id: string) {
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/trade-alerts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Delete failed");
      }
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setNotice("Trade deleted.");
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  /** The edit modal saved — merge the values in so the row updates at once. */
  function onTradeSaved(id: string, patch: Partial<TradeAlert>) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    setEditing(null);
    setNotice("Trade updated.");
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
            <table className="w-full text-sm border-collapse min-w-[1680px]">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide hairline-b">
                  <th className="px-3 py-2.5">Coin</th>
                  {colVisible("position") && (
                    <th className="px-3 py-2.5 text-right">Position</th>
                  )}
                  {colVisible("leverage") && (
                    <th className="px-3 py-2.5 text-right">Leverage</th>
                  )}
                  {colVisible("pnl") && (
                    <th className="px-3 py-2.5 text-right">Unrealized PNL</th>
                  )}
                  {colVisible("margin") && (
                    <th className="px-3 py-2.5 text-right">Margin</th>
                  )}
                  {colVisible("lastPrice") && (
                    <th className="px-3 py-2.5 text-right">Last price</th>
                  )}
                  {colVisible("trigger") && (
                    <th className="px-3 py-2.5 text-right">Trigger</th>
                  )}
                  {colVisible("firedPrice") && (
                    <th className="px-3 py-2.5 text-right">Fired price</th>
                  )}
                  {colVisible("plan") && (
                    <th className="px-3 py-2.5 text-center">EP / SL / TP</th>
                  )}
                  {colVisible("orderType") && (
                    <th className="px-3 py-2.5 text-right">Order type</th>
                  )}
                  {colVisible("notes") && <th className="px-3 py-2.5">Notes</th>}
                  {colVisible("firedAt") && (
                    <th className="px-3 py-2.5">Fired at</th>
                  )}
                  <th className="px-3 py-2.5 text-right w-[88px]">Actions</th>
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
                      {colVisible("position") && (
                        <td className="px-3 py-2.5 text-right">
                          <span className="num">{fmtSize(a.positionSize)}</span>
                          <span
                            className={`block text-[10px] uppercase tracking-wide ${
                              a.side === "long" ? "text-gain" : "text-loss"
                            }`}
                          >
                            {a.side}
                          </span>
                        </td>
                      )}
                      {colVisible("leverage") && (
                        <td className="px-3 py-2.5 num text-right whitespace-nowrap">
                          {fmtLev(a.leverage)}
                          {a.leverageIsMax && (
                            <span className="text-muted text-[10px] ml-1">max</span>
                          )}
                        </td>
                      )}
                      {colVisible("pnl") && (
                        <td
                          className={`px-3 py-2.5 num text-right whitespace-nowrap ${
                            a.pnl == null
                              ? ""
                              : a.pnl > 0
                                ? "text-gain"
                                : a.pnl < 0
                                  ? "text-loss"
                                  : ""
                          }`}
                        >
                          {a.pnl == null ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <>
                              {fmtUsd(a.pnl)}
                              <span className="block text-[10px] text-muted">
                                {a.pnlPct != null
                                  ? `${a.pnlPct >= 0 ? "+" : ""}${(
                                      a.pnlPct * 100
                                    ).toFixed(2)}%`
                                  : ""}
                              </span>
                            </>
                          )}
                        </td>
                      )}
                      {colVisible("margin") && (
                        <td className="px-3 py-2.5 num text-right whitespace-nowrap">
                          {fmtMoney(a.marginUsd)}
                        </td>
                      )}
                      {colVisible("lastPrice") && (
                        <td className="px-3 py-2.5 num text-right">
                          {fmtPxVal(a.lastPrice)}
                        </td>
                      )}
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
                      {colVisible("plan") && (
                        <td className="px-3 py-2.5">
                          {/* Labelled stack, matching the Watchlist page. */}
                          <div className="flex flex-col gap-0.5 text-center font-mono tabular-nums leading-tight">
                            <span className="whitespace-nowrap">
                              <span className="text-[10px] text-muted">EP: </span>
                              {fmtPxVal(a.entry_price)}
                            </span>
                            <span className="whitespace-nowrap">
                              <span className="text-[10px] text-muted">SL: </span>
                              {fmtPxVal(a.stop_loss)}
                            </span>
                            <span className="whitespace-nowrap">
                              <span className="text-[10px] text-muted">TP: </span>
                              {fmtPxVal(a.take_profit)}
                            </span>
                          </div>
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
                      {colVisible("firedAt") && (
                        <td className="px-3 py-2.5">{fmtDateTime(a.fired_at)}</td>
                      )}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(a)}
                            title="Edit trade"
                            aria-label={`Edit ${cleanSymbol(sym)} trade`}
                            className="hairline rounded-md p-1.5 text-muted hover:text-accent hover:border-accent cursor-pointer transition-colors"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M11.5 2.5l2 2L6 12l-3 1 1-3 7.5-7.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(a)}
                            title="Delete trade"
                            aria-label={`Delete ${cleanSymbol(sym)} trade`}
                            className="hairline rounded-md p-1.5 text-muted hover:text-loss hover:border-loss cursor-pointer transition-colors"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9M6.8 7v4M9.2 7v4" />
                            </svg>
                          </button>
                        </div>
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

      {notice && <p className="text-xs text-muted">{notice}</p>}

      <p className="text-xs text-muted">
        Every fired watchlist alert is logged here automatically with its token
        data (trigger, fired price, trade plan). Position and Unrealized PNL are
        sized from the margin (default $1) and leverage (default: the coin&apos;s
        maximum), marked against the live MEXC price. Use the pencil icon to
        edit a trade, the bin icon to delete it, the Sort by dropdown to reorder
        rows, or the “Columns” button to toggle columns. Alerts fire from the
        Watchlist page poller or the always-on watcher script.
      </p>

      {editing && (
        <TradeEditModal
          alert={editing}
          maxLeverage={details[editing.symbol.toUpperCase()]?.maxLeverage ?? null}
          onClose={() => setEditing(null)}
          onSaved={onTradeSaved}
        />
      )}

      {confirmDelete &&
        (() => {
          const sym = cleanSymbol(confirmDelete.symbol.toUpperCase());
          return (
            <ModalShell
              title={`Delete ${sym} trade?`}
              onClose={() => setConfirmDelete(null)}
              maxWidth="max-w-sm"
              center
            >
              <p className="text-sm">
                Delete this logged trade for{" "}
                <span className="font-medium">{sym}</span>? It will be removed
                from your alert log — this can&apos;t be undone.
              </p>
              <div className="flex justify-end gap-2 hairline-t pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-2 text-sm btn-ghost cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteTrade(confirmDelete.id)}
                  className="px-4 py-2 text-sm font-semibold bg-loss text-panel rounded-md cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </ModalShell>
          );
        })()}
    </div>
  );
}
