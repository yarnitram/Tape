"use client";

import { useState } from "react";
import type { TradeWithExtras } from "@/lib/types";
import { money, percent, r } from "@/lib/format";
import { ModalShell } from "@/components/ui/modal-shell";
import { uploadScreenshot } from "@/lib/screenshot-upload";

interface Props {
  trade: TradeWithExtras;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (t: TradeWithExtras) => void;
}

export function TradeDetailModal({ trade, onClose, onDelete, onEdit }: Props) {
  const pnl = trade.pnl_dollars ?? 0;
  const pct = trade.pnl_pct ?? 0;
  const isGain = pnl > 0;
  const isLoss = pnl < 0;
  const isOpen = trade.status === "open";

  const [screenshot, setScreenshot] = useState<string | null>(
    trade.notes?.screenshot_url ?? null
  );
  const [lightbox, setLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadScreenshot(file, trade.id);
      const res = await fetch("/api/trades/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: trade.id, url }),
      });
      if (!res.ok) throw new Error("Failed to save screenshot");
      setScreenshot(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveScreenshot() {
    await fetch("/api/trades/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: trade.id, url: null }),
    });
    setScreenshot(null);
  }

  const stat = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <>
      <ModalShell title={`${trade.symbol} · ${trade.direction}`} onClose={onClose}>
        <div className="flex flex-col gap-5">
          {/* Big P&L */}
          <div className="hairline-b pb-4">
            <div className="text-xs text-muted uppercase tracking-wide mb-1">
              Realized P&amp;L
            </div>
            <div
              className={`num text-4xl font-semibold ${
                isGain ? "text-gain" : isLoss ? "text-loss" : "text-text"
              }`}
            >
              {isOpen ? "— · open" : pnl >= 0 ? "+" : ""}
              {isOpen ? "" : money(Math.abs(pnl))}
            </div>
            {!isOpen && (
              <div
                className={`num text-sm mt-1 ${
                  isGain ? "text-gain" : isLoss ? "text-loss" : "text-muted"
                }`}
              >
                {percent(pct)} · {r(trade.r_multiple)}
              </div>
            )}
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stat("Entry", price(trade.entry_price))}
            {stat("Exit", trade.exit_price != null ? price(trade.exit_price) : "—")}
            {stat("Size", num(trade.size))}
            {stat("Stop", trade.stop_price != null ? price(trade.stop_price) : "—")}
            {stat("Fees", money(trade.fees))}
            {stat(
              "R-Multiple",
              trade.r_multiple != null ? r(trade.r_multiple) : "—"
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs text-muted mb-1">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {trade.tags.length ? (
                trade.tags.map((tg) => (
                  <span key={tg.id} className="hairline px-2 py-1 text-xs">
                    {tg.name}
                  </span>
                ))
              ) : (
                <span className="text-muted text-sm">No tags</span>
              )}
            </div>
          </div>

          {/* Notes */}
          {(trade.notes?.pre_trade_thesis ||
            trade.notes?.post_trade_review ||
            trade.notes?.discipline_score != null) && (
            <div className="flex flex-col gap-3">
              {trade.notes?.pre_trade_thesis && (
                <div>
                  <div className="text-xs text-muted mb-1">
                    Pre-trade thesis
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {trade.notes.pre_trade_thesis}
                  </p>
                </div>
              )}
              {trade.notes?.post_trade_review && (
                <div>
                  <div className="text-xs text-muted mb-1">
                    Post-trade review
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {trade.notes.post_trade_review}
                  </p>
                </div>
              )}
              {trade.notes?.discipline_score != null && (
                <div>
                  <div className="text-xs text-muted mb-1">Discipline</div>
                  <div className="text-lg">
                    {"★".repeat(trade.notes.discipline_score)}
                    <span className="text-muted">
                      {"★".repeat(5 - trade.notes.discipline_score)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Screenshot */}
          <div>
            <div className="text-xs text-muted mb-2">Screenshot</div>
            {screenshot ? (
              <div className="flex flex-col gap-2 items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshot}
                  alt={`${trade.symbol} chart screenshot`}
                  onClick={() => setLightbox(true)}
                  className="max-w-sm cursor-zoom-in border border-line"
                />
                <div className="flex gap-2">
                  <label className="text-xs btn-ghost px-2 py-1 cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    className="text-xs text-loss hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="inline-block text-xs btn-ghost px-3 py-2 cursor-pointer">
                {uploading ? "Uploading…" : "+ Add screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
            {error && <div className="text-sm text-loss mt-2">{error}</div>}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 hairline-t">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Delete this trade?</span>
                <button
                  className="px-3 py-1 border border-loss text-loss text-sm cursor-pointer"
                  onClick={() => onDelete(trade.id)}
                >
                  Confirm
                </button>
                <button
                  className="py-1 text-muted hover:text-text text-sm cursor-pointer"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="text-sm text-loss hover:underline cursor-pointer"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
            <button
              className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer"
              onClick={() => onEdit(trade)}
            >
              Edit
            </button>
          </div>
        </div>
      </ModalShell>

      {lightbox && screenshot && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshot}
            alt="Screenshot full view"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}

function price(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function num(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}