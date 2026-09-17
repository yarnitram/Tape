"use client";

import type { TradeWithExtras } from "@/lib/types";
import { money, r } from "@/lib/format";

interface Props {
  trades: TradeWithExtras[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[], value: boolean) => void;
  onRowClick: (t: TradeWithExtras) => void;
}

export function TradeTable({
  trades,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRowClick,
}: Props) {
  if (trades.length === 0) {
    return (
      <div className="hairline text-muted p-8 text-center text-sm">
        No trades yet — add your first one.
      </div>
    );
  }

  const allSelected = trades.every((t) => selectedIds.has(t.id));
  const someSelected = !allSelected && trades.some((t) => selectedIds.has(t.id));

  function toggleAll() {
    onToggleAll(
      trades.map((t) => t.id),
      !allSelected
    );
  }

  return (
    <div className="hairline overflow-x-auto bg-panel/40">
      <table className="w-full text-sm border-collapse min-w-[820px]">
        <thead>
          <tr className="text-left text-xs text-muted uppercase tracking-wide hairline-b">
            <th className="px-3 py-2.5 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                aria-label="Select all"
                className="accent-accent cursor-pointer"
              />
            </th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Symbol</th>
            <th className="px-3 py-2.5">Side</th>
            <th className="px-3 py-2.5 text-right">Entry</th>
            <th className="px-3 py-2.5 text-right">Exit</th>
            <th className="px-3 py-2.5 text-right">Size</th>
            <th className="px-3 py-2.5 text-right">P&amp;L</th>
            <th className="px-3 py-2.5 text-right">R</th>
            <th className="px-3 py-2.5">Tags</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = t.pnl_dollars ?? 0;
            const isGain = pnl > 0;
            const isLoss = pnl < 0;
            const isOpen = t.status === "open";
            return (
              <tr
                key={t.id}
                onClick={() => onRowClick(t)}
                className="cursor-pointer hover:bg-panel transition-colors hairline-b"
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => onToggleSelect(t.id)}
                    aria-label={`Select ${t.symbol}`}
                    className="accent-accent cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5 num">
                  {formatDate(t.exit_time ?? t.entry_time)}
                </td>
                <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={
                      t.direction === "long" ? "text-gain" : "text-loss"
                    }
                  >
                    {t.direction === "long" ? "Long" : "Short"}
                  </span>
                </td>
                <td className="px-3 py-2.5 num">{num(t.entry_price)}</td>
                <td className="px-3 py-2.5 num">
                  {t.exit_price != null ? num(t.exit_price) : null}
                  {isOpen && (
                    <span className="text-muted text-xs ml-1">open</span>
                  )}
                </td>
                <td className="px-3 py-2.5 num">{num(t.size)}</td>
                <td
                  className={`px-3 py-2.5 num font-medium ${
                    isGain ? "text-gain" : isLoss ? "text-loss" : ""
                  }`}
                >
                  {isOpen ? "—" : `${pnl >= 0 ? "+" : "-"}${money(Math.abs(pnl))}`}
                </td>
                <td
                  className={`px-3 py-2.5 num ${
                    isGain ? "text-gain" : isLoss ? "text-loss" : ""
                  }`}
                >
                  {isOpen ? "—" : r(t.r_multiple)}
                </td>
                <td className="px-3 py-2.5">
                  {t.tags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tg) => (
                        <span
                          key={tg.id}
                          className="hairline px-1.5 py-0.5 text-xs text-muted"
                        >
                          {tg.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function num(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
}