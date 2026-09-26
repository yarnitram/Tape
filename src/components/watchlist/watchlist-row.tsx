"use client";

import type { ReactNode } from "react";
import type { WatchlistItem } from "@/lib/types";
import {
  cleanSymbol,
  fmtPct,
  fmtPlanPx,
  fmtPx,
  compact,
  mexcChartUrl,
} from "@/lib/format";
import type { ColKey, Ticker } from "./watchlist-types";
import { ORDER_TYPE_LABELS } from "./watchlist-types";

// ---- Prop types ----

export interface WatchlistRowProps {
  item: WatchlistItem;
  /** Live ticker from MEXC, or undefined while loading / unavailable. */
  ticker: Ticker | undefined;
  /** Coin icon URL, or undefined when not yet fetched. */
  iconUrl: string | undefined;
  /** Which columns are currently visible. */
  cols: Record<ColKey, boolean>;
  /** Open the detail/modify modal for this row. */
  onModify: () => void;
  /** Open the remove-confirmation for this row. */
  onRemove: () => void;
  /** Open the share modal for this row. */
  onShare?: () => void;
}

// ---- JSX render helpers (return ReactNode — kept local to this component) ----

/** Render a plan price (EP / SL / TP) or a muted dash when unset. */
function fmtPlanVal(v: number | null | undefined): ReactNode {
  return v != null ? fmtPlanPx(v) : <span className="text-muted">—</span>;
}

/**
 * Render an ISO timestamp as two stacked lines in SGT (GMT+8):
 * DD/MM/YYYY on top, HH:MM AM/PM below.
 */
function fmtDateTime(iso: string | null | undefined): ReactNode {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
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

// ---- Component ----

export function WatchlistRow({
  item,
  ticker,
  iconUrl,
  cols,
  onModify,
  onRemove,
  onShare,
}: WatchlistRowProps) {
  const sym = item.symbol.toUpperCase();
  const label = cleanSymbol(sym);
  const colVisible = (key: ColKey) => cols[key] !== false;

  return (
    <tr className="hairline-b hover:bg-paper transition-colors">
      {/* Spacer */}
      <td className="px-2 py-2.5 w-8" aria-hidden="true" />

      {/* Icon */}
      <td className="px-2 py-2.5 text-center">
        {iconUrl && (
          <img
            src={iconUrl}
            alt={label}
            draggable={false}
            className="h-5 w-5 rounded-full object-contain inline-block"
          />
        )}
      </td>

      {/* Coin name */}
      <td className="px-3 py-2.5">
        <button
          type="button"
          onClick={onModify}
          className="text-left group"
          title={`View ${label} details`}
        >
          <span className="font-medium group-hover:text-accent group-hover:underline">
            {label}
          </span>
          <span className="text-xs text-muted ml-1 block">
            {sym.replace("_USDT", "")}
          </span>
        </button>
      </td>

      {/* 24 h % change */}
      {colVisible("change") && (
        <td className="px-3 py-2.5 num">
          {ticker ? (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono tabular-nums ${
                ticker.riseFallRate >= 0
                  ? "bg-gain/10 text-gain"
                  : "bg-loss/10 text-loss"
              }`}
            >
              {fmtPct(ticker.riseFallRate)}
            </span>
          ) : (
            "…"
          )}
        </td>
      )}

      {/* Volume (24 h) */}
      {colVisible("volume") && (
        <td className="px-3 py-2.5 num">
          {ticker ? compact(ticker.amount24) : "…"}
        </td>
      )}

      {/* Last price */}
      {colVisible("price") && (
        <td className="px-3 py-2.5 num">
          {ticker ? fmtPx(ticker.lastPrice) : "…"}
        </td>
      )}

      {/* Trigger price */}
      {colVisible("trigger") && (
        <td className="px-3 py-2.5 num text-muted">
          {item.trigger_price != null ? fmtPlanPx(item.trigger_price) : "—"}
        </td>
      )}

      {/* EP / SL / TP */}
      {colVisible("plan") && (
        <td className="px-3 py-2.5">
          <div className="flex flex-col gap-0.5 text-center font-mono tabular-nums leading-tight">
            <span className="whitespace-nowrap">
              <span className="text-[10px] text-muted">EP: </span>
              <span>{fmtPlanVal(item.entry_price)}</span>
            </span>
            <span className="whitespace-nowrap">
              <span className="text-[10px] text-muted">SL: </span>
              <span>{fmtPlanVal(item.stop_loss)}</span>
            </span>
            <span className="whitespace-nowrap">
              <span className="text-[10px] text-muted">TP: </span>
              <span>{fmtPlanVal(item.take_profit)}</span>
            </span>
          </div>
        </td>
      )}

      {/* Order type */}
      {colVisible("orderType") && (
        <td className="px-3 py-2.5 num text-right">
          {item.order_type ? (
            ORDER_TYPE_LABELS[item.order_type] ?? item.order_type
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
      )}

      {/* Trigger added timestamp */}
      {colVisible("triggerAdded") && (
        <td className="px-3 py-2.5 num text-muted whitespace-nowrap text-center">
          {item.trigger_price != null
            ? fmtDateTime(item.trigger_created_at)
            : "—"}
        </td>
      )}

      {/* Fired-at timestamp */}
      {colVisible("firedAt") && (
        <td className="px-3 py-2.5 num text-muted whitespace-nowrap text-center">
          {item.alert_fired ? fmtDateTime(item.alert_fired_at) : "—"}
        </td>
      )}

      {/* Status badge */}
      {colVisible("status") && (
        <td className="px-3 py-2.5 text-xs text-center">
          {item.alert_fired ? (
            <span className="inline-flex items-center rounded-md bg-loss/10 px-2 py-0.5 text-xs font-semibold font-mono text-loss">
              ● Triggered
            </span>
          ) : item.trigger_price != null ? (
            <span className="inline-flex items-center rounded-md bg-gain/10 px-2 py-0.5 text-xs font-semibold font-mono text-gain">
              ● Ongoing
            </span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
      )}

      {/* Actions */}
      <td
        className="px-3 py-2.5 text-right whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <a
          href={mexcChartUrl(item.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline text-xs mr-3 inline-flex items-center gap-1 cursor-pointer"
          title={`Open ${cleanSymbol(item.symbol)} chart on MEXC`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          <span>Chart</span>
        </a>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-accent hover:underline text-xs mr-3 cursor-pointer"
            title="Share setup link"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={onModify}
          className="text-accent hover:underline text-xs mr-3 cursor-pointer"
          title="View details"
        >
          Modify
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-loss hover:underline text-xs cursor-pointer"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
