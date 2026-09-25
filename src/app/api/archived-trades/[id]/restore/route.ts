import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/archived-trades/[id]/restore
 * Restore an archived trade alert back to trade_alerts.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 1. Fetch archived row
  const { data: archived, error: fetchErr } = await supabase
    .from("archived_trade_alerts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !archived) {
    return NextResponse.json({ error: "Archived trade not found" }, { status: 404 });
  }

  // 2. Re-insert into trade_alerts
  const restoreRow = {
    user_id: user.id,
    watchlist_item_id: archived.watchlist_item_id,
    symbol: archived.symbol,
    trigger_price: archived.trigger_price,
    trigger_direction: archived.trigger_direction,
    fired_price: archived.fired_price,
    entry_price: archived.entry_price,
    stop_loss: archived.stop_loss,
    take_profit: archived.take_profit,
    order_type: archived.order_type,
    notes: archived.notes,
    margin_usd: archived.margin_usd,
    leverage: archived.leverage,
    sl_fired_at: archived.sl_fired_at,
    tp_fired_at: archived.tp_fired_at,
    fired_at: archived.fired_at || new Date().toISOString(),
    status: archived.status_at_archive || "active",
    closed_reason: archived.closed_reason,
    exit_price: archived.exit_price,
    closed_at: archived.closed_at,
    close_notes: archived.close_notes,
    realized_pnl_usd: archived.realized_pnl_usd,
    realized_pnl_pct: archived.realized_pnl_pct,
  };

  const { data: restored, error: insertErr } = await supabase
    .from("trade_alerts")
    .insert(restoreRow)
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  // 3. Delete from archived_trade_alerts
  const { error: deleteErr } = await supabase
    .from("archived_trade_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, restored });
}
