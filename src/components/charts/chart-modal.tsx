"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  InteractiveCandlestickChart,
  TradeSetupOverlay,
} from "./interactive-candlestick-chart";
import { cleanSymbol, fmtPx, mexcChartUrl } from "@/lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  setup?: TradeSetupOverlay | null;
  isPublic?: boolean;
}

export function ChartModal({ isOpen, onClose, symbol, setup, isPublic = false }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const cleanSym = cleanSymbol(symbol);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized
            ? "max-w-[96vw] h-[94vh]"
            : "max-w-6xl max-h-[92vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 flex items-center justify-center text-lg font-bold">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white font-mono">
                  {cleanSym} / USDT
                </h3>
                {setup?.order_type && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {setup.order_type}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Interactive MEXC Candlestick Chart & Trade Plan Overlay
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Open Dedicated Page Link (Private logged-in users only) */}
            {!isPublic && (
              <Link
                href={`/chart/${encodeURIComponent(cleanSym)}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 rounded-xl transition"
                title="Open dedicated full-screen chart page in new tab"
              >
                <span>↗️ Dedicated Page</span>
              </Link>
            )}

            {/* External MEXC Link */}
            <a
              href={mexcChartUrl(symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
              title="View on MEXC Exchange"
            >
              <span>MEXC Chart</span>
            </a>

            {/* Maximize / Restore Toggle Button */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-800 transition"
              title={isMaximized ? "Restore Modal Size" : "Maximize Modal to Full Screen"}
            >
              {isMaximized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7M3 9V3m0 0h6m-6 0l7 7m11 11v-6m0 6h-6m6 0l-7-7" />
                </svg>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close Modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Setup Level Badges Bar if setup exists */}
        {setup && (
          <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 text-xs font-sans font-medium">Active Setup Levels:</span>
            {setup.trigger_price && setup.trigger_price > 0 && (
              <span className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 flex items-center gap-1">
                <span>⚡ Trigger:</span>
                <strong>{fmtPx(setup.trigger_price)}</strong>
              </span>
            )}
            {setup.entry_price && setup.entry_price > 0 && (
              <span className="px-2.5 py-1 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 flex items-center gap-1">
                <span>🎯 Entry:</span>
                <strong>{fmtPx(setup.entry_price)}</strong>
              </span>
            )}
            {setup.stop_loss && setup.stop_loss > 0 && (
              <span className="px-2.5 py-1 rounded bg-red-950/40 text-red-300 border border-red-800/40 flex items-center gap-1">
                <span>🛑 SL:</span>
                <strong>{fmtPx(setup.stop_loss)}</strong>
              </span>
            )}
            {setup.take_profit && setup.take_profit > 0 && (
              <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                <span>🏁 TP:</span>
                <strong>{fmtPx(setup.take_profit)}</strong>
              </span>
            )}
          </div>
        )}

        {/* Modal Chart Body */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto">
          <InteractiveCandlestickChart
            symbol={symbol}
            setup={setup}
            height={isMaximized ? 660 : 540}
            showOverlayToggle={true}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
