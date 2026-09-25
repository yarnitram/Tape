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
  const discordWebhooks: string[] = Array.isArray(data?.discord_webhooks)
    ? data.discord_webhooks
    : data?.discord_webhook_url
    ? [data.discord_webhook_url]
    : [];

  const telegramDestinations = Array.isArray(data?.telegram_destinations)
    ? data.telegram_destinations
    : [];

  return NextResponse.json({
    settings: {
      user_id: user.id,
      discord_webhook_url: data?.discord_webhook_url ?? null,
      discord_webhooks: discordWebhooks,
      notify_discord: data?.notify_discord ?? true,
      telegram_destinations: telegramDestinations,
      notify_telegram: data?.notify_telegram ?? true,
      notify_desktop: data?.notify_desktop ?? true,
      refresh_interval_sec: data?.refresh_interval_sec ?? 10,
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

  // Process discord_webhooks array
  const rawWebhooks = Array.isArray(b.discord_webhooks)
    ? b.discord_webhooks.map((x) => String(x).trim()).filter(Boolean)
    : b.discord_webhook_url
    ? [String(b.discord_webhook_url).trim()]
    : [];

  for (const w of rawWebhooks) {
    if (!w.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        { error: `Invalid Discord webhook URL: ${w}. Must start with https://discord.com/api/webhooks/` },
        { status: 400 }
      );
    }
  }

  // Process telegram_destinations array
  const rawTelegram = Array.isArray(b.telegram_destinations)
    ? b.telegram_destinations.map((t: Record<string, unknown>) => ({
        id: String(t.id || genId()),
        bot_token: String(t.bot_token || "").trim(),
        chat_id: String(t.chat_id || "").trim(),
        label: t.label ? String(t.label).trim() : undefined,
      })).filter((t) => t.bot_token && t.chat_id)
    : [];

  // Normalize the watchlist refresh interval (seconds), clamped to [3, 3600].
  const rawInterval = Number(b.refresh_interval_sec);
  const refreshInterval = Number.isFinite(rawInterval)
    ? Math.min(3600, Math.max(3, Math.round(rawInterval)))
    : 10;

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      discord_webhook_url: rawWebhooks[0] || null,
      discord_webhooks: rawWebhooks,
      notify_discord: b.notify_discord !== false,
      telegram_destinations: rawTelegram,
      notify_telegram: b.notify_telegram !== false,
      notify_desktop: b.notify_desktop !== false,
      refresh_interval_sec: refreshInterval,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

function genId() {
  return Math.random().toString(36).substring(2, 9);
}