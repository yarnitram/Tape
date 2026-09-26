"use client";

import { useState } from "react";
import { mexcChartUrl, cleanSymbol } from "@/lib/format";
import type { PublicShareItem } from "@/lib/types";
import { SocialCardModal } from "./social-card-modal";
import { ChartModal } from "@/components/charts/chart-modal";

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
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  const sym = cleanSymbol(item.symbol);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 w-full">
      <button
        type="button"
        onClick={() => setSocialModalOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
      >
        <span>📸 Export PNG Card</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setChartModalOpen(true)}
          className={`px-3 py-1.5 rounded-lg border font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
            shareType === "watchlist"
              ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
          }`}
        >
          <span>📈 Interactive Chart</span>
        </button>

        <a
          href={mexcChartUrl(item.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${sym} on MEXC Exchange`}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {socialModalOpen && (
        <SocialCardModal
          open={socialModalOpen}
          onClose={() => setSocialModalOpen(false)}
          username={username}
          title={title}
          slug={slug}
          shareType={shareType}
          item={item}
          lastPrice={lastPrice}
        />
      )}

      {chartModalOpen && (
        <ChartModal
          isOpen={chartModalOpen}
          onClose={() => setChartModalOpen(false)}
          symbol={item.symbol}
          setup={{
            symbol: item.symbol,
            side: (item as any).side || null,
            trigger_price: item.trigger_price,
            entry_price: item.entry_price,
            stop_loss: item.stop_loss,
            take_profit: item.take_profit,
            order_type: item.order_type,
          }}
        />
      )}
    </div>
  );
}
