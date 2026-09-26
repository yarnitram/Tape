"use client";

import { useState, useEffect } from "react";
import type { TelegramDestination } from "@/lib/types";
import {
  isAudioEnabled,
  setAudioEnabled as saveAudioEnabled,
  getAudioVolume,
  setAudioVolume as saveAudioVolume,
  playTriggerSound,
  playTpSound,
  playSlSound,
} from "@/lib/audio";

interface Props {
  userEmail: string;
  initial: {
    discord_webhooks: string[];
    notify_discord: boolean;
    telegram_destinations: TelegramDestination[];
    notify_telegram: boolean;
    notify_desktop: boolean;
    refresh_interval_sec: number;
  };
}

export function SettingsForm({ userEmail, initial }: Props) {
  const [discordWebhooks, setDiscordWebhooks] = useState<string[]>(
    initial.discord_webhooks.length > 0 ? initial.discord_webhooks : [""]
  );
  const [notifyDiscord, setNotifyDiscord] = useState(initial.notify_discord);

  const [telegramDests, setTelegramDests] = useState<TelegramDestination[]>(
    initial.telegram_destinations.length > 0
      ? initial.telegram_destinations
      : [{ id: genId(), bot_token: "", chat_id: "", label: "" }]
  );
  const [notifyTelegram, setNotifyTelegram] = useState(initial.notify_telegram);

  const [notifyDesktop, setNotifyDesktop] = useState(initial.notify_desktop);
  const [refreshInterval, setRefreshInterval] = useState(
    String(initial.refresh_interval_sec)
  );

  // ---- Audio Sound FX State ----
  const [audioEnabled, setAudioStateEnabled] = useState(true);
  const [audioVolume, setAudioStateVolume] = useState(0.5);

  useEffect(() => {
    setAudioStateEnabled(isAudioEnabled());
    setAudioStateVolume(getAudioVolume());
  }, []);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const inputCls =
    "hairline bg-panel px-3 py-2 text-sm outline-none focus:border-accent w-full rounded";

  // ---- Discord Webhook Handlers ----

  function handleAddDiscord() {
    setDiscordWebhooks([...discordWebhooks, ""]);
  }

  function handleRemoveDiscord(index: number) {
    setDiscordWebhooks(discordWebhooks.filter((_, i) => i !== index));
  }

  function handleDiscordChange(index: number, value: string) {
    const next = [...discordWebhooks];
    next[index] = value;
    setDiscordWebhooks(next);
  }

  async function handleTestDiscord(url: string, index: number) {
    if (!url.trim()) {
      setError("Enter a Discord webhook URL first.");
      return;
    }
    setTestingId(`discord-${index}`);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_webhook_url: url }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Test failed");
      }
      setStatus(`Test notification sent to Discord Webhook #${index + 1} ✓`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingId(null);
    }
  }

  // ---- Telegram Destination Handlers ----

  function handleAddTelegram() {
    setTelegramDests([
      ...telegramDests,
      { id: genId(), bot_token: "", chat_id: "", label: "" },
    ]);
  }

  function handleRemoveTelegram(id: string) {
    setTelegramDests(telegramDests.filter((t) => t.id !== id));
  }

  function handleTelegramChange(
    id: string,
    field: keyof TelegramDestination,
    value: string
  ) {
    setTelegramDests(
      telegramDests.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  async function handleTestTelegram(dest: TelegramDestination) {
    if (!dest.bot_token.trim() || !dest.chat_id.trim()) {
      setError("Provide both Bot Token and Chat ID before testing.");
      return;
    }
    setTestingId(`telegram-${dest.id}`);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_token: dest.bot_token,
          chat_id: dest.chat_id,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Telegram test failed");
      }
      setStatus(
        `Test notification sent to Telegram (${dest.label || "Bot"}) ✓`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingId(null);
    }
  }

  // ---- Desktop Test Handler ----

  async function handleTestDesktop() {
    setTestingId("desktop");
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
      setStatus("Desktop notification sent ✓ Check your Windows toast alerts.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingId(null);
    }
  }

  // ---- Form Submission ----

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);

    const filteredWebhooks = discordWebhooks
      .map((w) => w.trim())
      .filter(Boolean);

    const filteredTelegram = telegramDests
      .map((t) => ({
        ...t,
        bot_token: t.bot_token.trim(),
        chat_id: t.chat_id.trim(),
        label: t.label?.trim() || undefined,
      }))
      .filter((t) => t.bot_token && t.chat_id);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_webhooks: filteredWebhooks,
          notify_discord: notifyDiscord,
          telegram_destinations: filteredTelegram,
          notify_telegram: notifyTelegram,
          notify_desktop: notifyDesktop,
          refresh_interval_sec: Number(refreshInterval) || 10,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save settings");
      }

      setStatus("Settings saved successfully ✓");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Preferences</p>
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted">Signed in as {userEmail}</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* ---- Discord Webhooks Section ---- */}
        <fieldset className="hairline p-5 flex flex-col gap-4 rounded-lg bg-panel/40">
          <legend className="px-1 text-sm font-semibold flex items-center gap-2">
            <span>Discord Webhooks</span>
          </legend>

          <label className="flex items-center justify-between gap-3 cursor-pointer hairline-b pb-3">
            <span className="text-sm font-medium">
              Enable Discord Notifications
            </span>
            <input
              type="checkbox"
              checked={notifyDiscord}
              onChange={(e) => setNotifyDiscord(e.target.checked)}
              className="accent-accent h-4 w-4 cursor-pointer"
            />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-xs text-muted">
              Configure one or more Discord Webhook URLs. Fired price alerts will be posted to all active webhooks simultaneously.
            </span>

            {discordWebhooks.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className={`${inputCls} font-mono`}
                  value={url}
                  onChange={(e) => handleDiscordChange(idx, e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                />
                <button
                  type="button"
                  onClick={() => handleTestDiscord(url, idx)}
                  disabled={testingId === `discord-${idx}`}
                  className="px-2.5 py-2 text-xs btn-ghost cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {testingId === `discord-${idx}` ? "Testing…" : "Test"}
                </button>
                {discordWebhooks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDiscord(idx)}
                    title="Remove Webhook"
                    className="p-2 text-muted hover:text-rose-400 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddDiscord}
              className="px-3 py-1.5 text-xs font-mono font-medium text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors w-fit self-start mt-1 cursor-pointer flex items-center gap-1"
            >
              + Add Discord Webhook
            </button>
          </div>
        </fieldset>

        {/* ---- Telegram Notifications Section ---- */}
        <fieldset className="hairline p-5 flex flex-col gap-4 rounded-lg bg-panel/40">
          <legend className="px-1 text-sm font-semibold flex items-center gap-2">
            <span>Telegram Bot Notifications</span>
          </legend>

          <label className="flex items-center justify-between gap-3 cursor-pointer hairline-b pb-3">
            <span className="text-sm font-medium">
              Enable Telegram Notifications
            </span>
            <input
              type="checkbox"
              checked={notifyTelegram}
              onChange={(e) => setNotifyTelegram(e.target.checked)}
              className="accent-accent h-4 w-4 cursor-pointer"
            />
          </label>

          <div className="flex flex-col gap-4">
            <span className="text-xs text-muted">
              Add your Telegram Bot Token (from <code>@BotFather</code>) and Chat ID (from <code>@userinfobot</code> or group chat ID). You can add multiple Telegram bot destinations.
            </span>

            {telegramDests.map((dest, idx) => (
              <div
                key={dest.id}
                className="p-3 border border-hairline rounded bg-surface/30 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    className={`${inputCls} max-w-xs font-sans text-xs`}
                    value={dest.label || ""}
                    onChange={(e) =>
                      handleTelegramChange(dest.id, "label", e.target.value)
                    }
                    placeholder={`Destination #${idx + 1} (e.g. VIP Channel)`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestTelegram(dest)}
                      disabled={testingId === `telegram-${dest.id}`}
                      className="px-2.5 py-1.5 text-xs btn-ghost cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {testingId === `telegram-${dest.id}`
                        ? "Testing…"
                        : "Test Telegram"}
                    </button>
                    {telegramDests.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTelegram(dest.id)}
                        title="Remove Telegram destination"
                        className="p-1.5 text-muted hover:text-rose-400 cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-[11px] text-muted font-mono">
                    Bot Token
                    <input
                      type="text"
                      className={`${inputCls} font-mono text-xs`}
                      value={dest.bot_token}
                      onChange={(e) =>
                        handleTelegramChange(
                          dest.id,
                          "bot_token",
                          e.target.value
                        )
                      }
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted font-mono">
                    Chat ID
                    <input
                      type="text"
                      className={`${inputCls} font-mono text-xs`}
                      value={dest.chat_id}
                      onChange={(e) =>
                        handleTelegramChange(
                          dest.id,
                          "chat_id",
                          e.target.value
                        )
                      }
                      placeholder="-100123456789 or 987654321"
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddTelegram}
              className="px-3 py-1.5 text-xs font-mono font-medium text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors w-fit cursor-pointer flex items-center gap-1"
            >
              + Add Telegram Destination
            </button>
          </div>
        </fieldset>

        {/* ---- Desktop & Watchlist Settings Section ---- */}
        <fieldset className="hairline p-5 flex flex-col gap-4 rounded-lg bg-panel/40">
          <legend className="px-1 text-sm font-semibold">General & Desktop</legend>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyDesktop}
                onChange={(e) => setNotifyDesktop(e.target.checked)}
                className="accent-accent h-4 w-4 cursor-pointer"
              />
              <span className="text-sm font-medium">
                Send Desktop Toast Notifications
              </span>
            </label>
            <button
              type="button"
              onClick={handleTestDesktop}
              disabled={testingId === "desktop"}
              className="px-3 py-1.5 text-xs btn-ghost cursor-pointer disabled:opacity-50"
            >
              {testingId === "desktop" ? "Testing…" : "Test Desktop"}
            </button>
          </div>

          <div className="hairline-t pt-3 flex flex-col gap-1">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Watchlist Refresh Interval (seconds)
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
                Frequency at which the Watchlist polls MEXC futures API for live prices (3 to 3600 sec).
              </span>
            </label>
          </div>
        </fieldset>

        {/* ---- Audio Sound FX Section ---- */}
        <fieldset className="hairline p-5 flex flex-col gap-4 rounded-lg bg-panel/40">
          <legend className="px-1 text-sm font-semibold flex items-center gap-2">
            <span>🔊 Audio FX & Alerts</span>
          </legend>

          <label className="flex items-center justify-between gap-3 cursor-pointer hairline-b pb-3">
            <span className="text-sm font-medium">Enable Sound Effects</span>
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setAudioStateEnabled(next);
                saveAudioEnabled(next);
                if (next) playTriggerSound();
              }}
              className="accent-accent h-4 w-4 cursor-pointer"
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Sound Volume ({(audioVolume * 100).toFixed(0)}%)
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAudioStateVolume(val);
                  saveAudioVolume(val);
                }}
                className="w-full accent-accent cursor-pointer"
              />
            </label>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-muted">Test Sound FX:</span>
              <button
                type="button"
                onClick={playTriggerSound}
                className="px-2.5 py-1 text-xs btn-ghost cursor-pointer"
              >
                🔔 Trigger Chime
              </button>
              <button
                type="button"
                onClick={playTpSound}
                className="px-2.5 py-1 text-xs btn-ghost cursor-pointer text-gain"
              >
                🎯 Take Profit Hit
              </button>
              <button
                type="button"
                onClick={playSlSound}
                className="px-2.5 py-1 text-xs btn-ghost cursor-pointer text-loss"
              >
                🛑 Stop Loss Hit
              </button>
            </div>
          </div>
        </fieldset>

        {error && <div className="text-sm text-rose-400 font-mono">{error}</div>}
        {status && <div className="text-sm text-emerald-400 font-mono">{status}</div>}

        <button
          type="submit"
          disabled={saving || Boolean(testingId)}
          className="px-5 py-2.5 text-sm accent-btn font-semibold cursor-pointer w-fit rounded-md disabled:opacity-60"
        >
          {saving ? "Saving settings…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}

function genId() {
  return Math.random().toString(36).substring(2, 9);
}