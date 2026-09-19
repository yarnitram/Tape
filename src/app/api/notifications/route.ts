import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";

const DEFAULT_LIMIT = 20;

const NOTIFICATION_TYPES: NotificationType[] = [
  "trade_alert",
  "risk_warning",
  "system",
  "watchlist_trigger",
];

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

/** POST /api/notifications — create a notification for the current user. */
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

  const b = body as Record<string, unknown>;
  const type = String(b.type ?? "");
  const title = String(b.title ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  }
  if (!title || !message) {
    return NextResponse.json(
      { error: "title and message required" },
      { status: 400 }
    );
  }

  const link = b.link != null && String(b.link).trim() !== "" ? String(b.link).trim() : null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: user.id,
      type: type as NotificationType,
      title,
      message,
      link,
      read: false,
    })
    .select("id, type, title, message, link, read, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ notification: data }, { status: 201 });
}

/** DELETE /api/notifications — delete one or more notifications. */
export async function DELETE(request: Request) {
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
  const ids = Array.isArray(b.ids) ? (b.ids as string[]).filter(Boolean) : [];

  if (b.ids !== undefined && ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  let query = supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id);

  if (ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}