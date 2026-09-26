"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicShareLink, WatchlistItem, TradeAlert } from "@/lib/types";
import { cleanSymbol, fmtPlanPx } from "@/lib/format";
import { CreateShareModal } from "./create-share-modal";
import { EditShareModal } from "./edit-share-modal";
import { ModalShell } from "@/components/ui/modal-shell";

interface Props {
  initialShares: PublicShareLink[];
  username: string | null;
  watchlistItems: WatchlistItem[];
  tradeAlerts: TradeAlert[];
}

export function SharesClient({
  initialShares,
  username,
  watchlistItems,
  tradeAlerts,
}: Props) {
  const [shares, setShares] = useState<PublicShareLink[]>(initialShares);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<PublicShareLink | null>(null);
  const [deletingShare, setDeletingShare] = useState<PublicShareLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const buildShareUrl = (slug: string) => {
    return `${baseUrl}/${username || "handle"}/${slug}`;
  };

  const handleCopy = (share: PublicShareLink) => {
    const url = buildShareUrl(share.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleTwitterShare = (share: PublicShareLink) => {
    const sym = cleanSymbol(share.symbol);
    const ep = share.entry_price ? fmtPlanPx(share.entry_price) : "";
    const sl = share.stop_loss ? fmtPlanPx(share.stop_loss) : "";
    const tp = share.take_profit ? fmtPlanPx(share.take_profit) : "";
    const url = buildShareUrl(share.slug);

    const text = `$${sym} Trade Setup on Tape 🚀\nTitle: ${share.title}${ep ? `\nEP: ${ep}` : ""}${sl ? ` · SL: ${sl}` : ""}${tp ? ` · TP: ${tp}` : ""}\nView live setup:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shares/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete share link");
      setShares((prev) => prev.filter((s) => s.id !== id));
      setDeletingShare(null);
    } catch {
      /* ignore */
    }
  };

  const filtered = shares.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q)
    );
  });

  const totalViews = shares.reduce((acc, s) => acc + (s.view_count || 0), 0);
  const activeCount = shares.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Public Sharing Hub</p>
          <h1 className="text-2xl font-semibold tracking-tight">Public Share Pages</h1>
          <p className="text-xs text-muted mt-0.5">
            {username ? (
              <span>
                Your Vanity Brand: <span className="font-mono text-accent font-semibold">/{username}</span>
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                ⚠️ Username handle not set! <Link href="/settings" className="underline hover:text-amber-300">Set handle in Settings</Link> to generate public pages.
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="accent-btn px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>+ Create Public Share Page</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Total Share Pages</span>
          <span className="text-2xl font-bold font-mono text-text">{shares.length}</span>
        </div>
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Active Pages</span>
          <span className="text-2xl font-bold font-mono text-gain">{activeCount}</span>
        </div>
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Total Page Views</span>
          <span className="text-2xl font-bold font-mono text-accent">{totalViews}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by symbol, title, or slug..."
          className="hairline bg-panel px-3 py-2 text-xs outline-none focus:border-accent w-full max-w-sm rounded"
        />
      </div>

      {/* Share Links Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
          <span className="text-3xl mb-2">🌐</span>
          <h3 className="text-sm font-semibold text-zinc-300">No Public Share Pages</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            Create public share pages to share setup URLs with followers on Discord, X, or Telegram.
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="accent-btn px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
          >
            + Create Your First Share Page
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Title & Slug</th>
                <th className="py-3 px-4">Coin</th>
                <th className="py-3 px-4">Plan (EP / SL / TP)</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((row) => {
                const publicUrl = buildShareUrl(row.slug);

                return (
                  <tr key={row.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-zinc-100">{row.title}</span>
                        <span className="font-mono text-[11px] text-accent truncate max-w-xs">
                          /{username || "handle"}/{row.slug}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-100">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{cleanSymbol(row.symbol)}</span>
                        <span className="text-[10px] text-zinc-500 uppercase px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900">
                          {row.share_type}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      <span>EP: {fmtPlanPx(row.entry_price ?? null)}</span> ·{" "}
                      <span>SL: {fmtPlanPx(row.stop_loss ?? null)}</span> ·{" "}
                      <span>TP: {fmtPlanPx(row.take_profit ?? null)}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-300">
                      👁 {row.view_count}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${
                          row.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}
                      >
                        {row.is_active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleCopy(row)}
                        title="Copy Public Link"
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 transition-colors font-medium text-[11px]"
                      >
                        {copiedId === row.id ? "Copied! ✓" : "📋 Copy Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTwitterShare(row)}
                        title="Share on X"
                        className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors inline-block"
                      >
                        🐦
                      </button>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview Public Page"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-accent hover:bg-accent/10 transition-colors inline-block"
                      >
                        👁
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingShare(row)}
                        title="Edit Page"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingShare(row)}
                        title="Delete Page"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateShareModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        username={username}
        watchlistItems={watchlistItems}
        tradeAlerts={tradeAlerts}
        onCreated={(newShare) => setShares((prev) => [newShare, ...prev])}
      />

      {editingShare && (
        <EditShareModal
          share={editingShare}
          open={Boolean(editingShare)}
          onClose={() => setEditingShare(null)}
          username={username}
          onSaved={(updated) =>
            setShares((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      )}

      {deletingShare && (
        <ModalShell title="Delete Public Share Page" onClose={() => setDeletingShare(null)}>
          <div className="space-y-4 text-xs">
            <p className="text-zinc-400">
              Are you sure you want to delete the public page{" "}
              <span className="font-semibold text-zinc-100">"{deletingShare.title}"</span>? Anyone clicking the link will no longer be able to view it.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeletingShare(null)}
                className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingShare.id)}
                className="px-4 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold"
              >
                Delete Page
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
