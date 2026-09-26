import { NextResponse } from "next/server";
import { createClient as createClientJs } from "@supabase/supabase-js";
import { cleanSymbol } from "@/lib/format";
import type { TelegramDestination } from "@/lib/types";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAdminClient() {
  return createClientJs(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeSymbol(raw: string): string {
  let s = raw.trim().toUpperCase();
  // Strip exchange prefixes e.g. "BINANCE:BTCUSDT.P" -> "BTCUSDT.P"
  if (s.includes(":")) {
    s = s.split(":")[1];
  }
  // Strip perpetual suffixes e.g. ".P"
  s = s.replace(/\.P$/i, "");
  // Replace "/" or "-" with "_"
  s = s.replace(/[\/\-]/g, "_");
  // If no underscore but ends in USDT, e.g. "BTCUSDT" -> "BTC_USDT"
  if (!s.includes("_")) {
    if (s.endsWith("USDT")) {
      s = s.slice(0, -4) + "_USDT";
    } else {
      s = s + "_USDT";
    }
  }
  return s;
}

function normalizeSide(raw: unknown): "long" | "short" {
  const s = String(raw || "").trim().toLowerCase();
  if (["short", "sell", "put", "bear", "down"].includes(s)) {
    return "short";
  }
  return "long";
}

const numOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * POST /api/webhooks/tradingview
 * Ingest external TradingView alerts directly into Watchlist or Trades.
 * Authenticates via query parameter `?key=...` or body `{ secret: "..." }`.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let secretKey = url.searchParams.get("key") || url.searchParams.get("secret");

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // If not JSON, try reading as raw text
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      // Body might be empty or invalid
    }
  }

  // Allow secret in body as well
  if (!secretKey && (body.secret || body.key)) {
    secretKey = String(body.secret || body.key);
  }

  if (!secretKey) {
    return NextResponse.json(
      {
        error: "Missing webhook secret key. Pass ?key=tv_sec_... or { secret: 'tv_sec_...' }",
      },
      { status: 401 }
    );
  }

  const adminClient = getAdminClient();

  // Find user by secret
  const { data: userSettings, error: userError } = await adminClient
    .from("user_settings")
    .select("*")
    .eq("webhook_secret", secretKey)
    .maybeSingle();

  if (userError || !userSettings) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid TradingView webhook secret key." },
      { status: 401 }
    );
  }

  const userId = userSettings.user_id;

  // Extract raw payload values
  const rawSymbol = String(
    body.symbol || body.ticker || body.pair || "BTC_USDT"
  );
  const symbol = normalizeSymbol(rawSymbol);
  const side = normalizeSide(
    body.position || body.side || body.direction || body.action
  );

  const rawAction = String(body.action || "").trim().toLowerCase();
  const isDirectTrade = rawAction === "trade" || rawAction === "execute";

  const triggerPrice =
    numOrNull(body.trigger_price) ??
    numOrNull(body.trigger) ??
    numOrNull(body.price);

  let triggerDirection: "above" | "below" = "below";
  if (body.trigger_direction === "above" || body.trigger_direction === "below") {
    triggerDirection = body.trigger_direction;
  } else if (side === "short") {
    triggerDirection = "above";
  }

  const entryPrice = numOrNull(body.entry_price) ?? numOrNull(body.ep);
  const stopLoss = numOrNull(body.stop_loss) ?? numOrNull(body.sl);
  const takeProfit = numOrNull(body.take_profit) ?? numOrNull(body.tp);

  const tp1 = numOrNull(body.tp1_price) ?? numOrNull(body.tp1);
  const tp2 = numOrNull(body.tp2_price) ?? numOrNull(body.tp2);
  const tp3 = numOrNull(body.tp3_price) ?? numOrNull(body.tp3);

  const orderType =
    body.order_type === "market" || body.order_type === "trigger_limit"
      ? body.order_type
      : "limit";

  const notes =
    body.notes ||
    body.thesis ||
    body.message ||
    body.comment ||
    `TradingView Alert: ${side.toUpperCase()} ${cleanSymbol(symbol)}`;

  let insertedId: string | null = null;
  let resultType: "watchlist" | "trade" = "watchlist";

  if (isDirectTrade) {
    // Insert into trade_alerts
    resultType = "trade";
    const { data: tradeData, error: tradeErr } = await adminClient
      .from("trade_alerts")
      .insert({
        user_id: userId,
        symbol,
        side,
        trigger_price: triggerPrice,
        trigger_direction: triggerDirection,
        fired_price: triggerPrice || entryPrice,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        tp1_price: tp1,
        tp2_price: tp2,
        tp3_price: tp3,
        order_type: orderType,
        margin_usd: numOrNull(body.margin_usd) ?? numOrNull(body.margin) ?? 1,
        leverage: numOrNull(body.leverage) ?? 10,
        notes: String(notes),
        fired_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tradeErr) {
      return NextResponse.json({ error: tradeErr.message }, { status: 500 });
    }
    insertedId = tradeData.id;
  } else {
    // Default: Insert into watchlist_items
    const { data: watchData, error: watchErr } = await adminClient
      .from("watchlist_items")
      .insert({
        user_id: userId,
        symbol,
        trigger_price: triggerPrice,
        trigger_direction: triggerDirection,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        tp1_price: tp1,
        tp2_price: tp2,
        tp3_price: tp3,
        order_type: orderType,
        notes: String(notes),
        added_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (watchErr) {
      return NextResponse.json({ error: watchErr.message }, { status: 500 });
    }
    insertedId = watchData.id;
  }

  // ---- Multi-channel Notification Fan-out ----
  const symLabel = cleanSymbol(symbol);
  const alertTitle = `📡 TradingView ${side.toUpperCase()} ${symLabel}`;
  const alertMsg = `Setup ingested: Trigger $${triggerPrice || entryPrice || "—"} | EP: $${entryPrice || "—"} | SL: $${stopLoss || "—"} | TP: $${takeProfit || "—"}`;
  const alertLink = isDirectTrade ? "/trades" : "/watchlist";

  // 1. In-App Notification
  await adminClient.from("notifications").insert({
    user_id: userId,
    type: "watchlist_trigger",
    title: alertTitle,
    message: alertMsg,
    link: alertLink,
    read: false,
  });

  // 2. Discord Webhooks
  const discordUrls: string[] = Array.isArray(userSettings.discord_webhooks)
    ? userSettings.discord_webhooks
    : userSettings.discord_webhook_url
    ? [userSettings.discord_webhook_url]
    : [];

  if (userSettings.notify_discord !== false && discordUrls.length > 0) {
    await Promise.all(
      discordUrls.map(async (dUrl) => {
        try {
          await fetch(dUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "MOCHEX TradingView Webhook",
              content: `🔔 **${alertTitle}**\n${alertMsg}\nNotes: *${notes}*`,
            }),
          });
        } catch {
          // ignore discord delivery errors
        }
      })
    );
  }

  // 3. Telegram Destinations
  const telegramDests: TelegramDestination[] = Array.isArray(
    userSettings.telegram_destinations
  )
    ? userSettings.telegram_destinations
    : [];

  if (userSettings.notify_telegram !== false && telegramDests.length > 0) {
    await Promise.all(
      telegramDests.map(async (dest) => {
        try {
          const tText = `🔔 <b>${alertTitle}</b>\n${alertMsg}\nNotes: <i>${notes}</i>`;
          await fetch(
            `https://api.telegram.org/bot${encodeURIComponent(dest.bot_token)}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: dest.chat_id,
                text: tText,
                parse_mode: "HTML",
              }),
            }
          );
        } catch {
          // ignore telegram delivery errors
        }
      })
    );
  }

  return NextResponse.json({
    ok: true,
    action: resultType,
    id: insertedId,
    symbol,
    side,
    message: `TradingView ${resultType} setup successfully ingested into MOCHEX.`,
  });
}
