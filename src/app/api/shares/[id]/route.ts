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

/** PUT /api/shares/[id] — update share link config */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof b.title === "string" && b.title.trim()) {
    updateData.title = b.title.trim();
  }

  if (typeof b.slug === "string" && b.slug.trim()) {
    const rawSlug = slugify(b.slug.trim());
    if (rawSlug) {
      // Check slug uniqueness
      const { data: existing } = await supabase
        .from("public_share_links")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", rawSlug)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `Slug "${rawSlug}" is already in use by another of your public links.` },
          { status: 400 }
        );
      }
      updateData.slug = rawSlug;
    }
  }

  if (Array.isArray(b.items)) {
    const items = b.items.map((item: Record<string, unknown>, idx: number) => ({
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

    updateData.items = items;
    if (items.length > 0) {
      updateData.symbol = items.map((i) => i.symbol).join(", ");
    }
  }

  if (typeof b.is_active === "boolean") {
    updateData.is_active = b.is_active;
  }

  if (b.notes !== undefined) {
    updateData.notes = b.notes ? String(b.notes).trim() : null;
  }
  if (b.entry_price !== undefined) {
    updateData.entry_price = b.entry_price != null && !isNaN(Number(b.entry_price)) ? Number(b.entry_price) : null;
  }
  if (b.stop_loss !== undefined) {
    updateData.stop_loss = b.stop_loss != null && !isNaN(Number(b.stop_loss)) ? Number(b.stop_loss) : null;
  }
  if (b.take_profit !== undefined) {
    updateData.take_profit = b.take_profit != null && !isNaN(Number(b.take_profit)) ? Number(b.take_profit) : null;
  }

  const { data: updated, error } = await supabase
    .from("public_share_links")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ share: updated });
}

/** DELETE /api/shares/[id] — soft delete (or permanent delete if ?permanent=true) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (permanent) {
    const { error } = await supabase
      .from("public_share_links")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, permanent: true });
  } else {
    const { error } = await supabase
      .from("public_share_links")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, permanent: false });
  }
}
