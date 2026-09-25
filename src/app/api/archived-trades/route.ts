import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/archived-trades
 * Fetch all archived trade alerts for the signed-in user.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("archived_trade_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("archived_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ archivedAlerts: data ?? [] });
}

/**
 * POST /api/archived-trades
 * Archive (soft-delete) a trade alert row by moving it to archived_trade_alerts.
 * Body: { trade_alert_id }
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

  const { trade_alert_id } = body as { trade_alert_id?: string };
  if (!trade_alert_id) {
    return NextResponse.json({ error: "trade_alert_id is required" }, { status: 400 });
  }

  // 1. Fetch source trade_alerts row
  const { data: source, error: fetchErr } = await supabase
    .from("trade_alerts")
    .select("*")
    .eq("id", trade_alert_id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !source) {
    return NextResponse.json({ error: "Trade alert not found" }, { status: 404 });
  }

  // 2. Insert into archived_trade_alerts
  const archiveRow = {
    user_id: user.id,
    original_trade_alert_id: source.id,
    watchlist_item_id: source.watchlist_item_id,
    symbol: source.symbol,
    trigger_price: source.trigger_price,
    trigger_direction: source.trigger_direction,
    fired_price: source.fired_price,
    entry_price: source.entry_price,
    stop_loss: source.stop_loss,
    take_profit: source.take_profit,
    order_type: source.order_type,
    notes: source.notes,
    margin_usd: source.margin_usd,
    leverage: source.leverage,
    sl_fired_at: source.sl_fired_at,
    tp_fired_at: source.tp_fired_at,
    fired_at: source.fired_at,
    status_at_archive: source.status || "active",
    closed_reason: source.closed_reason,
    exit_price: source.exit_price,
    closed_at: source.closed_at,
    close_notes: source.close_notes,
    realized_pnl_usd: source.realized_pnl_usd,
    realized_pnl_pct: source.realized_pnl_pct,
    archived_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("archived_trade_alerts")
    .insert(archiveRow)
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  // 3. Delete from trade_alerts
  const { error: deleteErr } = await supabase
    .from("trade_alerts")
    .delete()
    .eq("id", trade_alert_id)
    .eq("user_id", user.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, archived: inserted });
}
