"use client";

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
}

export function ChartModal({ isOpen, onClose, symbol, setup }: Props) {
  if (!isOpen) return null;

  const cleanSym = cleanSymbol(symbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
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
                Interactive MEXC Futures Candlestick Chart & Trade Plan Overlay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={mexcChartUrl(symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg transition"
            >
              <span>External MEXC Chart</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

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
          <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-mono">
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
        <div className="p-4 sm:p-6 overflow-y-auto">
          <InteractiveCandlestickChart
            symbol={symbol}
            setup={setup}
            height={460}
            showOverlayToggle={true}
          />
        </div>
      </div>
    </div>
  );
}
