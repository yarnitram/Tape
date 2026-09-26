"use client";

import { useState } from "react";
import { mexcChartUrl, cleanSymbol } from "@/lib/format";
import type { PublicShareItem } from "@/lib/types";
import { SocialCardModal } from "./social-card-modal";

interface Props {
  username: string;
  title: string;
  slug: string;
  shareType: "watchlist" | "trade";
  item: PublicShareItem;
  lastPrice?: number | null;
}

export function PublicCardActions({
  username,
  title,
  slug,
  shareType,
  item,
  lastPrice,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const sym = cleanSymbol(item.symbol);

  return (
    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 w-full">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
      >
        <span>📸 Export PNG Card</span>
      </button>

      <a
        href={mexcChartUrl(item.symbol)}
        target="_blank"
        rel="noopener noreferrer"
        className={`px-3 py-1.5 rounded-lg border font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
          shareType === "watchlist"
            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20"
            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
        }`}
      >
        <span>📈 View {sym} Chart on MEXC</span>
      </a>

      {modalOpen && (
        <SocialCardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          username={username}
          title={title}
          slug={slug}
          shareType={shareType}
          item={item}
          lastPrice={lastPrice}
        />
      )}
    </div>
  );
}
