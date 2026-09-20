"use client";

import { useState } from "react";

interface Props {
  userEmail: string;
  initial: {
    discord_webhook_url: string | null;
    notify_discord: boolean;
    notify_desktop: boolean;
    refresh_interval_sec: number;
  };
}

export function SettingsForm({ userEmail, initial }: Props) {
  const [webhook, setWebhook] = useState(initial.discord_webhook_url ?? "");
  const [notifyDiscord, setNotifyDiscord] = useState(initial.notify_discord);
  const [notifyDesktop, setNotifyDesktop] = useState(initial.notify_desktop);
  const [refreshInterval, setRefreshInterval] = useState(
    String(initial.refresh_interval_sec)
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingDesktop, setTestingDesktop] = useState(false);

  const inputCls =
    "hairline bg-panel px-3 py-2 text-sm outline-none focus:border-accent w-full";

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_webhook_url: webhook,
          notify_discord: notifyDiscord,
          notify_desktop: notifyDesktop,
          refresh_interval_sec: Number(refreshInterval) || 10,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save");
      }
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    const ok = await save(e);
    if (ok) setStatus("Settings saved.");
  }

  async function handleTest() {
    if (!webhook.trim()) {
      setError("Enter a Discord webhook URL first.");
      return;
    }
    setTesting(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_webhook_url: webhook }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Test failed");
      }
      setStatus("Test notification sent to Discord ✓");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function handleTestDesktop() {
    setTestingDesktop(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test-desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Test failed");
      }
      setStatus("Desktop notification sent ✓ Check your Windows notification toast.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingDesktop(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Preferences</p>
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted">Signed in as {userEmail}</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <fieldset className="hairline p-5 flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold">Notifications</legend>

          <label className="flex flex-col gap-1 text-xs text-muted">
            Discord webhook URL
            <input
              className={`${inputCls} font-mono`}
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
            />
            <span className="text-xs text-muted/70">
              Alerts get posted here when a coin hits your trigger. Test with
              the button below.
            </span>
          </label>

          <div className="hairline-t pt-3 flex flex-col gap-2">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm">Send notifications to Discord</span>
              <input
                type="checkbox"
                checked={notifyDiscord}
                onChange={(e) => setNotifyDiscord(e.target.checked)}
                className="accent-accent h-4 w-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm">Send desktop notifications</span>
              <input
                type="checkbox"
                checked={notifyDesktop}
                onChange={(e) => setNotifyDesktop(e.target.checked)}
                className="accent-accent h-4 w-4 cursor-pointer"
              />
            </label>
          </div>

          <div className="hairline-t pt-3 flex flex-col gap-1">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Watchlist refresh interval (seconds)
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={3600}
                  step={1}
                  className={`${inputCls} max-w-32`}
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  placeholder="10"
                />
                <span className="text-xs text-muted/70">sec</span>
              </div>
              <span className="text-xs text-muted/70">
                How often the watchlist re-polls the MEXC futures API for live
                prices (between 3 and 3600 seconds).
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-2 text-sm btn-ghost cursor-pointer disabled:opacity-60"
            >
              {testing ? "Sending…" : "Test Discord"}
            </button>
            <button
              type="button"
              onClick={handleTestDesktop}
              disabled={testingDesktop}
              className="px-3 py-2 text-sm btn-ghost cursor-pointer disabled:opacity-60"
            >
              {testingDesktop ? "Sending…" : "Test Desktop"}
            </button>
          </div>
        </fieldset>

        {error && <div className="text-sm text-loss">{error}</div>}
        {status && <div className="text-sm text-gain">{status}</div>}

        <button
          type="submit"
          disabled={saving || testing || testingDesktop}
          className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer w-fit disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}