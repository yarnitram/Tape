"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import type { WatchlistItem, TradeAlert, PublicShareLink, PublicShareItem } from "@/lib/types";
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
  const [title, setTitle] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [pageNotes, setPageNotes] = useState<string>("");
  const [items, setItems] = useState<PublicShareItem[]>([]);
  const [customSymbol, setCustomSymbol] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(slugify(val));
  };

  const handleToggleImportWatchlist = (w: WatchlistItem, checked: boolean) => {
    if (checked) {
      if (items.some((i) => i.id === w.id)) return;
      const newItem: PublicShareItem = {
        id: w.id,
        symbol: w.symbol,
        share_type: "watchlist",
        trigger_direction: w.trigger_direction,
        entry_price: w.entry_price,
        stop_loss: w.stop_loss,
        take_profit: w.take_profit,
        notes: w.notes || "",
      };
      setItems((prev) => [...prev, newItem]);
      if (!title) {
        const sym = cleanSymbol(w.symbol);
        setTitle(`${sym} Breakout Plan`);
        setSlug(slugify(`${sym}-breakout-plan`));
      }
    } else {
      setItems((prev) => prev.filter((i) => i.id !== w.id));
    }
  };

  const handleToggleImportTrade = (t: TradeAlert, checked: boolean) => {
    if (checked) {
      if (items.some((i) => i.id === t.id)) return;
      const newItem: PublicShareItem = {
        id: t.id,
        symbol: t.symbol,
        share_type: "trade",
        trigger_direction: t.trigger_direction,
        entry_price: t.entry_price ?? t.fired_price,
        stop_loss: t.stop_loss,
        take_profit: t.take_profit,
        notes: t.notes || "",
      };
      setItems((prev) => [...prev, newItem]);
      if (!title) {
        const sym = cleanSymbol(t.symbol);
        setTitle(`${sym} Trade Setup`);
        setSlug(slugify(`${sym}-trade-setup`));
      }
    } else {
      setItems((prev) => prev.filter((i) => i.id !== t.id));
    }
  };

  const handleAddCustomToken = () => {
    const sym = customSymbol.trim().toUpperCase();
    if (!sym) return;
    const formatted = sym.includes("_") ? sym : `${sym}_USDT`;
    const newItem: PublicShareItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      symbol: formatted,
      share_type: "watchlist",
      trigger_direction: "above",
      entry_price: null,
      stop_loss: null,
      take_profit: null,
      notes: "",
    };
    setItems((prev) => [...prev, newItem]);
    setCustomSymbol("");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<PublicShareItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
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
    if (items.length === 0) {
      setError("Please select or add at least 1 coin setup to this share page.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          share_type: items[0]?.share_type || "watchlist",
          symbol: items.map((i) => i.symbol).join(", "),
          items,
          notes: pageNotes.trim() || null,
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
    <ModalShell title="🔗 Create Multi-Token Share Page" onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {!username && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            ⚠️ You need to set a Username Handle in Settings first to generate public URLs.
          </div>
        )}

        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-muted font-medium">
            Page Title *
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Solana Ecosystem & Altcoin Plays"
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
              placeholder="e.g. solana-ecosystem-plays"
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

        {/* Top Page Thesis / Notes */}
        <label className="flex flex-col gap-1 text-muted font-medium">
          Overall Page Thesis / Description (Optional)
          <textarea
            rows={2}
            value={pageNotes}
            onChange={(e) => setPageNotes(e.target.value)}
            placeholder="Introduce your shared setup list to your followers..."
            className={`${inputCls} resize-none`}
          />
        </label>

        {/* Import Coins Checklist Section */}
        <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-panel/40 border border-hairline">
          <span className="font-semibold text-text text-xs">Select Coins to Include on Share Page ({items.length} selected)</span>

          {/* Quick Add Custom Token */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              placeholder="Or enter coin symbol (e.g. SOL, BTC)..."
              className={`${inputCls} font-mono max-w-xs`}
            />
            <button
              type="button"
              onClick={handleAddCustomToken}
              className="px-3 py-2 bg-panel hover:bg-panel-soft text-text border border-hairline rounded font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              + Add Custom Coin
            </button>
          </div>

          {/* Watchlist & Trade Alerts Quick Import Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-40 overflow-y-auto p-2 border border-hairline rounded bg-panel/20">
            {/* Watchlist Items */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-muted">Watchlist Items</span>
              {watchlistItems.length === 0 ? (
                <span className="text-[11px] text-muted">No watchlist items</span>
              ) : (
                watchlistItems.map((w) => {
                  const isChecked = items.some((i) => i.id === w.id);
                  return (
                    <label key={w.id} className="flex items-center gap-2 cursor-pointer text-xs hover:text-text">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleImportWatchlist(w, e.target.checked)}
                        className="accent-accent h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="font-semibold">{cleanSymbol(w.symbol)}</span>
                      <span className="text-muted font-mono text-[11px] ml-auto">
                        ${w.trigger_price ?? w.alert_price ?? "N/A"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Trade Alerts */}
            <div className="flex flex-col gap-1.5 border-l border-hairline pl-3">
              <span className="text-[10px] font-semibold uppercase text-muted">Active Trade Alerts</span>
              {tradeAlerts.length === 0 ? (
                <span className="text-[11px] text-muted">No trade alerts</span>
              ) : (
                tradeAlerts.map((t) => {
                  const isChecked = items.some((i) => i.id === t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer text-xs hover:text-text">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleImportTrade(t, e.target.checked)}
                        className="accent-accent h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="font-semibold">{cleanSymbol(t.symbol)}</span>
                      <span className="text-muted font-mono text-[11px] ml-auto">
                        EP ${t.entry_price ?? t.fired_price ?? "N/A"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Selected Items Details Editor */}
        {items.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-text text-xs">Configure Setup Targets for Each Coin</span>
            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg border border-hairline bg-panel/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text">#{idx + 1} {cleanSymbol(item.symbol)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateItem(item.id, {
                            trigger_direction: item.trigger_direction === "below" ? "above" : "below",
                          })
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                          item.trigger_direction === "below"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {item.trigger_direction === "below" ? "SHORT" : "LONG"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-xs text-muted hover:text-rose-400 cursor-pointer"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 text-[11px] text-muted">
                      Entry Price ($)
                      <input
                        type="number"
                        step="any"
                        value={item.entry_price != null ? String(item.entry_price) : ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            entry_price: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="0.00"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] text-muted">
                      Stop Loss ($)
                      <input
                        type="number"
                        step="any"
                        value={item.stop_loss != null ? String(item.stop_loss) : ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            stop_loss: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="0.00"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] text-muted">
                      Take Profit ($)
                      <input
                        type="number"
                        step="any"
                        value={item.take_profit != null ? String(item.take_profit) : ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            take_profit: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="0.00"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                    placeholder={`Notes/Thesis for ${cleanSymbol(item.symbol)}...`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
            disabled={submitting || !username || items.length === 0}
            className="accent-btn px-4 py-1.5 text-xs font-semibold rounded cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Publishing…" : `🚀 Publish ${items.length} Coin Setup Page`}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
