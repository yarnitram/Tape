import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanSymbol, mexcChartUrl } from "@/lib/format";
import type { PublicShareLink } from "@/lib/types";

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
  const sym = cleanSymbol(share.symbol);
  const side = share.trigger_direction ? share.trigger_direction.toUpperCase() : "SETUP";
  const ep = share.entry_price ? `$${share.entry_price}` : "N/A";
  const sl = share.stop_loss ? `$${share.stop_loss}` : "N/A";
  const tp = share.take_profit ? `$${share.take_profit}` : "N/A";

  const title = `🚀 ${side} $${sym} Setup | @${username} on Tape`;
  const description = `${share.title} — Entry: ${ep} | Stop: ${sl} | Target: ${tp}`;

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
          <h1 className="text-xl font-bold mb-2">Private or Paused Setup</h1>
          <p className="text-xs text-zinc-400 mb-6">
            The owner of this setup (@{username}) has set this public page to private or paused visibility.
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

  // Fetch live price from MEXC
  let lastPrice: number | null = null;
  let priceChange24h: number | null = null;
  try {
    const symbolFormatted = share.symbol.endsWith("_USDT") ? share.symbol : `${share.symbol}_USDT`;
    const res = await fetch(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${symbolFormatted}`, {
      next: { revalidate: 10 },
    });
    if (res.ok) {
      const tickerData = await res.json();
      if (tickerData.success && tickerData.data) {
        lastPrice = Number(tickerData.data.lastPrice) || null;
        priceChange24h = Number(tickerData.data.riseFallRate) || null;
      }
    }
  } catch {
    /* ignore */
  }

  const sym = cleanSymbol(share.symbol);
  const side = share.trigger_direction === "below" ? "SHORT" : "LONG";

  // Calculate setup metrics
  let rrRatio: string | null = null;
  if (share.entry_price && share.stop_loss && share.take_profit) {
    const risk = Math.abs(share.entry_price - share.stop_loss);
    const reward = Math.abs(share.take_profit - share.entry_price);
    if (risk > 0) {
      rrRatio = (reward / risk).toFixed(2);
    }
  }

  let pnlPct: number | null = null;
  if (lastPrice && share.entry_price && share.entry_price > 0) {
    const dir = side === "LONG" ? 1 : -1;
    pnlPct = dir * ((lastPrice / share.entry_price) - 1) * 100;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <div className="w-full max-w-xl flex flex-col gap-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Tape
            </span>
            <span className="text-zinc-600 font-mono">/</span>
            <span className="text-xs text-zinc-400 font-mono">@{username}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
            Public Setup
          </span>
        </div>

        {/* Main Glassmorphic Setup Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          <div className="absolute -right-20 -top-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Title & Coin Badge */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-zinc-100">{sym}</span>
                <span className="text-xs font-mono text-zinc-400">USDT</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
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
                  <span className="text-lg font-mono font-bold text-zinc-100 tabular-nums">
                    ${lastPrice}
                  </span>
                  {priceChange24h != null && (
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        priceChange24h >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {priceChange24h >= 0 ? "+" : ""}
                      {(priceChange24h * 100).toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-lg font-semibold text-zinc-200">{share.title}</h1>
          </div>

          {/* Live PnL Status Pill */}
          {pnlPct != null && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                pnlPct >= 0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              <span className="text-xs font-medium">Live Price PnL vs Entry</span>
              <span className="text-base font-mono font-bold">
                {pnlPct >= 0 ? "+" : ""}
                {pnlPct.toFixed(2)}%
              </span>
            </div>
          )}

          {/* Setup Targets Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-500">Entry Price</span>
              <span className="font-mono text-sm font-bold text-zinc-100">
                {share.entry_price ? `$${share.entry_price}` : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-500">Stop Loss</span>
              <span className="font-mono text-sm font-bold text-rose-400">
                {share.stop_loss ? `$${share.stop_loss}` : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-500">Take Profit</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {share.take_profit ? `$${share.take_profit}` : "—"}
              </span>
            </div>
          </div>

          {/* R:R Ratio Badge */}
          {rrRatio && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/40 border border-zinc-800 text-xs">
              <span className="text-zinc-400">Risk-to-Reward Ratio</span>
              <span className="font-mono font-bold text-emerald-400">{rrRatio} : 1</span>
            </div>
          )}

          {/* Public Trader Notes */}
          {share.notes && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-400">Trader Thesis & Notes</span>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/50">
                {share.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <a
              href={mexcChartUrl(share.symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>📈 Open Live Chart on MEXC</span>
            </a>

            <span className="text-[11px] text-zinc-500 font-mono">
              👁 {share.view_count + 1} views
            </span>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
          <span>Powered by</span>
          <span className="font-bold text-zinc-400">Tape Setup Journal</span>
        </div>
      </div>
    </div>
  );
}
