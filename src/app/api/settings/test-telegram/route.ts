import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/settings/test-telegram — send a test message to a Telegram Bot Token & Chat ID. */
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
  const botToken = String(b.bot_token ?? "").trim();
  const chatId = String(b.chat_id ?? "").trim();

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Both Bot Token and Chat ID are required" },
      { status: 400 }
    );
  }

  // Send a test message via Telegram Bot API
  try {
    const telegramUrl = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🎉 <b>Tape test notification</b> — your Telegram alert notifications are connected!",
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Telegram API rejected the message (${res.status}): ${data.description || "Unknown error"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
