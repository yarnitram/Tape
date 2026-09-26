"use client";

import { useMemo } from "react";
import type { TradeAlert } from "@/lib/types";
import { money } from "@/lib/format";

interface Props {
  closedTrades: TradeAlert[];
}

export function EquityCurveChart({ closedTrades }: Props) {
  const points = useMemo(() => {
    // Sort closed trades chronologically by closed_at
    const sorted = [...closedTrades]
      .filter((t) => t.closed_at && t.realized_pnl_usd != null)
      .sort(
        (a, b) =>
          new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime()
      );

    let cumulative = 0;
    const list: Array<{ date: string; cumulative: number }> = [
      { date: "Start", cumulative: 0 },
    ];

    for (const t of sorted) {
      cumulative += Number(t.realized_pnl_usd) || 0;
      const d = new Date(t.closed_at!);
      const dateStr = d.toLocaleDateString("en-SG", {
        month: "short",
        day: "numeric",
      });
      list.push({ date: dateStr, cumulative });
    }

    return list;
  }, [closedTrades]);

  if (points.length <= 1) {
    return (
      <div className="hairline p-6 rounded-xl bg-panel/40 text-center text-xs text-muted">
        No completed trade data available yet to render equity curve.
      </div>
    );
  }

  // Calculate SVG dimensions and scale points
  const width = 600;
  const height = 160;
  const padding = 20;

  const minVal = Math.min(0, ...points.map((p) => p.cumulative));
  const maxVal = Math.max(10, ...points.map((p) => p.cumulative));
  const valRange = maxVal - minVal || 1;

  const getX = (idx: number) =>
    padding + (idx / (points.length - 1)) * (width - padding * 2);
  const getY = (val: number) =>
    height - padding - ((val - minVal) / valRange) * (height - padding * 2);

  const pathD = points.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.cumulative);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  const fillD = `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

  const finalPnl = points[points.length - 1].cumulative;
  const isPositive = finalPnl >= 0;

  return (
    <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>📈 Equity Curve (Cumulative PnL)</span>
        </h3>
        <span
          className={`font-mono font-semibold text-sm ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {money(finalPnl)}
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40 overflow-visible"
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isPositive ? "#10b981" : "#f43f5e"}
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? "#10b981" : "#f43f5e"}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Zero baseline */}
          <line
            x1={padding}
            y1={getY(0)}
            x2={width - padding}
            y2={getY(0)}
            stroke="#3f3f46"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Area Fill */}
          <path d={fillD} fill="url(#equityGrad)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(p.cumulative)}
              r="3"
              fill={isPositive ? "#10b981" : "#f43f5e"}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
