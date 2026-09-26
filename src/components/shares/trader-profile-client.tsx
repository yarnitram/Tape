"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicShareLink } from "@/lib/types";
import { cleanSymbol } from "@/lib/format";

interface Props {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  telegramChannel: string | null;
  shares: PublicShareLink[];
}

export function TraderProfileClient({
  username,
  displayName,
  bio,
  avatarUrl,
  twitterHandle,
  telegramChannel,
  shares,
}: Props) {
  const [filter, setFilter] = useState<"all" | "watchlist" | "trade">("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const getProfileUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${username}`;
  };

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(getProfileUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const name = displayName || `@${username}`;
  const initials = name.substring(0, 2).toUpperCase();

  const watchlistCount = shares.filter((s) => s.share_type === "watchlist").length;
  const tradeCount = shares.filter((s) => s.share_type === "trade").length;
  const totalViews = shares.reduce((acc, s) => acc + (s.view_count || 0), 0);

  const filteredShares = shares.filter((s) => {
    if (filter === "watchlist" && s.share_type !== "watchlist") return false;
    if (filter === "trade" && s.share_type !== "trade") return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-paper text-text flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-accent selection:text-white">
      <div className="w-full max-w-4xl flex flex-col gap-6 my-auto">
        {/* Top Branding Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight brand-gradient hover:opacity-90 transition-opacity"
            >
              MOCHEX
            </Link>
            <span className="text-muted font-mono">/</span>
            <span className="text-xs text-muted font-mono">@{username}</span>
          </div>

          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-panel hover:bg-panel-soft text-text border border-line text-xs font-semibold transition-colors"
          >
            MOCHEX Home 🚀
          </Link>
        </div>

        {/* Hero Trader Showcase Header */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Circle */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border border-accent/40 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/40 flex items-center justify-center text-xl font-black text-accent font-mono shadow-lg">
                  {initials}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-text">{name}</h1>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono uppercase tracking-wider flex items-center gap-1">
                    <span>✓</span> Verified Setup Provider
                  </span>
                </div>
                <span className="text-xs font-mono text-muted">/{username}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyProfile}
              className="accent-btn px-4 py-2 text-xs font-bold self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>{copied ? "Copied Link! ✓" : "Share Profile"}</span>
            </button>
          </div>

          {/* Bio Commentary */}
          {bio && (
            <p className="text-xs text-text leading-relaxed max-w-2xl bg-panel-soft/50 p-3 rounded-xl border border-line whitespace-pre-wrap">
              {bio}
            </p>
          )}

          {/* Social Badges */}
          {(twitterHandle || telegramChannel) && (
            <div className="flex items-center gap-2 pt-1 border-t border-line">
              {twitterHandle && (
                <a
                  href={`https://x.com/${twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>🐦 @{twitterHandle}</span>
                </a>
              )}
              {telegramChannel && (
                <a
                  href={telegramChannel.startsWith("http") ? telegramChannel : `https://t.me/${telegramChannel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>✈️ Telegram Channel</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl border border-line bg-panel/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-muted">Total Setup Pages</span>
            <span className="text-2xl font-black font-mono text-text">{shares.length}</span>
          </div>
          <div className="p-4 rounded-2xl border border-line bg-panel/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-muted">Watchlist Radars</span>
            <span className="text-2xl font-black font-mono text-amber-400">{watchlistCount}</span>
          </div>
          <div className="p-4 rounded-2xl border border-line bg-panel/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-muted">Trade Setups</span>
            <span className="text-2xl font-black font-mono text-accent">{tradeCount}</span>
          </div>
          <div className="p-4 rounded-2xl border border-line bg-panel/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-muted">Total Views</span>
            <span className="text-2xl font-black font-mono text-text">{totalViews}</span>
          </div>
        </div>

        {/* Setup Directory Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-accent/20 text-accent border border-accent/40 font-bold"
                  : "bg-panel text-muted hover:text-text border border-line"
              }`}
            >
              All Setups ({shares.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("watchlist")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "watchlist"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "bg-panel text-muted hover:text-text border border-line"
              }`}
            >
              📡 Watchlist Radars ({watchlistCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("trade")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "trade"
                  ? "bg-accent/20 text-accent border border-accent/40 font-bold"
                  : "bg-panel text-muted hover:text-text border border-line"
              }`}
            >
              🎯 Trade Setups ({tradeCount})
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search setup pages..."
            className="input-base w-full sm:w-56 text-xs"
          />
        </div>

        {/* Setups Gallery Grid */}
        {filteredShares.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-line rounded-2xl bg-panel/30">
            <span className="text-3xl mb-2">📡</span>
            <h3 className="text-sm font-semibold text-text">No Public Setup Pages Found</h3>
            <p className="text-xs text-muted max-w-sm mt-1">
              No published setup pages match your selected filter or search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredShares.map((share) => {
              const isWatchlist = share.share_type === "watchlist";
              const sharePath = `/${username}/${share.slug}`;
              const coinsList = Array.isArray(share.items) && share.items.length > 0
                ? share.items.map((i) => `$${cleanSymbol(i.symbol)}`).join(", ")
                : `$${cleanSymbol(share.symbol)}`;

              return (
                <div
                  key={share.id}
                  className="p-5 rounded-2xl border border-line bg-panel/70 hover:border-accent/40 transition-all flex flex-col justify-between gap-4 shadow-lg backdrop-blur"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border font-mono uppercase ${
                          isWatchlist
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-accent/15 text-accent border-accent/30"
                        }`}
                      >
                        {isWatchlist ? "📡 Watchlist Radar" : "🎯 Trade Setup"}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        👁 {share.view_count} views
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-text line-clamp-1">
                      {share.title}
                    </h3>

                    {share.notes && (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {share.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-line">
                    <span className="text-xs font-mono text-text font-bold truncate max-w-[180px]">
                      {coinsList}
                    </span>

                    <Link
                      href={sharePath}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                        isWatchlist
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                          : "accent-btn text-xs py-1.5 px-3"
                      }`}
                    >
                      🚀 Open Setup Page
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-line text-[11px] text-muted">
          <span>Powered by <span className="font-bold text-text">MOCHEX</span></span>
          <span className="font-mono">@{username}</span>
        </div>
      </div>
    </div>
  );
}
