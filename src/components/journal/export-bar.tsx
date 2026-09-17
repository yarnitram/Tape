"use client";

import { useMemo, useState } from "react";
import type { TradeWithExtras } from "@/lib/types";
import { downloadXlsx } from "@/lib/export-trades";

interface Props {
  trades: TradeWithExtras[];
  selectedIds: Set<string>;
  symbolOptions: string[];
}

export function ExportBar({ trades, selectedIds, symbolOptions }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [symbol, setSymbol] = useState("");

  // Apply the date-range + symbol filters (used by both "range" and "all").
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      const when = (t.exit_time ?? t.entry_time).slice(0, 10);
      if (from && when < from) return false;
      if (to && when > to) return false;
      if (symbol && t.symbol !== symbol) return false;
      return true;
    });
  }, [trades, from, to, symbol]);

  const selected = useMemo(() => {
    const set = selectedIds;
    return trades.filter((t) => set.has(t.id));
  }, [trades, selectedIds]);

  function handleExportAll() {
    downloadXlsx(filtered, `tape-trades-${stamp()}.xlsx`);
  }

  function handleExportSelected() {
    downloadXlsx(selected, `tape-selected-${stamp()}.xlsx`);
  }

  function handleExportRange() {
    // Export "range" = the currently filtered set, same as all but scoped.
    downloadXlsx(filtered, `tape-range-${stamp()}.xlsx`);
  }

  const inputCls =
    "hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent";

  return (
    <div className="hairline flex flex-wrap items-end gap-3 px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">From</span>
        <input
          type="date"
          className={inputCls}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">To</span>
        <input
          type="date"
          className={inputCls}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">Symbol</span>
        <select
          className={inputCls}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        >
          <option value="">All</option>
          {symbolOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={handleExportRange}
          disabled={filtered.length === 0}
          className="px-3 py-1.5 text-xs btn-ghost cursor-pointer disabled:opacity-50"
          title="Export trades in the current date/symbol selection"
        >
          Export range ({filtered.length})
        </button>
        <button
          type="button"
          onClick={handleExportSelected}
          disabled={selected.length === 0}
          className="px-3 py-1.5 text-xs btn-ghost cursor-pointer disabled:opacity-50"
        >
          Export selected ({selected.length})
        </button>
        <button
          type="button"
          onClick={handleExportAll}
          disabled={trades.length === 0}
          className="px-3 py-1.5 text-xs accent-btn font-semibold cursor-pointer disabled:opacity-50"
        >
          Export all ({trades.length})
        </button>
      </div>
    </div>
  );
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}