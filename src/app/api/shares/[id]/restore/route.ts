import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/shares/[id]/restore — restore soft-deleted share link */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch soft-deleted target link
  const { data: target, error: fetchErr } = await supabase
    .from("public_share_links")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !target) {
    return NextResponse.json({ error: "Share page not found" }, { status: 404 });
  }

  // Check if another active page is currently using the same slug
  const { data: activeWithSlug } = await supabase
    .from("public_share_links")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", target.slug)
    .is("deleted_at", null)
    .neq("id", id)
    .maybeSingle();

  let restoredSlug = target.slug;
  if (activeWithSlug) {
    restoredSlug = `${target.slug}-restored-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Restore the page (clear deleted_at)
  const { data: restored, error: restoreErr } = await supabase
    .from("public_share_links")
    .update({
      deleted_at: null,
      slug: restoredSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (restoreErr) {
    return NextResponse.json({ error: restoreErr.message }, { status: 400 });
  }

  return NextResponse.json({ share: restored });
}
