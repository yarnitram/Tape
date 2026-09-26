"use client";

import Link from "next/link";

interface Props {
  user: { email: string } | null;
}

export function LandingCTA({ user }: Props) {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Ambient Radial Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[20rem] bg-accent/20 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-b from-panel to-panel-soft border border-line-strong/80 p-8 sm:p-14 text-center relative shadow-2xl overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-medium mb-4">
            <span>🚀 ELEVATE YOUR TRADING EDGE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text max-w-2xl mx-auto leading-tight">
            Stop Hesitating at Key Levels.{" "}
            <span className="brand-gradient font-black">Trade the Plan.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Join disciplined crypto traders using MOCHEX to plan setups, listen for audio radar
            proximity alarms, and eliminate emotional decision-making.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            {user ? (
              <Link
                href="/watchlist"
                className="accent-btn px-7 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <span>Open Watchlist Terminal</span>
                <span>→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/watchlist"
                  className="accent-btn px-7 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <span>Launch Free Terminal</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/login"
                  className="btn-ghost px-6 py-3.5 text-sm font-medium hover:bg-panel"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>

          <p className="mt-5 text-xs text-muted font-mono">
            No credit card · No exchange API keys · 100% Free & Open
          </p>
        </div>
      </div>
    </section>
  );
}
