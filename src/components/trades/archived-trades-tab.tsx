"use client";

import type { ArchivedTradeAlert } from "@/lib/types";
import { sideForTrigger } from "@/lib/types";
import { mexcChartUrl } from "@/lib/format";

interface Props {
  archivedAlerts: ArchivedTradeAlert[];
  onEdit: (alert: ArchivedTradeAlert) => void;
  onRestore: (alert: ArchivedTradeAlert) => void;
  onDeletePermanent: (alert: ArchivedTradeAlert) => void;
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

export function ArchivedTradesTab({
  archivedAlerts,
  onEdit,
  onRestore,
  onDeletePermanent,
}: Props) {
  if (archivedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
        <span className="text-3xl mb-2">📦</span>
        <h3 className="text-sm font-semibold text-zinc-300">Archive is Empty</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          Archived or soft-deleted trades will appear here. You can restore them anytime or delete them permanently.
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
            <th className="py-3 px-4">Status at Archive</th>
            <th className="py-3 px-4">Entry Price</th>
            <th className="py-3 px-4">Exit Price</th>
            <th className="py-3 px-4">Realized PnL</th>
            <th className="py-3 px-4">Archived Date</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {archivedAlerts.map((row) => {
            const side = sideForTrigger(row.trigger_direction);
            const entry = row.entry_price ?? row.fired_price;
            const pnlUsd = row.realized_pnl_usd;
            const isWin = (pnlUsd ?? 0) >= 0;

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
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium capitalize ${
                      row.status_at_archive === "closed"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {row.status_at_archive}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">{entry != null ? entry : "—"}</td>
                <td className="py-3 px-4 font-mono text-zinc-100">
                  {row.exit_price != null ? row.exit_price : "—"}
                </td>
                <td
                  className={`py-3 px-4 font-mono font-semibold ${
                    pnlUsd != null
                      ? isWin
                        ? "text-emerald-400"
                        : "text-rose-400"
                      : "text-zinc-500"
                  }`}
                >
                  {pnlUsd != null ? `${isWin ? "+" : ""}$${pnlUsd.toFixed(2)}` : "—"}
                </td>
                <td className="py-3 px-4 text-zinc-400">{formatDate(row.archived_at)}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <a
                    href={mexcChartUrl(row.symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${formatSymbol(row.symbol)} chart on MEXC`}
                    className="p-1.5 rounded-lg inline-block text-zinc-400 hover:text-accent hover:bg-accent/10 transition-colors"
                  >
                    📈
                  </a>
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
                    onClick={() => onRestore(row)}
                    title="Restore Trade"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                  >
                    ↩
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePermanent(row)}
                    title="Delete Permanently"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                  >
                    🗑
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
