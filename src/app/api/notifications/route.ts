import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 20;

/** GET /api/notifications — list notifications for the current user. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10), 100);
  const cursor = searchParams.get("cursor"); // ISO timestamp for pagination

  let query = supabase
    .from("notifications")
    .select("id, type, title, message, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect hasMore

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasMore = (data?.length ?? 0) > limit;
  const notifications = hasMore ? (data?.slice(0, limit) ?? []) : (data ?? []);
  const nextCursor = hasMore ? notifications[notifications.length - 1].created_at : null;

  return NextResponse.json({ notifications, nextCursor, hasMore });
}

/** PATCH /api/notifications — mark notifications as read. */
export async function PATCH(request: Request) {
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

  const b = body as Record<string, unknown>;
  const ids = Array.isArray(b.ids) ? (b.ids as string[]) : [];
  const markAll = b.all === true;

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ error: "ids array or all=true required" }, { status: 400 });
  }

  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (!markAll) {
    query = query.in("id", ids);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}