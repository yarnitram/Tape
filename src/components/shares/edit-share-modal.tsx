"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import type { PublicShareLink } from "@/lib/types";
import { cleanSymbol } from "@/lib/format";

interface Props {
  share: PublicShareLink;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: PublicShareLink) => void;
  username: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function EditShareModal({
  share,
  open,
  onClose,
  onSaved,
  username,
}: Props) {
  const [title, setTitle] = useState(share.title);
  const [slug, setSlug] = useState(share.slug);
  const [notes, setNotes] = useState(share.notes || "");
  const [isActive, setIsActive] = useState(share.is_active);
  const [entryPrice, setEntryPrice] = useState(
    share.entry_price != null ? String(share.entry_price) : ""
  );
  const [stopLoss, setStopLoss] = useState(
    share.stop_loss != null ? String(share.stop_loss) : ""
  );
  const [takeProfit, setTakeProfit] = useState(
    share.take_profit != null ? String(share.take_profit) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/shares/${share.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          is_active: isActive,
          notes: notes.trim() || null,
          entry_price: entryPrice ? Number(entryPrice) : null,
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit: takeProfit ? Number(takeProfit) : null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save share link");
      }

      const data = await res.json();
      onSaved(data.share);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "hairline bg-panel px-3 py-2 text-xs outline-none focus:border-accent w-full rounded";

  return (
    <ModalShell title={`✏️ Edit ${cleanSymbol(share.symbol)} Public Share`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        {/* Status Active Toggle */}
        <label className="flex items-center justify-between p-3 rounded bg-panel/60 border border-hairline cursor-pointer">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-xs">Public Visibility</span>
            <span className="text-[11px] text-muted">
              {isActive ? "Anyone with the link can view your setup." : "Setup is hidden (Private 404)."}
            </span>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-accent h-4 w-4 cursor-pointer"
          />
        </label>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-muted font-medium">
            Page Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              className={`${inputCls} font-mono`}
              required
            />
          </label>
        </div>

        {/* Live URL Preview */}
        <div className="p-2.5 rounded bg-panel/60 border border-hairline flex flex-col gap-0.5">
          <span className="text-[10px] text-muted">Public Link URL:</span>
          <span className="font-mono text-accent text-xs truncate">
            {typeof window !== "undefined" ? window.location.origin : ""}/{username || "username"}/{slug}
          </span>
        </div>

        {/* Price Targets */}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-muted">
            Entry Price ($)
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={`${inputCls} font-mono`}
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
            />
          </label>
        </div>

        {/* Notes */}
        <label className="flex flex-col gap-1 text-muted font-medium">
          Public Trader Notes
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            disabled={saving}
            className="accent-btn px-4 py-1.5 text-xs font-semibold rounded cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
