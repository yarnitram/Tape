import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/settings — return the current user's notification settings. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return stored settings or sensible defaults.
  return NextResponse.json({
    settings: data ?? {
      user_id: user.id,
      discord_webhook_url: null,
      notify_discord: true,
      notify_desktop: true,
      refresh_interval_sec: 10,
    },
  });
}

/** PUT /api/settings — upsert notification settings. */
export async function PUT(request: Request) {
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

  // Validate/normalize the Discord webhook URL so a bad value fails fast.
  let webhook: string | null = null;
  if (b.discord_webhook_url) {
    const raw = String(b.discord_webhook_url).trim();
    if (raw && !raw.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        { error: "Discord webhook URL must start with https://discord.com/api/webhooks/" },
        { status: 400 }
      );
    }
    webhook = raw || null;
  }

  // Normalize the watchlist refresh interval (seconds), clamped to [3, 3600].
  const rawInterval = Number(b.refresh_interval_sec);
  const refreshInterval = Number.isFinite(rawInterval)
    ? Math.min(3600, Math.max(3, Math.round(rawInterval)))
    : 10;

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      discord_webhook_url: webhook,
      notify_discord: b.notify_discord !== false,
      notify_desktop: b.notify_desktop !== false,
      refresh_interval_sec: refreshInterval,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}