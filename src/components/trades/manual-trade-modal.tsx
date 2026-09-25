"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import type { OrderType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualTradeModal({ open, onClose, onSuccess }: Props) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"below" | "above">("below"); // below = long, above = short
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [leverage, setLeverage] = useState("");
  const [marginUsd, setMarginUsd] = useState("1");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

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

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/trade-alerts/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          trigger_direction: direction,
          entry_price: Number(entryPrice),
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit: takeProfit ? Number(takeProfit) : null,
          leverage: leverage ? Number(leverage) : null,
          margin_usd: marginUsd ? Number(marginUsd) : 1,
          order_type: orderType,
          notes,
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
      setEntryPrice("");
      setStopLoss("");
      setTakeProfit("");
      setLeverage("");
      setMarginUsd("1");
      setNotes("");
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

        <div className="grid grid-cols-3 gap-3">
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
