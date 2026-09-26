import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/revisions?item_id=UUID&symbol=BTC_USDT
 * Fetch setup revision timeline for a given item or symbol.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!itemId && !symbol) {
    return NextResponse.json(
      { error: "Missing item_id or symbol parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  let query = supabase
    .from("setup_revisions")
    .select("*")
    .order("created_at", { ascending: false });

  if (itemId) {
    query = query.eq("item_id", itemId);
  } else if (symbol) {
    query = query.eq("symbol", symbol);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, revisions: data || [] });
}

/**
 * POST /api/revisions
 * Log a new setup revision.
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

  const b = body as {
    item_type: "watchlist" | "trade" | "share";
    item_id: string;
    symbol: string;
    revision_type: string;
    title: string;
    description?: string;
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
  };

  if (!b.item_id || !b.symbol || !b.revision_type || !b.title) {
    return NextResponse.json(
      { error: "Missing required revision fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("setup_revisions")
    .insert({
      user_id: user.id,
      item_type: b.item_type || "watchlist",
      item_id: b.item_id,
      symbol: b.symbol.toUpperCase(),
      revision_type: b.revision_type,
      title: b.title,
      description: b.description || null,
      old_value: b.old_value || null,
      new_value: b.new_value || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, revision: data });
}
