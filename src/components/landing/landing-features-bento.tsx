"use client";

import Link from "next/link";

export function LandingFeaturesBento() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-panel-soft/30 hairline-y relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-semibold mb-3">
            <span>⚡ THE COMPLETE TRADING ARSENAL</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text">
            Engineered for Traders Who Value{" "}
            <span className="brand-gradient font-black">Ruthless Discipline.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted">
            Eliminate emotional hesitation, chart fatigue, and chaotic spreadsheets. MOCHEX gives
            you an integrated workstation to plan, monitor, and journal every setup.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Interactive Candlestick Station & Script Studio (Span 2 Columns) */}
          <div
            id="terminal"
            className="md:col-span-2 rounded-2xl bg-panel border border-line p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-accent/40 transition-colors shadow-sm"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none -z-10" />

            <div>
              <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-2xl mb-6">
                📈
              </div>
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-accent">
                Core Terminal
              </span>
              <h3 className="text-2xl font-bold text-text mt-1">
                Interactive Chart Station & Formula Studio
              </h3>
              <p className="text-muted mt-2 text-sm leading-relaxed max-w-xl">
                Stream real-time MEXC Perpetual Futures kline data across 6 timeframes (1m to 1d).
                Equipped with progressive EMAs (20/50/100/200), candle close countdown timers,
                1-click PNG camera snapshots, and our brand new <strong>Formula & Script Studio</strong>{" "}
                allowing you to write and compile PineScript-equivalent algorithms (SMA, EMA, RSI,
                Donchian, Bollinger Bands) directly in your browser.
              </p>
            </div>

            {/* Feature Highlights Pills */}
            <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-line/60 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-panel-soft border border-line text-text">
                📜 PineScript Math Runner
              </span>
              <span className="px-2.5 py-1 rounded-md bg-panel-soft border border-line text-text">
                🌀 Fib Golden Pocket 0.618
              </span>
              <span className="px-2.5 py-1 rounded-md bg-panel-soft border border-line text-text">
                ⚖️ Live Risk/Reward Box
              </span>
              <span className="px-2.5 py-1 rounded-md bg-panel-soft border border-line text-text">
                📸 High-Res PNG Camera
              </span>
            </div>
          </div>

          {/* Card 2: Synthesized Audio Proximity Radar (1 Column) */}
          <div
            id="alarms"
            className="rounded-2xl bg-panel border border-line p-6 sm:p-8 flex flex-col justify-between group hover:border-accent/40 transition-colors shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-gain/15 border border-gain/30 text-gain flex items-center justify-center text-2xl mb-6">
                🔊
              </div>
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-gain">
                Zero Chart Fatigue
              </span>
              <h3 className="text-xl font-bold text-text mt-1">
                Synthesized Audio Proximity Radar
              </h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Never stare at candlestick charts for hours waiting for a bounce. MOCHEX's built-in
                Web Audio synthesizer generates distinct progressive sound frequencies as price
                approaches, touches, or breaches your planned trigger levels.
              </p>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-panel-soft/80 border border-line/80 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-muted">
                <span>Distance Radar:</span>
                <span className="text-accent font-bold">Within 0.50%</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Audio Tone:</span>
                <span className="text-gain font-bold">High Pitch Chime (880Hz)</span>
              </div>
            </div>
          </div>

          {/* Card 3: TradingView Webhook Ingestion (1 Column) */}
          <div
            id="webhooks"
            className="rounded-2xl bg-panel border border-line p-6 sm:p-8 flex flex-col justify-between group hover:border-accent/40 transition-colors shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl mb-6">
                🌐
              </div>
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-blue-400">
                Automated Signals
              </span>
              <h3 className="text-xl font-bold text-text mt-1">
                TradingView Webhook Integration
              </h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Route your custom TradingView alert webhooks directly into MOCHEX with secret HMAC
                token verification. Instantly populate your active watchlist or fire triggers
                without manual entry.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-line/60">
              <code className="text-[11px] font-mono text-accent bg-panel-soft px-2 py-1 rounded block truncate border border-line">
                POST /api/webhooks/tradingview
              </code>
            </div>
          </div>

          {/* Card 4: Execution Journal & Setup Revision History (1 Column) */}
          <div className="rounded-2xl bg-panel border border-line p-6 sm:p-8 flex flex-col justify-between group hover:border-accent/40 transition-colors shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mb-6">
                📖
              </div>
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-amber-400">
                Psychology & Analytics
              </span>
              <h3 className="text-xl font-bold text-text mt-1">
                Discipline Journal & Revisions
              </h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Log completed trades with automatic PnL calculations, win rates, profit factor,
                tags, and chart attachments. Compare your original trade setup against your actual
                execution to eliminate FOMO and revenge trading.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-mono pt-4 border-t border-line/60">
              <span className="text-muted">Setup Tracking:</span>
              <span className="text-gain font-bold">Planned vs Actual</span>
            </div>
          </div>

          {/* Card 5: Public Setup Cards & Zero API Keys Security (1 Column) */}
          <div className="rounded-2xl bg-panel border border-line p-6 sm:p-8 flex flex-col justify-between group hover:border-accent/40 transition-colors shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center text-2xl mb-6">
                🛡️
              </div>
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-purple-400">
                Security & Sharing
              </span>
              <h3 className="text-xl font-bold text-text mt-1">
                Zero API Keys & Social Cards
              </h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                MOCHEX never touches your exchange API keys or withdrawal permissions. Share
                read-only setup cards on Twitter, Telegram, and Discord with dynamic high-resolution
                OpenGraph preview cards.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-mono pt-4 border-t border-line/60">
              <span className="text-muted">Dynamic Socials:</span>
              <span className="text-accent font-bold">High-DPI PNG Card</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
