"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="hairline-t bg-panel-soft/60 pt-16 pb-12 text-xs text-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link
              href="/"
              className="brand-gradient text-2xl font-extrabold tracking-tight inline-block"
            >
              MOCHEX
            </Link>
            <p className="text-muted leading-relaxed text-xs">
              The modern trading terminal to plan setups on live MEXC futures charts, synthesize
              audio proximity alarms, and eliminate emotional decision-making.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-gain inline-block animate-pulse" />
              <span className="font-mono text-[11px] text-text font-medium">
                MEXC Futures API Operational
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div>
            <h4 className="font-mono uppercase font-bold text-text text-[11px] mb-3 tracking-wider">
              Terminal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/watchlist" className="hover:text-text transition-colors">
                  🪙 Watchlist Terminal
                </Link>
              </li>
              <li>
                <Link href="/chart/BTCUSDT" className="hover:text-text transition-colors">
                  📈 BTC/USDT Live Chart
                </Link>
              </li>
              <li>
                <Link href="/trades" className="hover:text-text transition-colors">
                  ⚡ Active Trades
                </Link>
              </li>
              <li>
                <Link href="/journal" className="hover:text-text transition-colors">
                  📖 Discipline Journal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono uppercase font-bold text-text text-[11px] mb-3 tracking-wider">
              Features
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#alarms" className="hover:text-text transition-colors">
                  🔔 Audio Proximity Radar
                </a>
              </li>
              <li>
                <a href="#terminal" className="hover:text-text transition-colors">
                  📜 PineScript Formula Studio
                </a>
              </li>
              <li>
                <a href="#webhooks" className="hover:text-text transition-colors">
                  🌐 TradingView Webhooks
                </a>
              </li>
              <li>
                <Link href="/risk" className="hover:text-text transition-colors">
                  ⚖️ Risk Protocol Calculator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono uppercase font-bold text-text text-[11px] mb-3 tracking-wider">
              Account & Public
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-text transition-colors">
                  🔑 Sign In
                </Link>
              </li>
              <li>
                <Link href="/shares" className="hover:text-text transition-colors">
                  🌐 Public Share Cards
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-text transition-colors">
                  ⚙️ Settings & Audio Alarms
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-text transition-colors">
                  ❓ FAQ & Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-line/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <div>
            © {new Date().getFullYear()} MOCHEX Terminal. Built for disciplined crypto traders.
          </div>
          <div className="flex items-center gap-4 text-muted">
            <span>Client-Side Encryption</span>
            <span>·</span>
            <span>Zero API Keys</span>
            <span>·</span>
            <span>Self-Hosted Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
