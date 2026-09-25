"use client";

import { sideForTrigger, type TradeAlert } from "@/lib/types";

interface Props {
  closedAlerts: TradeAlert[];
  onEdit: (alert: TradeAlert) => void;
  onArchive: (alert: TradeAlert) => void;
}

function formatSymbol(sym: string): string {
  return sym.replace(/_USDT$/i, "");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ClosedTradesTab({ closedAlerts, onEdit, onArchive }: Props) {
  if (closedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
        <span className="text-3xl mb-2">🏁</span>
        <h3 className="text-sm font-semibold text-zinc-300">No Closed Trades</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          When trades hit their Stop-Loss/Take-Profit target or are closed manually, they will appear here in your history.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
      <table className="w-full text-left text-xs text-zinc-300">
        <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
          <tr>
            <th className="py-3 px-4">Coin</th>
            <th className="py-3 px-4">Side</th>
            <th className="py-3 px-4">Entry</th>
            <th className="py-3 px-4">Exit</th>
            <th className="py-3 px-4">Realized PnL ($)</th>
            <th className="py-3 px-4">Realized PnL (%)</th>
            <th className="py-3 px-4">Exit Reason</th>
            <th className="py-3 px-4">Closed Date</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {closedAlerts.map((row) => {
            const side = sideForTrigger(row.trigger_direction);
            const entry = row.entry_price ?? row.fired_price;
            const pnlUsd = row.realized_pnl_usd;
            const pnlPct = row.realized_pnl_pct;
            const isWin = (pnlUsd ?? 0) >= 0;

            const reasonBadge =
              row.closed_reason === "tp_hit"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : row.closed_reason === "sl_hit"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20";

            const reasonLabel =
              row.closed_reason === "tp_hit"
                ? "TP Hit"
                : row.closed_reason === "sl_hit"
                ? "SL Hit"
                : "Manual Close";

            return (
              <tr key={row.id} className="hover:bg-zinc-900/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-zinc-100">
                  {formatSymbol(row.symbol)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                      side === "long"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">{entry != null ? entry : "—"}</td>
                <td className="py-3 px-4 font-mono text-zinc-100">
                  {row.exit_price != null ? row.exit_price : "—"}
                </td>
                <td
                  className={`py-3 px-4 font-mono font-semibold ${
                    isWin ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {pnlUsd != null
                    ? `${isWin ? "+" : ""}$${pnlUsd.toFixed(2)}`
                    : "—"}
                </td>
                <td
                  className={`py-3 px-4 font-mono font-semibold ${
                    isWin ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {pnlPct != null
                    ? `${isWin ? "+" : ""}${(pnlPct * 100).toFixed(2)}%`
                    : "—"}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${reasonBadge}`}
                  >
                    {reasonLabel}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-400">{formatDate(row.closed_at)}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    title="Edit Trade"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => onArchive(row)}
                    title="Archive Trade"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                  >
                    📦
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
