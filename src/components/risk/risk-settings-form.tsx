"use client";

import { useState } from "react";
import type { Account, RiskSettings } from "@/lib/types";

interface Props {
  account: Account | null;
  settings: RiskSettings | null;
}

export function RiskSettingsForm({ account, settings }: Props) {
  const [dailyLoss, setDailyLoss] = useState(
    settings?.max_daily_loss != null ? String(settings.max_daily_loss) : ""
  );
  const [positionRisk, setPositionRisk] = useState(
    settings?.max_position_risk_pct != null
      ? String(settings.max_position_risk_pct)
      : ""
  );
  const [maxOpen, setMaxOpen] = useState(
    settings?.max_open_positions != null
      ? String(settings.max_open_positions)
      : ""
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputCls =
    "hairline bg-panel px-3 py-2 text-sm outline-none focus:border-accent w-48";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/risk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          maxDailyLoss: dailyLoss,
          maxPositionRiskPct: positionRisk,
          maxOpenPositions: maxOpen,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setStatus("Saved ✓");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="eyebrow mb-1">Guardrails</p>
      <h1 className="text-2xl font-semibold mb-1">Risk settings</h1>
      <p className="text-sm text-muted mb-6">
        {account?.name ?? "No account"} — limits used by the analytics daily-loss
        strip and open-position tracking.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Max daily loss (USD)
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={dailyLoss}
            onChange={(e) => setDailyLoss(e.target.value)}
            placeholder="e.g. 500"
          />
          <span className="text-xs text-muted/70">
            When today&apos;s realized loss exceeds this, the analytics strip
            flags a stop-for-the-day.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Max position risk (%)
          <input
            type="number"
            step="0.05"
            className={inputCls}
            value={positionRisk}
            onChange={(e) => setPositionRisk(e.target.value)}
            placeholder="e.g. 1.0"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Max open positions
          <input
            type="number"
            step="1"
            className={inputCls}
            value={maxOpen}
            onChange={(e) => setMaxOpen(e.target.value)}
            placeholder="e.g. 3"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !account}
            className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {status && <span className="text-sm text-muted">{status}</span>}
        </div>
      </form>
    </div>
  );
}