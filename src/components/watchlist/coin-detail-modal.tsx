"use client";

import { useEffect, useState } from "react";
import type { WatchlistItem, OrderType } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";
import { SetupRevisionTimeline } from "@/components/revisions/setup-revision-timeline";

interface Props {
  symbol: string;
  item: WatchlistItem | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface Ticker {
  symbol: string;
  lastPrice: number;
  bid1: number;
  ask1: number;
  volume24: number;
  amount24: number;
  holdVol: number;
  lower24Price: number;
  high24Price: number;
  riseFallRate: number;
  riseFallValue: number;
  indexPrice: number;
  fairPrice: number;
  fundingRate: number;
}

interface Detail {
  symbol: string;
  displayNameEn: string;
  baseCoin: string;
  quoteCoin: string;
  contractSize: number;
  minLeverage: number;
  maxLeverage: number;
  baseCoinIconUrl: string;
}

function cleanSymbol(s: string): string {
  return s.replace(/_USDT$/i, "");
}

function toStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

// Selectable order types shown in the modal; aligned with the DB constraint.
const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "limit", label: "Limit" },
  { value: "trigger_limit", label: "Trigger Limit" },
  { value: "market", label: "Market" },
];

export function CoinDetailModal({ symbol, item, onClose, onSaved }: Props) {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for the alert / trade plan.
  const [triggerPrice, setTriggerPrice] = useState(
    toStr(item?.trigger_price ?? item?.alert_price)
  );
  const [entry, setEntry] = useState(toStr(item?.entry_price));
  const [stopLoss, setStopLoss] = useState(toStr(item?.stop_loss));
  const [takeProfit, setTakeProfit] = useState(toStr(item?.take_profit));
  const [orderType, setOrderType] = useState<OrderType | "">(
    item?.order_type ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "history">("plan");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/mexc/futures?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setTicker(data.ticker ?? null);
        setDetail(data.detail ?? null);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const changeClass = (v: number | undefined) =>
    v != null && v >= 0 ? "text-gain" : "text-loss";

  function fmtPct(f: number | undefined): string {
    if (f == null) return "…";
    return `${f >= 0 ? "+" : ""}${(f * 100).toFixed(2)}%`;
  }
  function fmtPx(p: number | undefined): string {
    if (p == null) return "…";
    if (p >= 1000)
      return p.toLocaleString("en-US", { maximumFractionDigits: 1 });
    if (p >= 1)
      return p.toLocaleString("en-US", { maximumFractionDigits: 3 });
    return p.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  function compact(v: number | undefined): string {
    if (v == null) return "…";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!item) {
      setError("This coin isn't saved to your watchlist yet.");
      return;
    }
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      // --- Infer trigger_direction from current price if triggerPrice is set ---
      let triggerDirection: "above" | "below" | null = null;
      let firedImmediately = false;
      const triggerPriceNum = triggerPrice ? parseFloat(triggerPrice) : null;
      const lastPrice = ticker?.lastPrice ?? null;

      if (triggerPriceNum !== null && lastPrice !== null) {
        if (lastPrice > triggerPriceNum) {
          // Current price is ABOVE trigger → we expect it to FALL DOWN to trigger
          triggerDirection = "below";
        } else if (lastPrice < triggerPriceNum) {
          // Current price is BELOW trigger → we expect it to RISE UP to trigger
          triggerDirection = "above";
        } else {
          // Price is exactly at trigger → fire immediately
          triggerDirection = "above"; // default; could use 24h trend to decide
          firedImmediately = true;
        }
      }

      const fireTime = firedImmediately ? new Date().toISOString() : null;

      // Only re-arm when the trigger itself changed. Re-saving with the same
      // trigger (e.g. tweaking EP/SL/TP or notes) must NOT re-fire an alert
      // that already fired — that was the source of duplicate notifications.
      const prevTrigger =
        item.trigger_price ?? item.alert_price ?? null;
      const triggerChanged =
        triggerPriceNum !== null && triggerPriceNum !== prevTrigger;

      // Setting a NEW trigger on an already-fired alert: clear the old fired
      // state first so the immediate-fire claim below can succeed.
      if (firedImmediately && triggerChanged) {
        await fetch(`/api/watchlist/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rearm: true }),
        }).catch(() => {});
      }

      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_price: triggerPriceNum,
          trigger_direction: triggerDirection,
          order_type: orderType || null,
          entry_price: entry,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          // If we fired immediately, mark it fired and don't rearm.
          // Otherwise, rearm only when the trigger was actually changed.
          alert_fired: firedImmediately,
          alert_fired_at: fireTime ?? undefined,
          rearm: triggerChanged && !firedImmediately,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      const saveResult = await res.json().catch(() => null);

      // Dispatch across all channels immediately when the price is already at
      // the trigger (in-app notification + Discord + desktop). The PATCH
      // above claims the fire atomically — skip if another watcher won it.
      if (firedImmediately && triggerPriceNum !== null && saveResult?.claimed !== false) {
        await fetch(`/api/alerts/fire`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "watchlist_trigger",
            title: `${cleanSymbol(symbol)} hit your trigger`,
            message: `Last ${lastPrice} reached your ${triggerPriceNum} trigger.`,
            link: "/watchlist",
          }),
        }).catch(() => {});
      }

      setSavedMsg(
        !triggerPrice
          ? "Alert cleared."
          : firedImmediately
          ? "🚨 Price already at trigger — alert fired!"
          : "Alert saved — you'll be notified when the price hits it."
      );
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const stat = (label: string, value: React.ReactNode, cls = "") => (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="text-xs text-muted">{label}</span>
      <span className={`num font-medium ${cls}`}>{value}</span>
    </div>
  );

  const inputCls =
    "hairline bg-panel px-2.5 py-1.5 text-sm outline-none focus:border-accent w-full";

  return (
    <ModalShell
      title={`${cleanSymbol(symbol)} · USDT perpetual`}
      onClose={onClose}
    >
      {error ? (
        <div className="text-sm text-loss">{error}</div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Big price + 24h */}
          <div className="hairline-b pb-4 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-1">
                Last price
              </div>
              <div className="num text-4xl font-semibold">
                {fmtPx(ticker?.lastPrice)}
              </div>
              <div
                className={`num text-sm mt-1 ${changeClass(
                  ticker?.riseFallRate
                )}`}
              >
                {fmtPct(ticker?.riseFallRate)} 24h
              </div>
            </div>
            {detail?.baseCoinIconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.baseCoinIconUrl}
                alt={detail.baseCoin}
                className="h-14 w-14 rounded-full object-contain border border-line p-1"
              />
            )}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-4">
            {stat(
              "Funding rate",
              fmtPct(ticker?.fundingRate),
              changeClass(ticker?.fundingRate)
            )}
            {stat("24h volume", compact(ticker?.amount24))}
            {stat(
              "Leverage",
              detail
                ? `${detail.minLeverage}–${detail.maxLeverage}x`
                : "…"
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-line gap-6 text-xs font-semibold pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "plan"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              Plan & Alert
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              <span>📜 Setup Audit History</span>
            </button>
          </div>

          {activeTab === "history" ? (
            <div className="pt-2">
              <SetupRevisionTimeline itemId={item?.id} symbol={symbol} />
            </div>
          ) : (
            /* Trade alert / plan */
            <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-3">
                Price alert
              </div>
              <div>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Trigger price
                  <input
                    type="number"
                    step="any"
                    className={`${inputCls} max-w-48`}
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    placeholder="e.g. 68000"
                  />
                </label>
              </div>
              <p className="text-xs text-muted mt-2">
                When the last price hits this trigger — whether it goes{" "}
                <strong>above or below</strong> — you&apos;ll get a{" "}
                <strong>Discord</strong> + <strong>desktop</strong>{" "}
                notification showing your trade plan below.
              </p>
            </div>

            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-3">
                If triggered, this is my trade
              </div>
              <label className="flex flex-col gap-1 text-xs text-muted mb-3">
                Order type
                <select
                  className={`${inputCls} cursor-pointer`}
                  value={orderType}
                  onChange={(e) =>
                    setOrderType(e.target.value as OrderType | "")
                  }
                >
                  <option value="">— Choose —</option>
                  {ORDER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Entry
                  <input
                    type="number"
                    step="any"
                    className={inputCls}
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="—"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Stop loss
                  <input
                    type="number"
                    step="any"
                    className={inputCls}
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="—"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Take profit
                  <input
                    type="number"
                    step="any"
                    className={inputCls}
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="—"
                  />
                </label>
              </div>
            </div>

            {savedMsg && (
              <div className="text-xs text-gain">{savedMsg}</div>
            )}

            <div className="flex justify-end gap-2 hairline-t pt-3">
              {triggerPrice && (
                <button
                  type="button"
                  onClick={() => {
                    setTriggerPrice("");
                    setEntry("");
                    setStopLoss("");
                    setTakeProfit("");
                  }}
                  className="px-3 py-2 text-xs btn-ghost cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save alert"}
              </button>
            </div>
          </form>
          )}
        </div>
      )}
    </ModalShell>
  );
}