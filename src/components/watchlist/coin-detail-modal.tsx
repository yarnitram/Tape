"use client";

import { useEffect, useState } from "react";
import type { WatchlistItem, OrderType } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";

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
      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_price: triggerPrice,
          order_type: orderType || null,
          entry_price: entry,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          rearm: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      setSavedMsg(
        triggerPrice ? "Alert saved — you'll be notified when the price hits it." : "Alert cleared."
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

          {/* Trade alert / plan */}
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
        </div>
      )}
    </ModalShell>
  );
}