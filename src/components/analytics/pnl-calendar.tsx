"use client";

import { useMemo, useState } from "react";
import type { TradeAlert } from "@/lib/types";
import { money } from "@/lib/format";

interface Props {
  closedTrades: TradeAlert[];
  onSelectDate?: (dateStr: string | null) => void;
}

export function PnlCalendar({ closedTrades, onSelectDate }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeDate, setActiveDate] = useState<string | null>(null);

  // Group trades by YYYY-MM-DD in Singapore Time (SGT)
  const dailyData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number; losses: number }> = {};

    for (const t of closedTrades) {
      if (!t.closed_at || t.realized_pnl_usd == null) continue;
      const d = new Date(t.closed_at);
      if (Number.isNaN(d.getTime())) continue;

      const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); // YYYY-MM-DD
      const pnl = Number(t.realized_pnl_usd) || 0;

      if (!map[dateStr]) {
        map[dateStr] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      }
      map[dateStr].pnl += pnl;
      map[dateStr].count += 1;
      if (pnl > 0) map[dateStr].wins += 1;
      else if (pnl < 0) map[dateStr].losses += 1;
    }

    return map;
  }, [closedTrades]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{ dayNum: number | null; dateStr: string | null }> = [];

    // Empty padding cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: null });
    }

    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      days.push({ dayNum: d, dateStr });
    }

    return days;
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr: string | null) => {
    if (!dateStr) return;
    const next = activeDate === dateStr ? null : dateStr;
    setActiveDate(next);
    if (onSelectDate) onSelectDate(next);
  };

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>📅 Daily PnL Calendar</span>
          {activeDate && (
            <span className="text-xs text-accent font-normal font-mono">
              (Filtered: {activeDate})
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="px-2 py-1 text-xs btn-ghost cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-xs font-semibold font-mono">{monthLabel}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="px-2 py-1 text-xs btn-ghost cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-muted uppercase">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          if (!cell.dayNum || !cell.dateStr) {
            return <div key={idx} className="h-16 rounded bg-surface/10 opacity-30" />;
          }

          const stats = dailyData[cell.dateStr];
          const hasTrades = Boolean(stats && stats.count > 0);
          const isGain = stats && stats.pnl > 0;
          const isLoss = stats && stats.pnl < 0;
          const isSelected = activeDate === cell.dateStr;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(cell.dateStr)}
              className={`h-16 p-1.5 rounded flex flex-col justify-between text-left transition-all cursor-pointer border ${
                isSelected
                  ? "border-accent ring-1 ring-accent"
                  : hasTrades
                  ? isGain
                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                    : isLoss
                    ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20"
                    : "bg-surface/30 border-hairline hover:bg-surface/50"
                  : "bg-surface/20 border-hairline/40 hover:bg-surface/40"
              }`}
            >
              <span className="text-[10px] font-mono text-muted font-medium">
                {cell.dayNum}
              </span>

              {stats && stats.count > 0 ? (
                <div className="flex flex-col items-start leading-none">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isGain ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-muted"
                    }`}
                  >
                    {isGain ? "+" : ""}
                    {money(stats.pnl)}
                  </span>
                  <span className="text-[9px] font-mono text-muted mt-0.5">
                    {stats.count} trade{stats.count > 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-muted/30 font-mono">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
