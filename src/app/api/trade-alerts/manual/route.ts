import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number(v));
const posOrNull = (v: unknown) => {
  const n = numOrNull(v);
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * POST /api/trade-alerts/manual
 * Manually create an active trade alert directly on the Trades page.
 * Body: { symbol, trigger_direction ('above' | 'below'), entry_price, stop_loss, take_profit, leverage, margin_usd, order_type, notes }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const rawSymbol = b.symbol?.toString()?.trim() || "";
  if (!rawSymbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const symbol = rawSymbol.toUpperCase().endsWith("_USDT")
    ? rawSymbol.toUpperCase()
    : `${rawSymbol.toUpperCase()}_USDT`;

  const direction = b.trigger_direction === "above" ? "above" : "below";
  const entryPrice = posOrNull(b.entry_price);
  if (!entryPrice) {
    return NextResponse.json({ error: "Valid entry price is required" }, { status: 400 });
  }

  const orderType =
    b.order_type === "limit" ||
    b.order_type === "trigger_limit" ||
    b.order_type === "market"
      ? b.order_type
      : "market";

  const insertData = {
    user_id: user.id,
    symbol,
    trigger_direction: direction,
    fired_price: entryPrice,
    entry_price: entryPrice,
    stop_loss: numOrNull(b.stop_loss),
    take_profit: numOrNull(b.take_profit),
    margin_usd: posOrNull(b.margin_usd) ?? 1,
    leverage: posOrNull(b.leverage),
    order_type: orderType,
    notes: b.notes?.toString() || null,
    status: "active",
    fired_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trade_alerts")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, alert: data });
}
