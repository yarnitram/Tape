"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Props {
  user: { email: string } | null;
}

export function LandingNav({ user }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-paper/85 backdrop-blur-md hairline-b transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & System Status Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="brand-gradient text-2xl font-extrabold tracking-tight shrink-0 flex items-center gap-2"
          >
            <span>MOCHEX</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gain/10 border border-gain/20 text-gain text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
            <span>Operational</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted">
          <a
            href="#features"
            className="hover:text-text transition-colors"
          >
            Features
          </a>
          <a
            href="#terminal"
            className="hover:text-text transition-colors"
          >
            Chart Terminal
          </a>
          <a
            href="#alarms"
            className="hover:text-text transition-colors"
          >
            Audio Radar
          </a>
          <a
            href="#webhooks"
            className="hover:text-text transition-colors"
          >
            Webhooks
          </a>
          <a
            href="#workflow"
            className="hover:text-text transition-colors"
          >
            Workflow
          </a>
          <a
            href="#faq"
            className="hover:text-text transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/watchlist"
                className="accent-btn px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Open Terminal</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/watchlist"
                className="accent-btn px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Launch App</span>
                <span>→</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-panel-soft transition-colors"
            aria-label="Toggle navigation menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden hairline-t bg-panel/95 backdrop-blur-lg px-4 py-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col gap-2.5 text-sm font-medium text-muted">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              ⚡ Features
            </a>
            <a
              href="#terminal"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              📈 Chart Terminal & Formula Studio
            </a>
            <a
              href="#alarms"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              🔔 Audio Proximity Radar
            </a>
            <a
              href="#webhooks"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              🌐 TradingView Webhooks
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              🧭 Trader Workflow
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-panel-soft hover:text-text transition-colors"
            >
              ❓ FAQ
            </a>
          </div>

          <div className="pt-2 hairline-t flex flex-col gap-2">
            {user ? (
              <Link
                href="/watchlist"
                onClick={() => setMobileMenuOpen(false)}
                className="accent-btn w-full py-2.5 text-center text-xs font-bold"
              >
                Open Watchlist Terminal →
              </Link>
            ) : (
              <>
                <Link
                  href="/watchlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="accent-btn w-full py-2.5 text-center text-xs font-bold"
                >
                  Launch Terminal Free →
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-ghost w-full py-2 text-center text-xs font-medium"
                >
                  Sign In to Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
