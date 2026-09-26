"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import type { WatchlistItem, TradeAlert, PublicShareLink } from "@/lib/types";
import { cleanSymbol, fmtPlanPx } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (share: PublicShareLink) => void;
  username: string | null;
  watchlistItems: WatchlistItem[];
  tradeAlerts: TradeAlert[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function CreateShareModal({
  open,
  onClose,
  onCreated,
  username,
  watchlistItems,
  tradeAlerts,
}: Props) {
  const [sourceType, setSourceType] = useState<"watchlist" | "trade">("watchlist");
  const [selectedId, setSelectedId] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSourceSelect = (id: string) => {
    setSelectedId(id);
    if (!id) return;

    if (sourceType === "watchlist") {
      const item = watchlistItems.find((w) => w.id === id);
      if (item) {
        const sym = cleanSymbol(item.symbol);
        setSymbol(item.symbol);
        setTitle(`${sym} Breakout Watch`);
        setSlug(slugify(`${sym}-watch`));
        setEntryPrice(item.entry_price ? String(item.entry_price) : "");
        setStopLoss(item.stop_loss ? String(item.stop_loss) : "");
        setTakeProfit(item.take_profit ? String(item.take_profit) : "");
        setNotes(item.notes || "");
      }
    } else {
      const alert = tradeAlerts.find((t) => t.id === id);
      if (alert) {
        const sym = cleanSymbol(alert.symbol);
        setTitle(`${sym} Trade Setup`);
        setSlug(slugify(`${sym}-trade-setup`));
        setSymbol(alert.symbol);
        setEntryPrice(alert.entry_price || alert.fired_price ? String(alert.entry_price ?? alert.fired_price) : "");
        setStopLoss(alert.stop_loss ? String(alert.stop_loss) : "");
        setTakeProfit(alert.take_profit ? String(alert.take_profit) : "");
        setNotes(alert.notes || "");
      }
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError("You must set a Username Handle in Settings before publishing share links.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!symbol.trim()) {
      setError("Please select or enter a symbol.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_type: sourceType,
          title: title.trim(),
          slug: slug.trim(),
          symbol: symbol.trim(),
          watchlist_item_id: sourceType === "watchlist" ? selectedId || null : null,
          trade_alert_id: sourceType === "trade" ? selectedId || null : null,
          entry_price: entryPrice ? Number(entryPrice) : null,
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit: takeProfit ? Number(takeProfit) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create share link");
      }

      const data = await res.json();
      onCreated(data.share);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "hairline bg-panel px-3 py-2 text-xs outline-none focus:border-accent w-full rounded";

  return (
    <ModalShell title="🔗 Create Public Share Page" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        {!username && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            ⚠️ You need to set a Username Handle in Settings first to generate public URLs.
          </div>
        )}

        {/* Source Type Selector */}
        <div className="flex items-center gap-3">
          <label className="text-muted font-medium">Link Source:</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSourceType("watchlist");
                setSelectedId("");
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                sourceType === "watchlist"
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "bg-panel text-muted hover:text-text border border-hairline"
              }`}
            >
              Watchlist Token
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceType("trade");
                setSelectedId("");
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                sourceType === "trade"
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "bg-panel text-muted hover:text-text border border-hairline"
              }`}
            >
              Trade Alert
            </button>
          </div>
        </div>

        {/* Item Dropdown */}
        <label className="flex flex-col gap-1 text-muted font-medium">
          Select {sourceType === "watchlist" ? "Watchlist Token" : "Trade Alert"}
          <select
            value={selectedId}
            onChange={(e) => handleSourceSelect(e.target.value)}
            className={`${inputCls} font-mono`}
          >
            <option value="">-- Choose from active list --</option>
            {sourceType === "watchlist"
              ? watchlistItems.map((w) => (
                  <option key={w.id} value={w.id}>
                    {cleanSymbol(w.symbol)} — trigger ${w.trigger_price ?? w.alert_price ?? "N/A"}
                  </option>
                ))
              : tradeAlerts.map((t) => (
                  <option key={t.id} value={t.id}>
                    {cleanSymbol(t.symbol)} ({t.trigger_direction?.toUpperCase()}) — EP ${t.entry_price ?? t.fired_price ?? "N/A"}
                  </option>
                ))}
          </select>
        </label>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-muted font-medium">
            Page Title *
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Solana Breakout Plan"
              className={inputCls}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-muted font-medium">
            URL Slug
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="e.g. solana-breakout"
              className={`${inputCls} font-mono`}
              required
            />
          </label>
        </div>

        {/* Live URL Preview */}
        <div className="p-2.5 rounded bg-panel/60 border border-hairline flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Public Link Preview:</span>
          <span className="font-mono text-accent text-xs truncate">
            {typeof window !== "undefined" ? window.location.origin : ""}/{username || "username"}/{slug || "slug"}
          </span>
        </div>

        {/* Plan Parameters */}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-muted">
            Entry Price ($)
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="0.00"
            />
          </label>
          <label className="flex flex-col gap-1 text-muted">
            Stop Loss ($)
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="0.00"
            />
          </label>
          <label className="flex flex-col gap-1 text-muted">
            Take Profit ($)
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="0.00"
            />
          </label>
        </div>

        {/* Public Commentary / Notes */}
        <label className="flex flex-col gap-1 text-muted font-medium">
          Public Trader Notes & Thesis
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share your analysis, timeframe, or key levels for followers..."
            className={`${inputCls} resize-none`}
          />
        </label>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-muted hover:text-text cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !username}
            className="accent-btn px-4 py-1.5 text-xs font-semibold rounded cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Publishing…" : "🚀 Publish Share Page"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
