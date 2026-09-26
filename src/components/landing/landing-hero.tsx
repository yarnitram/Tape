"use client";

import Link from "next/link";

interface Props {
  user: { email: string } | null;
}

export function LandingHero({ user }: Props) {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[24rem] bg-accent/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-medium mb-6 shadow-sm hover:bg-accent/15 transition-colors">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>NEXT-GEN CRYPTO EXECUTION & SETUP TERMINAL</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text max-w-4xl leading-[1.1]">
          Precision Setups.{" "}
          <span className="brand-gradient font-black">Proximity Alarms.</span>{" "}
          <span className="brand italic font-normal text-accent-soft block sm:inline">
            Zero Distractions.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          The ultimate single-user workspace for crypto traders. Chart live MEXC perpetual
          futures, compile custom PineScript-equivalent formulas, get synthesized audio
          proximity radar alerts before price hits your trigger, and automate TradingView webhooks.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {user ? (
            <Link
              href="/watchlist"
              className="accent-btn px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <span>Welcome Back · Open Watchlist Terminal</span>
              <span>→</span>
            </Link>
          ) : (
            <>
              <Link
                href="/watchlist"
                className="accent-btn px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <span>Launch Free Terminal</span>
                <span>→</span>
              </Link>
              <Link
                href="/chart/BTCUSDT"
                className="btn-ghost px-5 py-3 text-sm font-medium flex items-center gap-2 hover:bg-panel-soft"
              >
                <span>📊 Live Chart Studio</span>
              </Link>
            </>
          )}
        </div>

        {/* Proof / Security Trust Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-gain">✓</span>
            <span>Zero API Keys Needed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gain">✓</span>
            <span>100% Free & Self-Hosted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gain">✓</span>
            <span>Synthesized Web Audio Radar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gain">✓</span>
            <span>Real-Time MEXC Futures Feeds</span>
          </div>
        </div>

        {/* Interactive Terminal Mockup Visual */}
        <div className="mt-14 w-full max-w-5xl relative group">
          {/* Subtle Ambient Glow Border */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/30 via-accent/10 to-accent/30 blur-md opacity-60 group-hover:opacity-100 transition duration-500 -z-10" />

          {/* Terminal Window Card */}
          <div className="relative rounded-2xl bg-[#0c0a17] border border-line-strong/60 shadow-2xl overflow-hidden flex flex-col text-left">
            {/* Window Title Bar */}
            <div className="px-4 py-3 bg-[#110e20] border-b border-[#241f38] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#10b981]/80 inline-block" />
                <span className="ml-2 font-mono text-xs text-[#94a3b8]">
                  MOCHEX Terminal v1.2 — BTC/USDT Perpetual (15m)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1e1933] text-accent border border-accent/30">
                  LIVE 15M
                </span>
                <span className="text-xs text-muted">⏱️ 08:42</span>
              </div>
            </div>

            {/* Terminal Inner Header Bar */}
            <div className="px-4 py-2.5 bg-[#0f0c1c] border-b border-[#241f38] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-white">BTC / USDT</span>
                <span className="text-sm font-bold text-[#34d399]">$68,450.00</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gain/15 text-gain font-semibold">
                  +3.42%
                </span>
                <span className="hidden sm:inline text-muted text-[11px]">
                  O: 67,800.00 H: 68,900.00 L: 67,650.00 C: 68,450.00
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#1c1830] text-white text-[11px] font-semibold border border-white/20">
                  EMA 20
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1c1830] text-[#3b82f6] text-[11px] font-semibold border border-blue-500/30">
                  EMA 50
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1c1830] text-[#eab308] text-[11px] font-semibold border border-yellow-500/30">
                  EMA 100
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1c1830] text-[#f97316] text-[11px] font-semibold border border-orange-500/30">
                  EMA 200
                </span>
                <span className="px-2 py-0.5 rounded bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  📜 Script (2)
                </span>
              </div>
            </div>

            {/* Visual Simulated Candlestick Canvas */}
            <div className="relative h-80 sm:h-96 w-full bg-[#0c0a17] overflow-hidden p-4 select-none">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1a35_1px,transparent_1px),linear-gradient(to_bottom,#1f1a35_1px,transparent_1px)] bg-[size:4rem_3rem] opacity-35" />

              {/* Fibonacci Golden Pocket Retracement Line */}
              <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-[#facc15]/70 flex items-center justify-between px-3">
                <span className="text-[10px] font-mono text-[#facc15] bg-[#0c0a17]/90 px-1 py-0.5 rounded border border-[#facc15]/30">
                  🌀 Golden Pocket 0.618 ($67,950.00)
                </span>
              </div>

              {/* Take Profit Target Line */}
              <div className="absolute top-[20%] left-0 right-0 border-b border-[#34d399]/60 flex items-center justify-between px-3">
                <span className="text-[10px] font-mono text-[#34d399] bg-[#0c0a17]/90 px-1 py-0.5 rounded border border-[#34d399]/30">
                  🎯 Take Profit ($72,800.00 · +6.35%)
                </span>
              </div>

              {/* Stop Loss Level Line */}
              <div className="absolute top-[82%] left-0 right-0 border-b border-[#fb7185]/60 flex items-center justify-between px-3">
                <span className="text-[10px] font-mono text-[#fb7185] bg-[#0c0a17]/90 px-1 py-0.5 rounded border border-[#fb7185]/30">
                  🛑 Stop Loss ($66,800.00 · -2.41%)
                </span>
              </div>

              {/* Simulated Candlesticks Vector */}
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                {/* Simulated EMAs (Curved Paths) */}
                <path
                  d="M 0,220 Q 200,210 400,160 T 800,90"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity="0.9"
                />
                <path
                  d="M 0,230 Q 200,225 400,180 T 800,115"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  opacity="0.8"
                />
                <path
                  d="M 0,245 Q 200,240 400,205 T 800,140"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  opacity="0.7"
                />
                <path
                  d="M 0,260 Q 200,255 400,230 T 800,170"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  opacity="0.65"
                />

                {/* Candles Series */}
                {/* 1 */}
                <line x1="60" y1="210" x2="60" y2="250" stroke="#fb7185" strokeWidth="1.5" />
                <rect x="54" y="220" width="12" height="20" fill="#fb7185" rx="1" />
                {/* 2 */}
                <line x1="120" y1="200" x2="120" y2="240" stroke="#34d399" strokeWidth="1.5" />
                <rect x="114" y="205" width="12" height="25" fill="#34d399" rx="1" />
                {/* 3 */}
                <line x1="180" y1="180" x2="180" y2="230" stroke="#34d399" strokeWidth="1.5" />
                <rect x="174" y="190" width="12" height="30" fill="#34d399" rx="1" />
                {/* 4 */}
                <line x1="240" y1="190" x2="240" y2="235" stroke="#fb7185" strokeWidth="1.5" />
                <rect x="234" y="200" width="12" height="22" fill="#fb7185" rx="1" />
                {/* 5 */}
                <line x1="300" y1="160" x2="300" y2="215" stroke="#34d399" strokeWidth="1.5" />
                <rect x="294" y="170" width="12" height="35" fill="#34d399" rx="1" />
                {/* 6 */}
                <line x1="360" y1="145" x2="360" y2="190" stroke="#34d399" strokeWidth="1.5" />
                <rect x="354" y="150" width="12" height="30" fill="#34d399" rx="1" />
                {/* 7 Pullback */}
                <line x1="420" y1="150" x2="420" y2="195" stroke="#fb7185" strokeWidth="1.5" />
                <rect x="414" y="160" width="12" height="25" fill="#fb7185" rx="1" />
                {/* 8 Golden pocket bounce */}
                <line x1="480" y1="140" x2="480" y2="185" stroke="#34d399" strokeWidth="1.5" />
                <rect x="474" y="145" width="12" height="30" fill="#34d399" rx="1" />
                {/* 9 Breakout */}
                <line x1="540" y1="110" x2="540" y2="160" stroke="#34d399" strokeWidth="1.5" />
                <rect x="534" y="115" width="12" height="35" fill="#34d399" rx="1" />
                {/* 10 */}
                <line x1="600" y1="95" x2="600" y2="140" stroke="#34d399" strokeWidth="1.5" />
                <rect x="594" y="100" width="12" height="30" fill="#34d399" rx="1" />
                {/* 11 */}
                <line x1="660" y1="80" x2="660" y2="125" stroke="#34d399" strokeWidth="1.5" />
                <rect x="654" y="85" width="12" height="32" fill="#34d399" rx="1" />
                {/* 12 Active candle */}
                <line x1="720" y1="65" x2="720" y2="110" stroke="#34d399" strokeWidth="2" />
                <rect x="714" y="70" width="12" height="28" fill="#34d399" rx="1" />
              </svg>

              {/* Floating Proximity Radar Notification Badge */}
              <div className="absolute bottom-5 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md bg-[#131024]/95 border border-accent/40 backdrop-blur-md rounded-xl p-3 shadow-2xl flex items-center gap-3 animate-bounce duration-1000">
                <div className="w-9 h-9 rounded-lg bg-accent/20 border border-accent/30 text-accent flex items-center justify-center shrink-0 text-lg">
                  🔔
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">BTC/USDT Approaching</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/20 text-accent font-semibold">
                      0.38% Away
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] truncate">
                    Synthesized proximity alarm fired · Trigger level $68,450.00
                  </p>
                </div>
              </div>

              {/* Floating Risk/Reward Pill */}
              <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-[#17132b]/90 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white shadow-lg backdrop-blur">
                <span className="text-[#34d399] font-bold">⚖️ R:R 2.63</span>
                <span className="text-muted">|</span>
                <span>TP: $72,800</span>
                <span className="text-muted">|</span>
                <span>SL: $66,800</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
