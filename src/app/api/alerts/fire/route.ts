import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface UserSettings {
  discord_webhook_url: string | null;
  notify_discord: boolean;
  notify_desktop: boolean;
}

/**
 * POST /api/alerts/fire
 * Dispatch a triggered alert across the user's configured channels:
 *   1. In-app notification (bell + /notifications page) — always
 *   2. Discord webhook (if webhook URL set + notify_discord)
 *   3. Desktop toast (if notify_desktop) — via local PowerShell
 * Body: { type, title, message, link }
 *
 * All deliveries are best-effort: a failed channel never fails the request.
 */
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

  const type = (String(b.type ?? "system") as NotificationType);
  const title = String(b.title ?? "").trim();
  const message = String(b.message ?? "").trim();
  const link = b.link != null && String(b.link).trim() !== "" ? String(b.link).trim() : null;

  if (!title || !message) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  // Load current user settings (webhook + toggles).
  const { data: settings } = await supabase
    .from("user_settings")
    .select("discord_webhook_url, notify_discord, notify_desktop")
    .eq("user_id", user.id)
    .maybeSingle();

  const s = (settings as UserSettings | null) ?? {
    discord_webhook_url: null,
    notify_discord: true,
    notify_desktop: true,
  };

  const channels: {
    inApp: boolean;
    discord: boolean;
    desktop: boolean;
    errors?: { discord?: string; desktop?: string };
  } = { inApp: false, discord: false, desktop: false };
  const errors: { discord?: string; desktop?: string } = {};

  // 1) Always create the in-app notification (bell + /notifications page).
  const { error: notifError } = await supabase.from("notifications").insert({
    user_id: user.id,
    type,
    title,
    message,
    link,
    read: false,
  });
  if (!notifError) channels.inApp = true;

  // 2) Discord webhook (best-effort).
  if (s.notify_discord && s.discord_webhook_url) {
    const r = await sendDiscord(s.discord_webhook_url, title, message, link);
    channels.discord = r.ok;
    if (!r.ok) errors.discord = `webhook configured but send failed: ${r.detail ?? "unknown"}`;
  } else if (!s.notify_discord) {
    errors.discord = "notify_discord disabled";
  } else if (!s.discord_webhook_url) {
    errors.discord = "no webhook URL in user_settings";
  }

  // 3) Desktop toast (best-effort).
  if (s.notify_desktop) {
    channels.desktop = await sendDesktop(title, message);
    if (!channels.desktop) errors.desktop = "powershell toast failed";
  }

  // Always return ok so the client isn't broken, but include channel status so
  // the caller can log/diagnose if a channel didn't fire.
  const res: {
    ok: true;
    channels: { inApp: boolean; discord: boolean; desktop: boolean };
    errors?: { discord?: string; desktop?: string };
  } = { ok: true, channels };
  if (Object.keys(errors).length > 0) res.errors = errors;
  return NextResponse.json(res);
}

/** POST a Discord message to a webhook URL. Returns status-details on failure. */
async function sendDiscord(
  webhookUrl: string,
  title: string,
  message: string,
  link: string | null
): Promise<{ ok: boolean; detail?: string }> {
  try {
    // Discord auto-links absolute http(s) URLs. Relative in-app paths (e.g.
    // "/watchlist") have no meaning in Discord, so drop them to avoid a raw
    // "</watchlist>" rendering.
    const linkPart =
      link && /^https?:\/\//i.test(link) ? `\n**View in app:** ${link}` : "";
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Plain content message — this matches the format proven to work in the
      // settings "Test Discord" flow. Some webservers/webhooks reject embeds.
      body: JSON.stringify({
        username: "Tape",
        content: `🔔 **${title}**\n${message}${linkPart}`,
      }),
    });
    if (!res.ok) {
      return { ok: false, detail: `Discord HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

/** Fire a Windows desktop toast via local PowerShell. Returns success boolean. */
async function sendDesktop(title: string, body: string): Promise<boolean> {
  const ps = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "$n=New-Object System.Windows.Forms.NotifyIcon;",
    "$n.Icon=[System.Drawing.SystemIcons]::Information;",
    `$n.BalloonTipTitle=[char]34+${JSON.stringify(title)}+[char]34;`,
    `$n.BalloonTipText=[char]34+${JSON.stringify(body)}+[char]34;`,
    "$n.Visible=$true;",
    "$n.ShowBalloonTip(8000);",
    "Start-Sleep -Milliseconds 200;",
    "$n.Dispose();",
  ].join(" ");

  return new Promise<boolean>((resolve) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", ps], {
      windowsHide: true,
    });
    child.on("close", (code: number | null) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}