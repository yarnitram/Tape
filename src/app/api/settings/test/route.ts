import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/settings/test — validate + save the Discord webhook and send a test. */
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
  const url = String(b.discord_webhook_url ?? "").trim();

  if (!url.startsWith("https://discord.com/api/webhooks/")) {
    return NextResponse.json(
      { error: "Discord webhook URL must start with https://discord.com/api/webhooks/" },
      { status: 400 }
    );
  }

  // Save the webhook to the user's settings.
  const { error: saveError } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        discord_webhook_url: url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 400 });
  }

  // Send a test message to the webhook.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "MOCHEX",
      content: "🎉 **MOCHEX test notification** — your price-alert notifications are connected!",
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Discord webhook rejected the message (${res.status})` },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}