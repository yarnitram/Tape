import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/trades/screenshot
 * Body: { tradeId, url? }
 * Stores the screenshot URL on the trade's notes row (upsert), or clears it.
 */
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
  const tradeId = String(b.tradeId ?? "");
  const url = b.url ? String(b.url) : null;
  if (!tradeId) return NextResponse.json({ error: "tradeId required" }, { status: 400 });

  // Verify the trade belongs to the user (RLS enforces this too, but be explicit).
  const { data: trade } = await supabase
    .from("trades")
    .select("id")
    .eq("id", tradeId)
    .single();
  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 });

  // Upsert a notes row carrying the screenshot URL.
  if (url) {
    const { error } = await supabase.from("trade_notes").upsert(
      { trade_id: tradeId, screenshot_url: url },
      { onConflict: "trade_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    // Clear the screenshot but keep any existing notes.
    const { data: existing } = await supabase
      .from("trade_notes")
      .select("*")
      .eq("trade_id", tradeId)
      .single();
    const { error } = await supabase
      .from("trade_notes")
      .update({ screenshot_url: null })
      .eq("trade_id", tradeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (existing && !existing.pre_trade_thesis && !existing.post_trade_review) {
      await supabase.from("trade_notes").delete().eq("trade_id", tradeId);
    }
  }

  return NextResponse.json({ ok: true });
}