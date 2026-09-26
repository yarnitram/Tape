import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** GET /api/shares — list user's public share links */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user username
  const { data: settings } = await supabase
    .from("user_settings")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: shares, error } = await supabase
    .from("public_share_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const username = settings?.username || null;
  const items = (shares || []).map((s) => ({
    ...s,
    username,
  }));

  return NextResponse.json({ shares: items, username });
}

/** POST /api/shares — create a new public share page */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure user has set a username handle first
  const { data: settings } = await supabase
    .from("user_settings")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.username) {
    return NextResponse.json(
      { error: "Please set a Username Handle in Settings first before creating public share links." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const rawTitle = String(b.title || "").trim();
  const rawSlug = String(b.slug || "").trim();
  const shareType = b.share_type === "trade" ? "trade" : "watchlist";

  // Parse items array
  let items: Record<string, unknown>[] = [];
  if (Array.isArray(b.items) && b.items.length > 0) {
    items = b.items.map((item: Record<string, unknown>, idx: number) => ({
      id: String(item.id || `item-${idx + 1}`),
      symbol: String(item.symbol || "").trim().toUpperCase(),
      share_type: item.share_type === "trade" ? "trade" : "watchlist",
      trigger_price: item.trigger_price != null && !isNaN(Number(item.trigger_price)) ? Number(item.trigger_price) : null,
      trigger_direction: item.trigger_direction ? String(item.trigger_direction) : null,
      order_type: item.order_type ? String(item.order_type) : null,
      alert_price: item.alert_price != null && !isNaN(Number(item.alert_price)) ? Number(item.alert_price) : null,
      entry_price: item.entry_price != null && !isNaN(Number(item.entry_price)) ? Number(item.entry_price) : null,
      stop_loss: item.stop_loss != null && !isNaN(Number(item.stop_loss)) ? Number(item.stop_loss) : null,
      take_profit: item.take_profit != null && !isNaN(Number(item.take_profit)) ? Number(item.take_profit) : null,
      notes: item.notes ? String(item.notes).trim() : null,
    })).filter((x) => x.symbol);
  }

  const primarySymbol = items.length > 0
    ? items.map((i) => i.symbol).join(", ")
    : String(b.symbol || "").trim().toUpperCase();

  if (!rawTitle) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!primarySymbol) {
    return NextResponse.json({ error: "At least one coin symbol is required." }, { status: 400 });
  }

  let slug = slugify(rawSlug || rawTitle);
  if (!slug) {
    slug = slugify(primarySymbol);
  }

  // Prevent reserved slugs
  const reserved = [
    "watchlist", "trades", "journal", "settings", "analytics", "risk",
    "notifications", "shares", "login", "auth", "api", "public", "share"
  ];
  if (reserved.includes(slug)) {
    slug = `${slug}-setup`;
  }

  // Ensure slug uniqueness for this user
  let finalSlug = slug;
  let counter = 1;
  while (true) {
    const { data: existing } = await supabase
      .from("public_share_links")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", finalSlug)
      .maybeSingle();

    if (!existing) break;
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  const entry_price = b.entry_price != null && !isNaN(Number(b.entry_price)) ? Number(b.entry_price) : items[0]?.entry_price ?? null;
  const stop_loss = b.stop_loss != null && !isNaN(Number(b.stop_loss)) ? Number(b.stop_loss) : items[0]?.stop_loss ?? null;
  const take_profit = b.take_profit != null && !isNaN(Number(b.take_profit)) ? Number(b.take_profit) : items[0]?.take_profit ?? null;
  const trigger_direction = b.trigger_direction ? String(b.trigger_direction) : items[0]?.trigger_direction ?? null;
  const notes = b.notes ? String(b.notes).trim() : null;
  const watchlist_item_id = b.watchlist_item_id ? String(b.watchlist_item_id) : null;
  const trade_alert_id = b.trade_alert_id ? String(b.trade_alert_id) : null;

  const { data: share, error } = await supabase
    .from("public_share_links")
    .insert({
      user_id: user.id,
      title: rawTitle,
      slug: finalSlug,
      share_type: shareType,
      symbol: primarySymbol,
      items: items.length > 0 ? items : [],
      watchlist_item_id,
      trade_alert_id,
      entry_price,
      stop_loss,
      take_profit,
      trigger_direction,
      notes,
      is_active: true,
      view_count: 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    share: {
      ...share,
      username: settings.username,
    },
  });
}
