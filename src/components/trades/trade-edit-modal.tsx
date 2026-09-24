"use client";

import { useState } from "react";
import type { OrderType, TradeAlert } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";

interface Props {
  alert: TradeAlert;
  /** The coin's live max leverage — used as the default when none is saved. */
  maxLeverage: number | null;
  onClose: () => void;
  /** Hand the saved values back so the table updates without re-fetching. */
  onSaved: (id: string, patch: Partial<TradeAlert>) => void;
}

// Selectable order types; aligned with the DB constraint on the column.
const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "limit", label: "Limit" },
  { value: "trigger_limit", label: "Trigger Limit" },
  { value: "market", label: "Market" },
];

// Mirrors the page default: positions start at $1 of margin.
const DEFAULT_MARGIN_USD = 1;

function toStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

/** Blank or non-positive input means "unset" → fall back to the default. */
const inputToNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Blank price input → null; otherwise the parsed number. */
const inputToPrice = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Edit a logged trade: its saved plan (entry / stop / target / order type /
 * notes) and the position sizing used to compute Position and Unrealized PNL.
 */
export function TradeEditModal({ alert, maxLeverage, onClose, onSaved }: Props) {
  const [entry, setEntry] = useState(toStr(alert.entry_price));
  const [stopLoss, setStopLoss] = useState(toStr(alert.stop_loss));
  const [takeProfit, setTakeProfit] = useState(toStr(alert.take_profit));
  const [margin, setMargin] = useState(toStr(alert.margin_usd ?? DEFAULT_MARGIN_USD));
  const [leverage, setLeverage] = useState(
    alert.leverage != null
      ? String(alert.leverage)
      : maxLeverage != null
        ? String(maxLeverage)
        : ""
  );
  const [orderType, setOrderType] = useState<OrderType | "">(
    alert.order_type ?? ""
  );
  const [notes, setNotes] = useState(alert.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "hairline bg-panel px-2.5 py-1.5 text-sm outline-none focus:border-accent w-full";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const entryPrice = inputToPrice(entry);
    const stop = inputToPrice(stopLoss);
    const target = inputToPrice(takeProfit);
    const marginUsd = inputToNum(margin);
    const lev = inputToNum(leverage);
    const order = orderType === "" ? null : orderType;
    const noteText = notes.trim() === "" ? null : notes.trim();

    try {
      const res = await fetch(`/api/trade-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_price: entryPrice,
          stop_loss: stop,
          take_profit: target,
          order_type: order,
          notes: noteText,
          margin_usd: marginUsd,
          leverage: lev,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Save failed");

      onSaved(alert.id, {
        entry_price: entryPrice,
        stop_loss: stop,
        take_profit: target,
        order_type: order,
        notes: noteText,
        margin_usd: marginUsd,
        leverage: lev,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={`Edit ${alert.symbol.replace(/_USDT$/i, "")} trade`}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide mb-3">
            Trade plan
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted mb-3">
            Order type
            <select
              className={`${inputCls} cursor-pointer`}
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType | "")}
            >
              <option value="">— Choose —</option>
              {ORDER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Entry
              <input
                type="number"
                step="any"
                className={inputCls}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="—"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Stop loss
              <input
                type="number"
                step="any"
                className={inputCls}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="—"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Take profit
              <input
                type="number"
                step="any"
                className={inputCls}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="—"
              />
            </label>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted uppercase tracking-wide mb-3">
            Position sizing
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Margin (USD)
              <input
                type="number"
                step="any"
                min="0"
                className={inputCls}
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder={String(DEFAULT_MARGIN_USD)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Leverage
              <input
                type="number"
                step="any"
                min="0"
                className={inputCls}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder={maxLeverage != null ? String(maxLeverage) : "—"}
              />
            </label>
          </div>
          <p className="text-xs text-muted mt-2">
            Margin defaults to ${DEFAULT_MARGIN_USD}, and leverage to the
            coin&apos;s maximum
            {maxLeverage != null ? ` (${maxLeverage}×)` : ""}. Leave a field
            blank to use the default.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Notes
          <textarea
            rows={3}
            className={inputCls}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why this trade?"
          />
        </label>

        {error && <div className="text-xs text-loss">{error}</div>}

        <div className="flex justify-end gap-2 hairline-t pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs btn-ghost cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save trade"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
