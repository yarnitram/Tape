"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InteractiveCandlestickChart } from "./interactive-candlestick-chart";
import { cleanSymbol, fmtPx, mexcChartUrl } from "@/lib/format";
import { FuturesTicker, FuturesDetail } from "@/app/api/mexc/futures/route";

interface Props {
  symbol: string;
}

export function ChartWorkspaceClient({ symbol }: Props) {
  const [ticker, setTicker] = useState<FuturesTicker | null>(null);
  const [detail, setDetail] = useState<FuturesDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const cleanSym = cleanSymbol(symbol);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch(`/api/mexc/futures?symbol=${encodeURIComponent(symbol)}`);
        const json = await res.json();
        if (json.success) {
          setTicker(json.ticker);
          setDetail(json.detail);
        }
      } catch (err) {
        console.error("Failed to load ticker stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [symbol]);

  const isUp = (ticker?.riseFallRate || 0) >= 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Navigation Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/watchlist"
            className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
            title="Back to Watchlist"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white font-mono tracking-wide">
                {cleanSym} / USDT
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                MEXC Futures
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Technical Analysis Chart Workspace & Market Stats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={mexcChartUrl(symbol)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition shadow-lg shadow-cyan-500/10"
          >
            <span>Open on MEXC Exchange</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Market Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            Last Price
          </div>
          <div className="text-base font-bold font-mono text-white mt-1">
            {ticker ? fmtPx(ticker.lastPrice) : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            24h Change
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              isUp ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {ticker
              ? `${isUp ? "+" : ""}${(ticker.riseFallRate * 100).toFixed(2)}%`
              : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            24h High
          </div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1">
            {ticker ? fmtPx(ticker.high24Price) : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            24h Low
          </div>
          <div className="text-base font-bold font-mono text-red-400 mt-1">
            {ticker ? fmtPx(ticker.lower24Price) : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            Funding Rate
          </div>
          <div className="text-base font-bold font-mono text-cyan-400 mt-1">
            {ticker
              ? `${(ticker.fundingRate * 100).toFixed(4)}%`
              : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            24h Volume (USDT)
          </div>
          <div className="text-base font-bold font-mono text-slate-200 mt-1">
            {ticker
              ? `$${(ticker.amount24 / 1_000_000).toFixed(2)}M`
              : "—"}
          </div>
        </div>
      </div>

      {/* Main Full-Screen Interactive Candlestick Chart Workspace */}
      <InteractiveCandlestickChart
        symbol={symbol}
        height={560}
        showOverlayToggle={true}
      />
    </div>
  );
}
