"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { calculateTradePnl } from "@/lib/trade-calc";
import { sideForTrigger, type TradeAlert } from "@/lib/types";

interface Props {
  alert: TradeAlert | null;
  livePrice: number | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CloseTradeModal({ alert, livePrice, open, onClose, onSuccess }: Props) {
  const [exitPrice, setExitPrice] = useState("");
  const [closedReason, setClosedReason] = useState<"manual_close" | "tp_hit" | "sl_hit">("manual_close");
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && livePrice != null) {
      setExitPrice(livePrice.toString());
    } else if (open && alert) {
      const entry = alert.entry_price ?? alert.fired_price;
      setExitPrice(entry ? entry.toString() : "");
    }
  }, [open, livePrice, alert]);

  if (!open || !alert) return null;

  const entry = alert.entry_price ?? alert.fired_price;
  const numExit = exitPrice ? Number(exitPrice) : null;
  const pnl = calculateTradePnl(
    entry,
    numExit,
    alert.trigger_direction,
    alert.margin_usd,
    alert.leverage
  );

  const side = sideForTrigger(alert.trigger_direction);
  const isProfit = (pnl.realizedPnlUsd ?? 0) >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alert) return;
    if (!numExit || numExit <= 0) {
      setError("Please enter a valid exit price");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/trade-alerts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alert.id,
          exit_price: numExit,
          closed_reason: closedReason,
          close_notes: closeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to close trade");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error closing trade");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title={`Close Trade — ${alert.symbol.replace(/_USDT$/i, "")}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs">
          <div>
            <span className="text-zinc-500 block">Position Side</span>
            <span className={`font-semibold ${side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
              {side.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Entry Price</span>
            <span className="font-mono text-zinc-200">{entry ?? "—"}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 font-medium mb-1">
            Exit Price <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              required
            />
            {livePrice != null && (
              <button
                type="button"
                onClick={() => setExitPrice(livePrice.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              >
                Use Live ({livePrice})
              </button>
            )}
          </div>
        </div>

        {/* Live PnL Preview */}
        {pnl.realizedPnlUsd != null && pnl.realizedPnlPct != null && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
              isProfit
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            <span>Estimated Realized PnL:</span>
            <span className="font-mono text-sm">
              {isProfit ? "+" : ""}${pnl.realizedPnlUsd.toFixed(2)} (
              {isProfit ? "+" : ""}
              {(pnl.realizedPnlPct * 100).toFixed(2)}%)
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs text-zinc-400 font-medium mb-1">
            Close Reason
          </label>
          <select
            value={closedReason}
            onChange={(e) => setClosedReason(e.target.value as "manual_close" | "tp_hit" | "sl_hit")}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
          >
            <option value="manual_close">Manual Close</option>
            <option value="tp_hit">Take Profit (TP Hit)</option>
            <option value="sl_hit">Stop Loss (SL Hit)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 font-medium mb-1">
            Notes / Review
          </label>
          <textarea
            rows={2}
            placeholder="Post-trade notes or review..."
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "Closing..." : "Close Trade & Log"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
