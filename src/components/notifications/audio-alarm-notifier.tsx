"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playAlarmSound, AlarmSoundPreset } from "@/lib/audio-alarm-engine";
import { cleanSymbol, fmtPx } from "@/lib/format";

interface ProximityAlarmToast {
  id: string;
  symbol: string;
  distancePct: number;
  triggerPrice: number;
  lastPrice: number;
  timestamp: number;
}

export function AudioAlarmNotifier() {
  const [toasts, setToasts] = useState<ProximityAlarmToast[]>([]);
  const cooldownsRef = useRef<Record<string, number>>({});

  const checkProximity = useCallback(async () => {
    try {
      // 1. Fetch user settings for audio preferences
      const settingsRes = await fetch("/api/settings");
      const settingsJson = await settingsRes.json();
      const settings = settingsJson?.settings;

      if (!settings?.sound_enabled || !settings?.proximity_alarm_enabled) {
        return;
      }

      const thresholdPct = Number(settings.proximity_threshold_pct || 0.5);
      const preset: AlarmSoundPreset = settings.alarm_sound_preset || "radar_ping";

      // 2. Fetch active watchlist items & live tickers
      const [wlRes, tickersRes] = await Promise.all([
        fetch("/api/watchlist"),
        fetch("/api/mexc/futures"),
      ]);

      const wlJson = await wlRes.json();
      const tickersJson = await tickersRes.json();

      if (!wlJson.items || !tickersJson.tickers) return;

      const items: Array<{
        id: string;
        symbol: string;
        trigger_price: number | null;
        alert_fired: boolean;
      }> = wlJson.items;

      const tickers: Array<{ symbol: string; lastPrice: number }> = tickersJson.tickers;
      const tickerMap = new Map<string, number>();
      for (const t of tickers) {
        tickerMap.set(t.symbol, t.lastPrice);
      }

      const now = Date.now();
      const newToasts: ProximityAlarmToast[] = [];
      let triggeredSound = false;

      for (const item of items) {
        // Skip already fired alerts or items without trigger price
        if (item.alert_fired || !item.trigger_price || item.trigger_price <= 0) continue;

        const lastPx = tickerMap.get(item.symbol.toUpperCase());
        if (!lastPx || lastPx <= 0) continue;

        const diff = Math.abs(lastPx - item.trigger_price);
        const distPct = (diff / item.trigger_price) * 100;

        if (distPct <= thresholdPct) {
          const cooldownKey = `${item.symbol}_${item.trigger_price}`;
          const lastFiredTime = cooldownsRef.current[cooldownKey] || 0;

          // 60 second audio & toast cooldown per item level
          if (now - lastFiredTime > 60_000) {
            cooldownsRef.current[cooldownKey] = now;
            triggeredSound = true;

            newToasts.push({
              id: `toast_${Date.now()}_${item.id}`,
              symbol: item.symbol,
              distancePct: distPct,
              triggerPrice: item.trigger_price,
              lastPrice: lastPx,
              timestamp: now,
            });
          }
        }
      }

      if (triggeredSound) {
        playAlarmSound(preset);
      }

      if (newToasts.length > 0) {
        setToasts((prev) => [...newToasts, ...prev].slice(0, 3));
      }
    } catch (err) {
      console.error("Audio proximity alarm check error:", err);
    }
  }, []);

  useEffect(() => {
    checkProximity();
    const interval = setInterval(checkProximity, 10_000); // Check every 10s
    return () => clearInterval(interval);
  }, [checkProximity]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const cleanSym = cleanSymbol(toast.symbol);
        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 border border-amber-500/50 shadow-2xl shadow-amber-500/10 p-4 rounded-2xl text-white flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg font-bold shrink-0 animate-pulse">
                🔊
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm font-mono text-amber-300">
                    {cleanSym} / USDT
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40 font-mono">
                    {toast.distancePct.toFixed(2)}% Away
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Near Trigger: <strong>{fmtPx(toast.triggerPrice)}</strong> (Last: {fmtPx(toast.lastPrice)})
                </p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Dismiss Alarm Toast"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
