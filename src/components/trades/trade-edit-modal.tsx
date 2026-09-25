"use client";

import { useState } from "react";
import type { OrderType, TradeAlert, ArchivedTradeAlert } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";
import { calculateTradePnl } from "@/lib/trade-calc";

interface Props {
  alert: TradeAlert | ArchivedTradeAlert;
  isArchived?: boolean;
  maxLeverage?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "trigger_limit", label: "Trigger Limit" },
];

function toStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

const inputToNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const inputToPrice = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function TradeEditModal({
  alert,
  isArchived = false,
  maxLeverage,
  onClose,
  onSaved,
}: Props) {
  const isClosedInit = isArchived
    ? (alert as ArchivedTradeAlert).status_at_archive === "closed"
    : (alert as TradeAlert).status === "closed";

  const [symbol, setSymbol] = useState(alert.symbol.replace(/_USDT$/i, ""));
  const [direction, setDirection] = useState<"below" | "above">(
    alert.trigger_direction === "above" ? "above" : "below"
  );
  const [triggerPrice, setTriggerPrice] = useState(toStr(alert.trigger_price));
  const [firedPrice, setFiredPrice] = useState(toStr(alert.fired_price));
  const [entry, setEntry] = useState(toStr(alert.entry_price));
  const [stopLoss, setStopLoss] = useState(toStr(alert.stop_loss));
  const [takeProfit, setTakeProfit] = useState(toStr(alert.take_profit));
  const [margin, setMargin] = useState(toStr(alert.margin_usd ?? 1));
  const [leverage, setLeverage] = useState(
    alert.leverage != null
      ? String(alert.leverage)
      : maxLeverage != null
      ? String(maxLeverage)
      : ""
  );
  const [orderType, setOrderType] = useState<OrderType | "">(
    alert.order_type ?? "market"
  );
  const [notes, setNotes] = useState(alert.notes ?? "");

  // Status and closure fields
  const [status, setStatus] = useState<"active" | "closed">(
    isClosedInit ? "closed" : "active"
  );
  const [exitPrice, setExitPrice] = useState(toStr(alert.exit_price));
  const [closedReason, setClosedReason] = useState<
    "manual_close" | "tp_hit" | "sl_hit"
  >(alert.closed_reason || "manual_close");
  const [closeNotes, setCloseNotes] = useState(alert.close_notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numEntry = inputToPrice(entry) ?? inputToPrice(firedPrice);
  const numExit = inputToPrice(exitPrice);
  const pnl = calculateTradePnl(
    numEntry,
    numExit,
    direction,
    inputToNum(margin),
    inputToNum(leverage)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      symbol: symbol.trim(),
      trigger_direction: direction,
      trigger_price: inputToPrice(triggerPrice),
      fired_price: inputToPrice(firedPrice),
      entry_price: inputToPrice(entry),
      stop_loss: inputToPrice(stopLoss),
      take_profit: inputToPrice(takeProfit),
      margin_usd: inputToNum(margin),
      leverage: inputToNum(leverage),
      order_type: orderType === "" ? null : orderType,
      notes: notes.trim() === "" ? null : notes.trim(),
      status,
      status_at_archive: status,
      exit_price: status === "closed" ? numExit : null,
      closed_reason: status === "closed" ? closedReason : null,
      close_notes: status === "closed" && closeNotes.trim() !== "" ? closeNotes.trim() : null,
    };

    const endpoint = isArchived
      ? `/api/archived-trades/${alert.id}`
      : `/api/trade-alerts/${alert.id}`;

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update trade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={`Modify Trade — ${alert.symbol.replace(/_USDT$/i, "")}`}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Section 1: Token & Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Symbol <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Direction <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDirection("below")}
                className={`py-1.5 text-xs font-semibold rounded ${
                  direction === "below"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => setDirection("above")}
                className={`py-1.5 text-xs font-semibold rounded ${
                  direction === "above"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Triggers & Execution */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Trigger Price
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Fired Price
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={firedPrice}
              onChange={(e) => setFiredPrice(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            >
              {ORDER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Trade Plan (Entry, SL, TP) */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Entry Price
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Stop Loss (SL)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Take Profit (TP)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Section 4: Position Sizing (Margin & Leverage) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Margin ($)
            </label>
            <input
              type="number"
              step="any"
              placeholder="1"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Leverage (x)
            </label>
            <input
              type="number"
              step="any"
              placeholder="Max / Custom"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Section 5: Status & Closure */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Trade Status
            </span>
            <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("closed")}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  status === "closed"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Closed
              </button>
            </div>
          </div>

          {status === "closed" && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">
                    Exit Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">
                    Closed Reason
                  </label>
                  <select
                    value={closedReason}
                    onChange={(e) =>
                      setClosedReason(
                        e.target.value as "manual_close" | "tp_hit" | "sl_hit"
                      )
                    }
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="manual_close">Manual Close</option>
                    <option value="tp_hit">TP Hit</option>
                    <option value="sl_hit">SL Hit</option>
                  </select>
                </div>
              </div>

              {pnl.realizedPnlUsd != null && pnl.realizedPnlPct != null && (
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                    pnl.realizedPnlUsd >= 0
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  <span>Calculated Realized PnL:</span>
                  <span className="font-mono">
                    {pnl.realizedPnlUsd >= 0 ? "+" : ""}$
                    {pnl.realizedPnlUsd.toFixed(2)} (
                    {pnl.realizedPnlUsd >= 0 ? "+" : ""}
                    {(pnl.realizedPnlPct * 100).toFixed(2)}%)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 font-medium mb-1">
                  Close Notes
                </label>
                <input
                  type="text"
                  placeholder="Exit reasoning or review notes..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Notes */}
        <div>
          <label className="block text-xs text-zinc-400 font-medium mb-1">
            General / Strategy Notes
          </label>
          <textarea
            rows={2}
            placeholder="Trade thesis, notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
