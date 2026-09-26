"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicShareLink, WatchlistItem, TradeAlert } from "@/lib/types";
import { cleanSymbol, fmtPlanPx } from "@/lib/format";
import { CreateShareModal } from "./create-share-modal";
import { EditShareModal } from "./edit-share-modal";
import { SocialCardModal } from "./social-card-modal";
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
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<PublicShareLink | null>(null);
  const [cardExportingShare, setCardExportingShare] = useState<PublicShareLink | null>(null);
  const [softDeletingShare, setSoftDeletingShare] = useState<PublicShareLink | null>(null);
  const [permDeletingShare, setPermDeletingShare] = useState<PublicShareLink | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const getFullShareUrl = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${username || "handle"}/${slug}`;
  };

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleCopy = (share: PublicShareLink) => {
    const url = getFullShareUrl(share.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleTwitterShare = (share: PublicShareLink) => {
    const sym = cleanSymbol(share.symbol);
    const ep = share.entry_price ? fmtPlanPx(share.entry_price) : "";
    const sl = share.stop_loss ? fmtPlanPx(share.stop_loss) : "";
    const tp = share.take_profit ? fmtPlanPx(share.take_profit) : "";
    const url = getFullShareUrl(share.slug);

    const text = `$${sym} Trade Setup on Tape 🚀\nTitle: ${share.title}${ep ? `\nEP: ${ep}` : ""}${sl ? ` · SL: ${sl}` : ""}${tp ? ` · TP: ${tp}` : ""}\nView live setup:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  /** Soft Delete (move to Trash / Archived tab) */
  const handleSoftDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shares/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete share link");
      
      const nowIso = new Date().toISOString();
      setShares((prev) =>
        prev.map((s) => (s.id === id ? { ...s, deleted_at: nowIso } : s))
      );
      setSoftDeletingShare(null);
      showNotification("🗑 Page moved to Archived / Trash. You can restore it anytime.");
    } catch {
      /* ignore */
    }
  };

  /** Restore soft-deleted share link */
  const handleRestore = async (share: PublicShareLink) => {
    setRestoringId(share.id);
    try {
      const res = await fetch(`/api/shares/${share.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to restore share link");
      }
      const data = await res.json();
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...data.share, username } : s))
      );
      showNotification(`↺ Restored "${share.title}" to Active Public Pages!`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRestoringId(null);
    }
  };

  /** Permanent Delete from DB */
  const handlePermanentDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shares/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to permanently delete share link");
      setShares((prev) => prev.filter((s) => s.id !== id));
      setPermDeletingShare(null);
      showNotification("❌ Page permanently deleted.");
    } catch {
      /* ignore */
    }
  };

  const activeShares = shares.filter((s) => !s.deleted_at);
  const archivedShares = shares.filter((s) => Boolean(s.deleted_at));

  const currentList = tab === "active" ? activeShares : archivedShares;

  const filtered = currentList.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q)
    );
  });

  const totalViews = activeShares.reduce((acc, s) => acc + (s.view_count || 0), 0);
  const activeCount = activeShares.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Action */}
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

      {/* Temporary Toast Notification */}
      {notice && (
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs flex items-center justify-between animate-fade-in">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-muted hover:text-text">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Active Share Pages</span>
          <span className="text-2xl font-bold font-mono text-text">{activeShares.length}</span>
        </div>
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Live Published Pages</span>
          <span className="text-2xl font-bold font-mono text-gain">{activeCount}</span>
        </div>
        <div className="hairline p-4 rounded-xl bg-panel/40 flex flex-col gap-1">
          <span className="text-xs text-muted">Total Page Views</span>
          <span className="text-2xl font-bold font-mono text-accent">{totalViews}</span>
        </div>
      </div>

      {/* Tab Controls (Active vs Archived/Trash) */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              tab === "active"
                ? "bg-panel border border-accent/40 text-accent shadow-sm"
                : "text-muted hover:text-text bg-panel/20 border border-transparent"
            }`}
          >
            <span>🌐 Active Share Pages</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent/10 text-accent font-mono font-bold">
              {activeShares.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("archived")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              tab === "archived"
                ? "bg-amber-500/10 border border-amber-500/40 text-amber-300 shadow-sm"
                : "text-muted hover:text-text bg-panel/20 border border-transparent"
            }`}
          >
            <span>🗑 Archived / Trash</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 font-mono font-bold">
              {archivedShares.length}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Filter ${tab === "active" ? "active" : "archived"} pages...`}
          className="hairline bg-panel px-3 py-1.5 text-xs outline-none focus:border-accent w-56 rounded"
        />
      </div>

      {/* Share Links Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
          <span className="text-3xl mb-2">{tab === "active" ? "🌐" : "🗑"}</span>
          <h3 className="text-sm font-semibold text-zinc-300">
            {tab === "active" ? "No Active Public Share Pages" : "No Archived Share Pages"}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            {tab === "active"
              ? "Create public share pages to share setup URLs with followers on Discord, X, or Telegram."
              : "Deleted share pages will appear here. You can restore them anytime or permanently remove them."}
          </p>
          {tab === "active" && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="accent-btn px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
            >
              + Create Your First Share Page
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Title & Slug</th>
                <th className="py-3 px-4">Coin</th>
                <th className="py-3 px-4">Plan / Setups</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((row) => {
                const publicPath = `/${username || "handle"}/${row.slug}`;

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
                      {Array.isArray(row.items) && row.items.length > 1 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded font-bold">
                              {row.items.length} Coins
                            </span>
                          </span>
                          <span className="text-xs text-zinc-300 font-mono">
                            {row.items.map((i) => cleanSymbol(i.symbol)).join(", ")}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{cleanSymbol(row.symbol)}</span>
                          <span className="text-[10px] text-zinc-500 uppercase px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900">
                            {row.share_type}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {Array.isArray(row.items) && row.items.length > 1 ? (
                        <span>Multiple setups ({row.items.length})</span>
                      ) : (
                        <span>
                          EP: {fmtPlanPx(row.entry_price ?? null)} · SL: {fmtPlanPx(row.stop_loss ?? null)} · TP: {fmtPlanPx(row.take_profit ?? null)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-300">
                      👁 {row.view_count}
                    </td>
                    <td className="py-3 px-4">
                      {tab === "active" ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${
                            row.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}
                        >
                          {row.is_active ? "Active" : "Paused"}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded border text-[11px] font-medium bg-amber-500/10 text-amber-400 border-amber-500/20">
                          Archived
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {tab === "active" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(row)}
                            title="Copy Public Link"
                            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 transition-colors font-medium text-[11px] cursor-pointer"
                          >
                            {copiedId === row.id ? "Copied! ✓" : "📋 Copy Link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTwitterShare(row)}
                            title="Share on X"
                            className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors inline-block cursor-pointer"
                          >
                            🐦
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardExportingShare(row)}
                            title="Export Social Card PNG"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors inline-block cursor-pointer"
                          >
                            📸
                          </button>
                          <a
                            href={publicPath}
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
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => setSoftDeletingShare(row)}
                            title="Move to Trash / Archive"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                          >
                            🗑
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestore(row)}
                            disabled={restoringId === row.id}
                            title="Restore Share Page"
                            className="px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>↺</span>
                            <span>{restoringId === row.id ? "Restoring…" : "Restore"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPermDeletingShare(row)}
                            title="Permanently Delete Page"
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>🗑 Delete Permanently</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateShareModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        username={username}
        watchlistItems={watchlistItems}
        tradeAlerts={tradeAlerts}
        onCreated={(newShare) => setShares((prev) => [newShare, ...prev])}
      />

      {/* Edit Modal */}
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

      {/* Social Card PNG Export Modal */}
      {cardExportingShare && (
        <SocialCardModal
          open={Boolean(cardExportingShare)}
          onClose={() => setCardExportingShare(null)}
          username={username}
          title={cardExportingShare.title}
          slug={cardExportingShare.slug}
          shareType={cardExportingShare.share_type}
          item={
            Array.isArray(cardExportingShare.items) && cardExportingShare.items.length > 0
              ? cardExportingShare.items[0]
              : {
                  id: "item-1",
                  symbol: cardExportingShare.symbol,
                  share_type: cardExportingShare.share_type,
                  trigger_price: cardExportingShare.trigger_price,
                  trigger_direction: cardExportingShare.trigger_direction,
                  order_type: cardExportingShare.order_type,
                  entry_price: cardExportingShare.entry_price,
                  stop_loss: cardExportingShare.stop_loss,
                  take_profit: cardExportingShare.take_profit,
                  notes: cardExportingShare.notes,
                }
          }
        />
      )}

      {/* Soft Delete Modal */}
      {softDeletingShare && (
        <ModalShell title="Archive Public Share Page" onClose={() => setSoftDeletingShare(null)}>
          <div className="space-y-4 text-xs">
            <p className="text-zinc-300 leading-relaxed">
              Are you sure you want to move the public page{" "}
              <span className="font-semibold text-amber-400">"{softDeletingShare.title}"</span> to the Trash / Archived tab?
            </p>
            <p className="text-[11px] text-zinc-400">
              The page will be hidden from public visitors. You can restore it anytime from the <span className="text-amber-300 font-semibold">Archived / Trash</span> tab.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSoftDeletingShare(null)}
                className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSoftDelete(softDeletingShare.id)}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold cursor-pointer"
              >
                Move to Archive
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Permanent Delete Modal */}
      {permDeletingShare && (
        <ModalShell title="Permanently Delete Share Page" onClose={() => setPermDeletingShare(null)}>
          <div className="space-y-4 text-xs">
            <p className="text-zinc-300 leading-relaxed">
              ⚠️ Are you sure you want to PERMANENTLY delete{" "}
              <span className="font-semibold text-rose-400">"{permDeletingShare.title}"</span>?
            </p>
            <p className="text-[11px] text-rose-400/90 font-medium bg-rose-500/10 p-2.5 rounded border border-rose-500/20">
              This action cannot be undone. The database record will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setPermDeletingShare(null)}
                className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(permDeletingShare.id)}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
