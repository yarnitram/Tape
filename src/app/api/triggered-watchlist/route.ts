import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number(v));

/** GET /api/triggered-watchlist — list the current user's triggered watchlist items. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("triggered_watchlist_items")
    .select("*")
    .order("fired_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST /api/triggered-watchlist — insert a triggered watchlist item archive row. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const symbol = String(b.symbol ?? "").trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const triggerDirection =
    b.trigger_direction === "above" || b.trigger_direction === "below"
      ? b.trigger_direction
      : null;

  const orderType =
    b.order_type === "limit" ||
    b.order_type === "trigger_limit" ||
    b.order_type === "market"
      ? b.order_type
      : null;

  const { data, error } = await supabase
    .from("triggered_watchlist_items")
    .insert({
      user_id: user.id,
      source_item_id: b.source_item_id ? String(b.source_item_id) : null,
      symbol,
      trigger_price: numOrNull(b.trigger_price),
      trigger_direction: triggerDirection,
      fired_price: numOrNull(b.fired_price),
      entry_price: numOrNull(b.entry_price),
      stop_loss: numOrNull(b.stop_loss),
      take_profit: numOrNull(b.take_profit),
      order_type: orderType,
      notes: b.notes?.toString() || null,
      fired_at: b.fired_at ? String(b.fired_at) : new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data }, { status: 201 });
}
