"use client";

import { useState } from "react";
import type { ArchivedWatchlistItem, WatchlistItem } from "@/lib/types";
import { cleanSymbol, fmtPx, fmtPlanPx } from "@/lib/format";

interface Props {
  archivedItems: ArchivedWatchlistItem[];
  onItemRestored: (item: WatchlistItem, archivedId: string) => void;
  onItemDeleted: (id: string) => void;
}

export function WatchlistArchiveTab({
  archivedItems,
  onItemRestored,
  onItemDeleted,
}: Props) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRestore = async (item: ArchivedWatchlistItem) => {
    if (restoringId) return;
    setRestoringId(item.id);

    try {
      // 1. Re-create in active watchlist
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: item.symbol,
          trigger_price: item.trigger_price,
          trigger_direction: item.trigger_direction,
          order_type: item.order_type,
          entry_price: item.entry_price,
          stop_loss: item.stop_loss,
          take_profit: item.take_profit,
          notes: item.notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to restore item to watchlist");
        setRestoringId(null);
        return;
      }

      const { item: restored } = await res.json();

      // 2. Delete from archived_watchlist_items
      await fetch(`/api/archived-watchlist/${item.id}`, { method: "DELETE" });

      onItemRestored(restored, item.id);
    } catch {
      alert("Network error while restoring archived item");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/archived-watchlist/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onItemDeleted(id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (archivedItems.length === 0) {
    return (
      <div className="py-16 text-center border border-hairline rounded-lg bg-surface/20">
        <p className="text-sm font-mono text-muted uppercase tracking-wider mb-1">
          Archive is empty
        </p>
        <p className="text-xs text-muted/70">
          When you delete active or triggered watchlist items, they will be archived here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-hairline rounded-lg">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="hairline-b bg-surface/50 font-mono text-[10px] uppercase text-muted tracking-wider">
            <th className="py-2.5 px-3">Coin</th>
            <th className="py-2.5 px-3">Source</th>
            <th className="py-2.5 px-3">Side</th>
            <th className="py-2.5 px-3">Order Type</th>
            <th className="py-2.5 px-3 text-right">Trigger Px</th>
            <th className="py-2.5 px-3 text-right">Fired Px</th>
            <th className="py-2.5 px-3 text-right">EP / SL / TP</th>
            <th className="py-2.5 px-3 text-right">Archived At</th>
            <th className="py-2.5 px-3">Notes</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {archivedItems.map((item) => {
            const sym = cleanSymbol(item.symbol);
            const side =
              item.trigger_direction === "above"
                ? "short"
                : item.trigger_direction === "below"
                ? "long"
                : null;
            const isLong = side === "long";

            const orderTypeLabel =
              item.order_type === "trigger_limit"
                ? "Trigger Limit"
                : item.order_type === "limit"
                ? "Limit"
                : item.order_type === "market"
                ? "Market"
                : "—";

            const isFromTriggered = item.archive_source === "triggered_deleted";
            const archivedAtFormatted = new Date(item.archived_at).toLocaleString("en-SG", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });

            return (
              <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                <td className="py-3 px-3 font-semibold font-mono text-foreground">
                  {sym}
                  <span className="text-[10px] font-normal text-muted ml-1">USDT</span>
                </td>
                <td className="py-3 px-3 font-mono">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                      isFromTriggered
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {isFromTriggered ? "Triggered" : "Watchlist"}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {side ? (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                        isLong
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {isLong ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 7l10 10M17 7v10H7" />
                        </svg>
                      )}
                      {side.toUpperCase()}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 px-3 font-mono text-muted">
                  <span className="px-1.5 py-0.5 rounded bg-hairline/40 text-[10px]">
                    {orderTypeLabel}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-foreground font-medium">
                  {item.trigger_price != null ? fmtPlanPx(Number(item.trigger_price)) : "—"}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400 font-medium">
                  {item.fired_price != null ? fmtPx(Number(item.fired_price)) : "—"}
                </td>
                <td className="py-3 px-3 text-right font-mono text-muted text-[11px]">
                  {item.entry_price != null ? (
                    <div>
                      <span>EP: {fmtPlanPx(Number(item.entry_price))}</span>
                      {(item.stop_loss != null || item.take_profit != null) && (
                        <div className="text-[10px] text-muted/70">
                          {item.stop_loss != null ? `SL ${fmtPlanPx(Number(item.stop_loss))}` : ""}
                          {item.stop_loss != null && item.take_profit != null ? " · " : ""}
                          {item.take_profit != null ? `TP ${fmtPlanPx(Number(item.take_profit))}` : ""}
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono text-muted text-[11px]">
                  {archivedAtFormatted}
                </td>
                <td className="py-3 px-3 text-muted text-xs max-w-[180px] truncate" title={item.notes ?? ""}>
                  {item.notes || "—"}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={restoringId === item.id}
                      title="Restore to active Watchlist"
                      className="px-2 py-1 rounded text-[11px] font-mono font-medium text-amber-400 hover:bg-amber-400/10 border border-amber-400/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 7L3 12L8 17M3 12H21M16 7L21 12L16 17" />
                      </svg>
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.id)}
                      disabled={deletingId === item.id}
                      title="Permanently Delete"
                      className="p-1 rounded text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
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
  );
}
