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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <div className="w-full max-w-4xl flex flex-col gap-6 my-auto">
        {/* Top Branding Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
            >
              MOCHEX
            </Link>
            <span className="text-zinc-600 font-mono">/</span>
            <span className="text-xs text-zinc-400 font-mono">@{username}</span>
          </div>

          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-colors"
          >
            MOCHEX Home 🚀
          </Link>
        </div>

        {/* Hero Trader Showcase Header */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Circle */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border border-emerald-500/40 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-xl font-black text-emerald-300 font-mono shadow-lg">
                  {initials}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{name}</h1>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                    <span>✓</span> Verified Setup Provider
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">/{username}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyProfile}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/10 self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>{copied ? "Copied Link! ✓" : "Share Profile"}</span>
            </button>
          </div>

          {/* Bio Commentary */}
          {bio && (
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/80 whitespace-pre-wrap">
              {bio}
            </p>
          )}

          {/* Social Badges */}
          {(twitterHandle || telegramChannel) && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
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
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>✈️ Telegram Channel</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-zinc-400">Total Setup Pages</span>
            <span className="text-2xl font-black font-mono text-zinc-100">{shares.length}</span>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-zinc-400">Watchlist Radars</span>
            <span className="text-2xl font-black font-mono text-amber-400">{watchlistCount}</span>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-zinc-400">Trade Setups</span>
            <span className="text-2xl font-black font-mono text-emerald-400">{tradeCount}</span>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col gap-1 backdrop-blur">
            <span className="text-[11px] text-zinc-400">Total Views</span>
            <span className="text-2xl font-black font-mono text-teal-300">{totalViews}</span>
          </div>
        </div>

        {/* Setup Directory Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              All Setups ({shares.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("watchlist")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "watchlist"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              📡 Watchlist Radars ({watchlistCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("trade")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "trade"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
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
            className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs outline-none focus:border-emerald-500/50 w-full sm:w-56 rounded-lg text-zinc-200"
          />
        </div>

        {/* Setups Gallery Grid */}
        {filteredShares.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <span className="text-3xl mb-2">📡</span>
            <h3 className="text-sm font-semibold text-zinc-300">No Public Setup Pages Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
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
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-all flex flex-col justify-between gap-4 shadow-lg backdrop-blur"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border font-mono uppercase ${
                          isWatchlist
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {isWatchlist ? "📡 Watchlist Radar" : "🎯 Trade Setup"}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        👁 {share.view_count} views
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-100 line-clamp-1">
                      {share.title}
                    </h3>

                    {share.notes && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {share.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                    <span className="text-xs font-mono text-zinc-300 font-bold truncate max-w-[180px]">
                      {coinsList}
                    </span>

                    <Link
                      href={sharePath}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                        isWatchlist
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
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
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800 text-[11px] text-zinc-500">
          <span>Powered by <span className="font-bold text-zinc-400">MOCHEX</span></span>
          <span className="font-mono">@{username}</span>
        </div>
      </div>
    </div>
  );
}
