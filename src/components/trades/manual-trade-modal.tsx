"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import type { OrderType } from "@/lib/types";
import { calculateTradePnl } from "@/lib/trade-calc";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualTradeModal({ open, onClose, onSuccess }: Props) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"below" | "above">("below"); // below = long, above = short
  const [triggerPrice, setTriggerPrice] = useState("");
  const [firedPrice, setFiredPrice] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [leverage, setLeverage] = useState("");
  const [marginUsd, setMarginUsd] = useState("1");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [notes, setNotes] = useState("");

  // Status & Closure
  const [status, setStatus] = useState<"active" | "closed">("active");
  const [exitPrice, setExitPrice] = useState("");
  const [closedReason, setClosedReason] = useState<"manual_close" | "tp_hit" | "sl_hit">("manual_close");
  const [closeNotes, setCloseNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const numEntry = entryPrice ? Number(entryPrice) : firedPrice ? Number(firedPrice) : null;
  const numExit = exitPrice ? Number(exitPrice) : null;
  const pnl = calculateTradePnl(
    numEntry,
    numExit,
    direction,
    marginUsd ? Number(marginUsd) : 1,
    leverage ? Number(leverage) : 1
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) {
      setError("Please enter a coin symbol (e.g. BTC, ETH)");
      return;
    }
    if (!entryPrice || Number(entryPrice) <= 0) {
      setError("Please enter a valid entry price");
      return;
    }
    if (status === "closed" && (!exitPrice || Number(exitPrice) <= 0)) {
      setError("Exit price is required when creating a closed trade");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/trade-alerts/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          trigger_direction: direction,
          trigger_price: triggerPrice ? Number(triggerPrice) : null,
          fired_price: firedPrice ? Number(firedPrice) : Number(entryPrice),
          entry_price: Number(entryPrice),
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit: takeProfit ? Number(takeProfit) : null,
          leverage: leverage ? Number(leverage) : null,
          margin_usd: marginUsd ? Number(marginUsd) : 1,
          order_type: orderType,
          notes,
          status,
          exit_price: status === "closed" ? Number(exitPrice) : null,
          closed_reason: status === "closed" ? closedReason : null,
          close_notes: status === "closed" ? closeNotes : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create trade");
      }

      onSuccess();
      onClose();
      // Reset form
      setSymbol("");
      setTriggerPrice("");
      setFiredPrice("");
      setEntryPrice("");
      setStopLoss("");
      setTakeProfit("");
      setLeverage("");
      setMarginUsd("1");
      setNotes("");
      setStatus("active");
      setExitPrice("");
      setCloseNotes("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating trade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="Add Manual Trade">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Symbol <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BTC or BTC_USDT"
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
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
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
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
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
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="trigger_limit">Trigger Limit</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Entry Price <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              required
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
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
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
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 font-medium mb-1">
              Margin ($)
            </label>
            <input
              type="number"
              step="any"
              placeholder="1"
              value={marginUsd}
              onChange={(e) => setMarginUsd(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
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
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Status Option: Active vs Closed */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Initial Status
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
                    Exit Price <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                    required={status === "closed"}
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
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 font-medium mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            placeholder="Pre-trade notes or strategy..."
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
            {saving ? "Adding..." : "Add Trade"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
