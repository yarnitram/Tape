"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { buildPublicShareUrl } from "@/lib/share";
import { cleanSymbol, fmtPlanPx } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  item: {
    id: string;
    symbol: string;
    type: "watchlist" | "trade";
    is_public?: boolean;
    share_token?: string | null;
    entry_price?: number | null;
    stop_loss?: number | null;
    take_profit?: number | null;
  };
  onUpdate?: (updated: { is_public: boolean; share_token: string | null }) => void;
}

export function ShareModal({ open, onClose, item, onUpdate }: Props) {
  const [isPublic, setIsPublic] = useState(Boolean(item.is_public));
  const [shareToken, setShareToken] = useState<string | null>(item.share_token ?? null);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const publicUrl = shareToken ? buildPublicShareUrl(shareToken) : "";

  const handleToggle = async (nextPublic: boolean) => {
    setToggling(true);
    try {
      const res = await fetch("/api/share/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          id: item.id,
          is_public: nextPublic,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle share state");
      }

      const data = await res.json();
      setIsPublic(data.item.is_public);
      setShareToken(data.item.share_token);

      if (onUpdate) {
        onUpdate({
          is_public: data.item.is_public,
          share_token: data.item.share_token,
        });
      }
    } catch {
      /* ignore */
    } finally {
      setToggling(false);
    }
  };

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleTwitterShare = () => {
    const sym = cleanSymbol(item.symbol);
    const ep = item.entry_price ? fmtPlanPx(item.entry_price) : "";
    const sl = item.stop_loss ? fmtPlanPx(item.stop_loss) : "";
    const tp = item.take_profit ? fmtPlanPx(item.take_profit) : "";

    const text = `$${sym} Trade Setup on Tape 🚀\nEP: ${ep} · SL: ${sl} · TP: ${tp}\nView live setup:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <ModalShell title={`🔗 Share ${cleanSymbol(item.symbol)} Setup`} onClose={onClose}>
      <div className="flex flex-col gap-5 text-sm">
        {/* Toggle Public Switch */}
        <label className="flex items-center justify-between p-3.5 rounded-xl bg-panel/60 border border-hairline cursor-pointer">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-xs">Public Shareable Link</span>
            <span className="text-[11px] text-muted">
              Anyone with the link can view live setup metrics and price targets without logging in.
            </span>
          </div>
          <input
            type="checkbox"
            checked={isPublic}
            disabled={toggling}
            onChange={(e) => handleToggle(e.target.checked)}
            className="accent-accent h-4 w-4 cursor-pointer"
          />
        </label>

        {/* Generated Share URL box */}
        {isPublic && publicUrl && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Public Link
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  className="hairline bg-panel px-3 py-2 text-xs outline-none w-full rounded font-mono text-accent"
                  value={publicUrl}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 text-xs accent-btn font-semibold rounded whitespace-nowrap cursor-pointer"
                >
                  {copied ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>
            </label>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTwitterShare}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>🐦</span> Share on X (Twitter)
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-panel hover:bg-panel-soft text-text border border-hairline cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>↗</span> Open Public Page
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-muted hover:text-foreground cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
