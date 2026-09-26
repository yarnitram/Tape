import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanSymbol, mexcChartUrl, fmtPlanPx } from "@/lib/format";
import type { PublicShareLink, PublicShareItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Reserved route names to avoid route collisions
const RESERVED_NAMES = new Set([
  "watchlist",
  "trades",
  "journal",
  "settings",
  "analytics",
  "risk",
  "notifications",
  "shares",
  "login",
  "auth",
  "api",
  "public",
  "share",
  "_next",
  "favicon.ico",
]);

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

interface MexcTicker {
  lastPrice: number | null;
  riseFallRate: number | null;
}

async function getPublicShareData(username: string, slug: string): Promise<{
  share: PublicShareLink;
  userEmail: string;
} | null> {
  if (RESERVED_NAMES.has(username.toLowerCase())) {
    return null;
  }

  const supabase = await createClient();

  // Find user by username
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id, username")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!settings) return null;

  // Find public share link
  const { data: share } = await supabase
    .from("public_share_links")
    .select("*")
    .eq("user_id", settings.user_id)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (!share) return null;

  return {
    share: {
      ...share,
      username: settings.username,
    },
    userEmail: username,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await getPublicShareData(username, slug);

  if (!data || !data.share.is_active) {
    return {
      title: "Private Setup | Tape",
      description: "This trade setup is private or no longer available.",
    };
  }

  const { share } = data;
  const symbols = Array.isArray(share.items) && share.items.length > 0
    ? share.items.map((i) => `$${cleanSymbol(i.symbol)}`).join(", ")
    : `$${cleanSymbol(share.symbol)}`;

  const title = `🚀 ${symbols} Setups | @${username} on Tape`;
  const description = `${share.title} — Shared watchlist & trade setups on Tape.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Tape Trading Setup Journal",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { username, slug } = await params;
  const data = await getPublicShareData(username, slug);

  if (!data) {
    notFound();
  }

  const { share } = data;

  if (!share.is_active) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center border border-zinc-800 bg-zinc-900/60 rounded-2xl p-8 backdrop-blur">
          <span className="text-4xl mb-3 block">🔒</span>
          <h1 className="text-xl font-bold mb-2">Private or Paused Setup Page</h1>
          <p className="text-xs text-zinc-400 mb-6">
            The owner of this page (@{username}) has set it to private or paused visibility.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
          >
            Go to Tape Home
          </a>
        </div>
      </div>
    );
  }

  // Increment view count asynchronously
  const supabase = await createClient();
  supabase
    .from("public_share_links")
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq("id", share.id)
    .then(() => {});

  // Determine items list (multi-token or single fallback)
  const items: PublicShareItem[] = Array.isArray(share.items) && share.items.length > 0
    ? share.items
    : [
        {
          id: "item-1",
          symbol: share.symbol,
          share_type: share.share_type,
          trigger_direction: share.trigger_direction,
          entry_price: share.entry_price,
          stop_loss: share.stop_loss,
          take_profit: share.take_profit,
          notes: share.notes,
        },
      ];

  // Fetch live prices from MEXC for all symbols in parallel
  const tickers: Record<string, MexcTicker> = {};
  await Promise.all(
    items.map(async (item) => {
      try {
        const sym = item.symbol.endsWith("_USDT") ? item.symbol : `${item.symbol}_USDT`;
        const res = await fetch(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${sym}`, {
          next: { revalidate: 10 },
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.data) {
            tickers[item.symbol.toUpperCase()] = {
              lastPrice: Number(d.data.lastPrice) || null,
              riseFallRate: Number(d.data.riseFallRate) || null,
            };
          }
        }
      } catch {
        /* ignore */
      }
    })
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <div className="w-full max-w-3xl flex flex-col gap-6 my-auto">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Tape
            </span>
            <span className="text-zinc-600 font-mono">/</span>
            <span className="text-xs text-zinc-400 font-mono">@{username}</span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
            {items.length} {items.length === 1 ? "Coin Setup" : "Coin Setups"}
          </span>
        </div>

        {/* Page Title & Overall Thesis */}
        <div className="flex flex-col gap-1.5 border-b border-zinc-800/80 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{share.title}</h1>
          {share.notes && (
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{share.notes}</p>
          )}
        </div>

        {/* Setups Cards List */}
        <div className="flex flex-col gap-5">
          {items.map((item) => {
            const sym = cleanSymbol(item.symbol);
            const side = item.trigger_direction === "below" ? "SHORT" : "LONG";
            const ticker = tickers[item.symbol.toUpperCase()];
            const lastPrice = ticker?.lastPrice ?? null;
            const riseFallRate = ticker?.riseFallRate ?? null;

            let rrRatio: string | null = null;
            if (item.entry_price && item.stop_loss && item.take_profit) {
              const risk = Math.abs(item.entry_price - item.stop_loss);
              const reward = Math.abs(item.take_profit - item.entry_price);
              if (risk > 0) {
                rrRatio = (reward / risk).toFixed(2);
              }
            }

            let pnlPct: number | null = null;
            if (lastPrice && item.entry_price && item.entry_price > 0) {
              const dir = side === "LONG" ? 1 : -1;
              pnlPct = dir * ((lastPrice / item.entry_price) - 1) * 100;
            }

            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col gap-4"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-zinc-100">{sym}</span>
                    <span className="text-xs font-mono text-zinc-500">USDT</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        side === "LONG"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {side}
                    </span>
                  </div>

                  {lastPrice != null && (
                    <div className="flex flex-col items-end">
                      <span className="text-base font-mono font-bold text-zinc-100 tabular-nums">
                        ${lastPrice}
                      </span>
                      {riseFallRate != null && (
                        <span
                          className={`text-[11px] font-mono tabular-nums ${
                            riseFallRate >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {riseFallRate >= 0 ? "+" : ""}
                          {(riseFallRate * 100).toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Live PnL Bar */}
                {pnlPct != null && (
                  <div
                    className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs font-mono font-semibold ${
                      pnlPct >= 0
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}
                  >
                    <span className="text-[11px] font-sans font-medium text-zinc-300">Live PnL vs Entry</span>
                    <span>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</span>
                  </div>
                )}

                {/* Plan Targets Grid */}
                <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500">Entry Price</span>
                    <span className="font-mono text-xs font-bold text-zinc-100">
                      {fmtPlanPx(item.entry_price)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500">Stop Loss</span>
                    <span className="font-mono text-xs font-bold text-rose-400">
                      {fmtPlanPx(item.stop_loss)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500">Take Profit</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {fmtPlanPx(item.take_profit)}
                    </span>
                  </div>
                </div>

                {/* Notes & Actions Row */}
                {item.notes && (
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/50">
                    {item.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  {rrRatio ? (
                    <span className="text-[11px] font-mono text-zinc-400">
                      R:R Ratio: <span className="text-emerald-400 font-bold">{rrRatio} : 1</span>
                    </span>
                  ) : <div />}

                  <a
                    href={mexcChartUrl(item.symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📈 View {sym} Chart</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-[11px] text-zinc-500">
          <span>Powered by <span className="font-bold text-zinc-400">Tape Setup Journal</span></span>
          <span className="font-mono">👁 {share.view_count + 1} views</span>
        </div>
      </div>
    </div>
  );
}
