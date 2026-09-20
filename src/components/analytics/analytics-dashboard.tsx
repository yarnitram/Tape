"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
} from "recharts";
import type { RiskSettings, TradeWithExtras } from "@/lib/types";
import { summarizeTrades } from "@/lib/calculations";
import { money } from "@/lib/format";

interface Props {
  trades: TradeWithExtras[];
  riskSettings: RiskSettings | null;
  accountName: string;
}

export function AnalyticsDashboard({
  trades,
  riskSettings,
  accountName,
}: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        if (t.status !== "closed" || !t.exit_time) return true; // keep for count context
        const when = t.exit_time.slice(0, 10);
        if (from && when < from) return false;
        if (to && when > to) return false;
        return true;
      }),
    [trades, from, to]
  );

  const closed = useMemo(() => filtered.filter((t) => t.status === "closed"), [filtered]);
  const summary = useMemo(() => summarizeTrades(closed), [closed]);

  // Daily loss: today's realized losses.
  const today = new Date().toISOString().slice(0, 10);
  const todayPnl = closed
    .filter((t) => t.exit_time?.slice(0, 10) === today)
    .reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);
  const maxDailyLoss = riskSettings?.max_daily_loss ?? null;
  const overLimit =
    maxDailyLoss != null && todayPnl < -Math.abs(maxDailyLoss);

  const inputCls =
    "hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent";

  const statCard = (label: string, value: React.ReactNode, sub?: string) => (
    <div className="hairline p-4">
      <div className="text-xs text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold num">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );

  const tagData = useMemo(
    () =>
      Object.entries(summary.byTag)
        .map(([name, m]) => ({
          name,
          netPnl: m.netPnl,
          winRate: m.winRate == null ? 0 : m.winRate * 100,
          count: m.count,
        }))
        .sort((a, b) => b.netPnl - a.netPnl),
    [summary]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Performance</p>
          <h1 className="text-2xl font-semibold mb-1">Analytics</h1>
          <p className="text-sm text-muted">
            {accountName} · {closed.length} closed trades
          </p>
        </div>
        <div className="flex gap-2 items-end">
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
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard(
          "Win rate",
          summary.winRate != null ? pctFmt(summary.winRate) : "—",
          `${summary.winners}W · ${summary.losers}L`
        )}
        {statCard("Profit factor", fmt(summary.profitFactor))}
        {statCard("Avg R", fmtR(summary.averageR))}
        {statCard("Expectancy", money(summary.expectancy))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equity curve */}
        <div className="hairline p-4">
          <h2 className="text-sm font-semibold mb-3">Equity curve (realized)</h2>
          {summary.equityCurve.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={summary.equityCurve}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(v) => [money(Number(v)), "Cumulative"]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted py-10 text-center">
              Not enough closed trades to plot an equity curve.
            </div>
          )}
        </div>

        {/* Tag breakdown */}
        <div className="hairline p-4">
          <h2 className="text-sm font-semibold mb-3">Performance by tag</h2>
          {tagData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={tagData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  width={55}
                />
                <Tooltip formatter={(v) => [money(Number(v)), "Net P&L"]} />
                <Bar
                  dataKey="netPnl"
                  isAnimationActive={false}
                  radius={[0, 0, 0, 0]}
                >
                  {tagData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.netPnl >= 0 ? "var(--gain)" : "var(--loss)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted py-10 text-center">
              No tagged closed trades yet.
            </div>
          )}
        </div>
      </div>

      {/* Daily loss limit strip */}
      <div
        className={`hairline p-4 flex items-center justify-between ${
          overLimit ? "border-loss" : ""
        }`}
      >
        <div>
          <div className="text-xs text-muted uppercase tracking-wide mb-1">
            Today&apos;s realized P&amp;L
          </div>
          <div
            className={`num text-xl font-semibold ${
              todayPnl > 0
                ? "text-gain"
                : todayPnl < 0
                  ? "text-loss"
                  : ""
            }`}
          >
            {todayPnl >= 0 ? "+" : ""}
            {money(todayPnl)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Daily loss limit</div>
          <div className="text-sm">
            {maxDailyLoss != null ? money(-Math.abs(maxDailyLoss)) : "Not set"}
          </div>
          {overLimit && (
            <div className="text-xs text-loss mt-1 font-semibold">
              ⚠ Loss limit hit — stop for the day
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(v: number | null): string {
  if (v == null) return "—";
  const n = Math.round(v * 100) / 100;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function pctFmt(frac: number): string {
  return `${(frac * 100).toFixed(1)}%`;
}

function fmtR(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;
}