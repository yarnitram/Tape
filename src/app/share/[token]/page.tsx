import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sideForTrigger } from "@/lib/types";
import { cleanSymbol, fmtPx, fmtPlanPx, money, mexcChartUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

interface SharedItemData {
  id: string;
  symbol: string;
  trigger_direction: "above" | "below" | null;
  trigger_price: number | null;
  fired_price: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  order_type: string | null;
  margin_usd: number | null;
  leverage: number | null;
  notes: string | null;
  status?: string;
  realized_pnl_usd?: number | null;
  realized_pnl_pct?: number | null;
  created_at: string;
}

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchSharedData(token: string): Promise<SharedItemData | null> {
  const supabase = await createClient();

  // 1. Try trade_alerts table
  const { data: tradeData } = await supabase
    .from("trade_alerts")
    .select("*")
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle();

  if (tradeData) return tradeData as SharedItemData;

  // 2. Try watchlist_items table
  const { data: watchlistData } = await supabase
    .from("watchlist_items")
    .select("*")
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle();

  if (watchlistData) return watchlistData as SharedItemData;

  return null;
}

async function fetchLiveMexcPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://contract.mexc.com/api/v1/contract/ticker?symbol=${symbol.toUpperCase()}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.data?.lastPrice) {
      return parseFloat(json.data.lastPrice);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const item = await fetchSharedData(token);
  if (!item) {
    return { title: "Private Setup | Tape" };
  }

  const sym = cleanSymbol(item.symbol);
  const side = sideForTrigger(item.trigger_direction).toUpperCase();
  const ep = item.entry_price ? fmtPlanPx(item.entry_price) : "—";
  const sl = item.stop_loss ? fmtPlanPx(item.stop_loss) : "—";
  const tp = item.take_profit ? fmtPlanPx(item.take_profit) : "—";

  return {
    title: `${sym} ${side} Trade Setup | Tape Futures Journal`,
    description: `${sym} ${side} · EP: ${ep} · SL: ${sl} · TP: ${tp} · View live setup & price targets on Tape.`,
    openGraph: {
      title: `${sym} ${side} Trade Setup | Tape`,
      description: `Entry: ${ep} · SL: ${sl} · TP: ${tp} · Leverage: ${item.leverage ?? 10}x`,
      siteName: "Tape — Futures Watchlist & Journal",
    },
    twitter: {
      card: "summary_large_image",
      title: `${sym} ${side} Setup on Tape`,
      description: `EP: ${ep} · SL: ${sl} · TP: ${tp}`,
    },
  };
}

export default async function PublicSharePage({ params }: Props) {
  const { token } = await params;
  const item = await fetchSharedData(token);

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="hairline p-8 rounded-2xl bg-panel/60 max-w-md w-full flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl font-mono">
            🔒
          </div>
          <h1 className="text-xl font-semibold">Private Trade Setup</h1>
          <p className="text-xs text-muted">
            This setup is private or the share link has been revoked by the owner.
          </p>
          <a
            href="/login"
            className="mt-2 px-4 py-2 text-xs font-semibold accent-btn rounded-lg"
          >
            Go to Tape App
          </a>
        </div>
      </div>
    );
  }

  const livePrice = await fetchLiveMexcPrice(item.symbol);
  const sym = cleanSymbol(item.symbol);
  const side = sideForTrigger(item.trigger_direction);
  const isLong = side === "long";

  const entry = item.entry_price ?? item.fired_price;
  const lev = item.leverage ?? 10;
  const margin = item.margin_usd ?? 1;

  let pnlUsd: number | null = item.realized_pnl_usd ?? null;
  let pnlPct: number | null = item.realized_pnl_pct ?? null;

  if (pnlUsd == null && entry && entry > 0 && livePrice) {
    const sign = isLong ? 1 : -1;
    const notional = margin * lev;
    const posCoins = notional / entry;
    pnlUsd = sign * posCoins * (livePrice - entry);
    pnlPct = sign * (livePrice / entry - 1) * lev;
  }

  let rrRatio: string | null = null;
  if (entry && item.stop_loss && item.take_profit) {
    const risk = Math.abs(entry - item.stop_loss);
    const reward = Math.abs(item.take_profit - entry);
    if (risk > 0) {
      rrRatio = (reward / risk).toFixed(2);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 text-accent font-bold font-mono flex items-center justify-center text-sm">
              T
            </div>
            <span className="font-bold text-base tracking-wide">Tape</span>
            <span className="text-xs text-muted font-mono">Public Setup</span>
          </div>

          <a
            href={mexcChartUrl(item.symbol)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-panel hover:bg-panel-soft text-text text-xs font-semibold flex items-center gap-1.5 border border-hairline transition-colors"
          >
            <span>📈</span> View MEXC Chart ↗
          </a>
        </div>

        {/* Setup Main Glassmorphism Card */}
        <div className="hairline p-6 rounded-2xl bg-panel/60 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          {/* Coin Symbol & Position Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono tracking-tight">{sym}</h1>
                <span className="text-xs text-muted font-mono">USDT-PERP</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                    isLong
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {side.toUpperCase()} {lev}×
                </span>
              </div>
            </div>

            {/* PnL Display */}
            {pnlPct != null && (
              <div className="text-right">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {(pnlPct * 100).toFixed(2)}%
                </span>
                {pnlUsd != null && (
                  <span className="block text-xs font-mono text-muted">
                    {pnlUsd >= 0 ? "+" : ""}
                    {money(pnlUsd)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Live Price vs Entry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-surface/30 border border-hairline/60 text-xs">
            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Live Price</span>
              <span className="font-mono font-semibold text-accent text-sm">
                {livePrice ? fmtPx(livePrice) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Entry Price</span>
              <span className="font-mono font-semibold text-foreground text-sm">
                {item.entry_price ? fmtPlanPx(item.entry_price) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Stop Loss</span>
              <span className="font-mono font-semibold text-rose-400 text-sm">
                {item.stop_loss ? fmtPlanPx(item.stop_loss) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Take Profit</span>
              <span className="font-mono font-semibold text-emerald-400 text-sm">
                {item.take_profit ? fmtPlanPx(item.take_profit) : "—"}
              </span>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-3 gap-3 text-xs hairline-t pt-4">
            <div>
              <span className="text-muted block">Risk:Reward (R:R):</span>
              <span className="font-mono font-semibold text-foreground">
                {rrRatio ? `${rrRatio} R` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted block">Order Type:</span>
              <span className="font-mono font-semibold text-foreground uppercase">
                {item.order_type ?? "MARKET"}
              </span>
            </div>
            <div>
              <span className="text-muted block">Margin:</span>
              <span className="font-mono font-semibold text-foreground">
                {money(margin)}
              </span>
            </div>
          </div>

          {/* Trade Thesis / Notes */}
          {item.notes && (
            <div className="flex flex-col gap-1 hairline-t pt-4">
              <span className="text-xs font-semibold text-muted uppercase font-mono">
                Trade Thesis & Notes
              </span>
              <p className="text-xs text-foreground bg-surface/20 p-3 rounded-lg font-sans leading-relaxed italic">
                "{item.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Bottom CTA Banner */}
        <div className="hairline p-4 rounded-xl bg-panel/40 flex items-center justify-between text-xs gap-3">
          <div>
            <span className="font-semibold block">Track & Journal Futures Setups on Tape</span>
            <span className="text-muted">Real-time MEXC watchlist, trade alerts, and risk management.</span>
          </div>
          <a
            href="/login"
            className="px-4 py-2 font-semibold accent-btn rounded-lg whitespace-nowrap"
          >
            Get Started 🚀
          </a>
        </div>
      </div>
    </div>
  );
}
