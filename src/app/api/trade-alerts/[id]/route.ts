import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number(v));

// Margin/leverage must be positive — a 0 or negative value would make the
// position size and P&L meaningless, so treat it as "unset" (use the default).
const posOrNull = (v: unknown) => {
  const n = numOrNull(v);
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * PATCH /api/trade-alerts/[id]
 * Update a logged trade's plan and position sizing.
 * Body (all optional): { entry_price, stop_loss, take_profit, order_type,
 * notes, margin_usd, leverage }
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

  const orderType =
    b.order_type === "limit" ||
    b.order_type === "trigger_limit" ||
    b.order_type === "market"
      ? b.order_type
      : null;

  const updates: Record<string, unknown> = {
    entry_price: numOrNull(b.entry_price),
    stop_loss: numOrNull(b.stop_loss),
    take_profit: numOrNull(b.take_profit),
    order_type: orderType,
  };

  if (b.notes !== undefined) updates.notes = b.notes?.toString() || null;
  if (b.margin_usd !== undefined) updates.margin_usd = posOrNull(b.margin_usd);
  if (b.leverage !== undefined) updates.leverage = posOrNull(b.leverage);

  const { error } = await supabase
    .from("trade_alerts")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/trade-alerts/[id] — remove a logged trade. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("trade_alerts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
