import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShareToken } from "@/lib/share";

export const dynamic = "force-dynamic";

/**
 * POST /api/share/toggle
 * Body: { type: 'watchlist' | 'trade', id: string, is_public: boolean }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      type: "watchlist" | "trade";
      id: string;
      is_public: boolean;
    };

    const { type, id, is_public } = body;
    if (!type || !id || typeof is_public !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const tableName = type === "watchlist" ? "watchlist_items" : "trade_alerts";
    const prefix = type === "watchlist" ? "wt" : "tr";

    // Fetch existing item to check share_token
    const { data: existing, error: fetchErr } = await supabase
      .from(tableName)
      .select("id, share_token, is_public")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "Item not found or unauthorized" },
        { status: 404 }
      );
    }

    let shareToken = existing.share_token;
    if (is_public && !shareToken) {
      shareToken = generateShareToken(prefix);
    }

    // Update row
    const { data: updated, error: updateErr } = await supabase
      .from(tableName)
      .update({
        is_public,
        share_token: shareToken,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, is_public, share_token")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to toggle share" },
      { status: 500 }
    );
  }
}
