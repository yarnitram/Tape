import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const numOrNull = (v: unknown) =>
  v == null || v === "" ? null : Number(v);

/**
 * PATCH /api/watchlist/[id]
 * Update a saved coin's price-trigger + trade plan.
 * Body (all optional): { trigger_price, trigger_direction, entry_price,
 * stop_loss, take_profit, notes, rearm }
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const direction =
    b.trigger_direction === "above" || b.trigger_direction === "below"
      ? b.trigger_direction
      : null;

  const updates: Record<string, unknown> = {
    trigger_price: numOrNull(b.trigger_price),
    trigger_direction: direction,
    entry_price: numOrNull(b.entry_price),
    stop_loss: numOrNull(b.stop_loss),
    take_profit: numOrNull(b.take_profit),
  };

  // Stamp when the trigger was armed. If a trigger price is provided, record
  // the current time as "trigger created"; if it's being cleared, drop it.
  if (b.trigger_price !== undefined) {
    updates.trigger_created_at =
      numOrNull(b.trigger_price) == null ? null : new Date().toISOString();
  }

  if (b.notes !== undefined) updates.notes = b.notes?.toString() || null;

  // Re-arm: clear the fired flag so the watcher can notify again.
  if (b.rearm) {
    updates.alert_fired = false;
    updates.alert_fired_at = null;
  }

  const { error } = await supabase
    .from("watchlist_items")
    .update(updates)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/watchlist/[id] — remove a watchlist item. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}