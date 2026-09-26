"use client";

import { useEffect, useState, useCallback } from "react";
import type { SetupRevision, SetupRevisionType } from "@/lib/types";
import { fmtPx } from "@/lib/format";

interface Props {
  itemId?: string;
  symbol?: string;
  initialRevisions?: SetupRevision[];
}

export function SetupRevisionTimeline({
  itemId,
  symbol,
  initialRevisions,
}: Props) {
  const [revisions, setRevisions] = useState<SetupRevision[]>(
    initialRevisions || []
  );
  const [loading, setLoading] = useState<boolean>(!initialRevisions);
  const [error, setError] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    if (!itemId && !symbol) return;

    try {
      setLoading(true);
      setError(null);
      const query = itemId
        ? `item_id=${encodeURIComponent(itemId)}`
        : `symbol=${encodeURIComponent(symbol!)}`;

      const res = await fetch(`/api/revisions?${query}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to load setup revision history");
      }

      setRevisions(json.revisions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [itemId, symbol]);

  useEffect(() => {
    if (!initialRevisions) {
      fetchRevisions();
    }
  }, [fetchRevisions, initialRevisions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 bg-panel px-4 py-2.5 rounded-xl border border-line">
          <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-mono text-muted">
            Loading Setup Audit Trail...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-loss/10 border border-loss/20 rounded-xl text-center text-xs text-loss">
        ⚠️ {error}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="p-8 text-center bg-panel-soft/40 border border-line rounded-xl">
        <div className="text-2xl mb-2">📜</div>
        <h4 className="text-sm font-bold text-text mb-1">No Revisions Logged Yet</h4>
        <p className="text-xs text-muted max-w-xs mx-auto">
          Setup modifications (SL adjustments, breakeven moves, thesis updates) will appear here in chronological order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text">📜 Setup Revision History</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-panel-soft text-muted border border-line font-mono font-bold">
            {revisions.length} Events
          </span>
        </div>
      </div>

      <div className="relative border-l-2 border-line ml-4 pl-6 space-y-6">
        {revisions.map((rev) => {
          const badge = getRevisionBadge(rev.revision_type);
          const dateStr = formatSGT(rev.created_at);

          return (
            <div key={rev.id} className="relative group">
              {/* Event Circle Marker */}
              <div
                className={`absolute -left-[33px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg border ${badge.badgeBorder} ${badge.badgeBg}`}
              >
                {badge.icon}
              </div>

              {/* Event Content Card */}
              <div className="bg-panel border border-line p-4 rounded-xl shadow-md space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold border ${badge.badgeBorder} ${badge.badgeBg} ${badge.textColor}`}>
                      {badge.label}
                    </span>
                    <h5 className="text-sm font-bold text-text font-mono">{rev.title}</h5>
                  </div>
                  <span className="text-[11px] font-mono text-muted">{dateStr}</span>
                </div>

                {rev.description && (
                  <p className="text-xs text-text leading-relaxed font-sans">
                    {rev.description}
                  </p>
                )}

                {/* Diff Box if old vs new values exist */}
                {(rev.old_value || rev.new_value) && (
                  <div className="pt-2 border-t border-line flex flex-wrap items-center gap-3 text-xs font-mono">
                    {rev.old_value && (
                      <span className="text-muted">
                        Before: <strong className="text-text">{formatValDiff(rev.old_value)}</strong>
                      </span>
                    )}
                    {rev.old_value && rev.new_value && <span className="text-muted">➔</span>}
                    {rev.new_value && (
                      <span className="text-gain">
                        Updated: <strong className="text-gain">{formatValDiff(rev.new_value)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRevisionBadge(type: SetupRevisionType | string) {
  switch (type) {
    case "SL_BREAKEVEN":
      return {
        icon: "🛡️",
        label: "Risk Eliminated (Breakeven)",
        badgeBg: "bg-gain/15",
        badgeBorder: "border-gain/30",
        textColor: "text-gain",
      };
    case "SL_ADJUSTED":
      return {
        icon: "🛑",
        label: "Stop Loss Adjusted",
        badgeBg: "bg-loss/15",
        badgeBorder: "border-loss/30",
        textColor: "text-loss",
      };
    case "TP_ADJUSTED":
      return {
        icon: "🏁",
        label: "Take Profit Adjusted",
        badgeBg: "bg-accent/15",
        badgeBorder: "border-accent/30",
        textColor: "text-accent",
      };
    case "NOTE_UPDATED":
      return {
        icon: "📝",
        label: "Thesis Commentary Updated",
        badgeBg: "bg-panel-soft",
        badgeBorder: "border-line",
        textColor: "text-text",
      };
    case "TRIGGER_FIRED":
      return {
        icon: "🔥",
        label: "Alert Fired",
        badgeBg: "bg-amber-500/15",
        badgeBorder: "border-amber-500/30",
        textColor: "text-amber-400",
      };
    case "CREATED":
    default:
      return {
        icon: "🚀",
        label: "Initial Trade Plan Published",
        badgeBg: "bg-accent/15",
        badgeBorder: "border-accent/30",
        textColor: "text-accent",
      };
  }
}

function formatValDiff(val: Record<string, unknown>): string {
  if (typeof val.price === "number") return fmtPx(val.price);
  if (typeof val.stop_loss === "number") return `SL: ${fmtPx(val.stop_loss)}`;
  if (typeof val.take_profit === "number") return `TP: ${fmtPx(val.take_profit)}`;
  if (typeof val.notes === "string") return `"${val.notes}"`;
  return JSON.stringify(val);
}

function formatSGT(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Singapore",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return iso;
  }
}
