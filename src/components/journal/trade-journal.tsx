"use client";

import { useCallback, useMemo, useState } from "react";
import type { Account, RiskSettings, Tag, TradeWithExtras } from "@/lib/types";
import { TradeTable } from "./trade-table";
import { TradeFormModal } from "./trade-form-modal";
import { TradeDetailModal } from "./trade-detail-modal";
import { ExportBar } from "./export-bar";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

interface Props {
  accounts: Account[];
  activeAccount: Account | null;
  initialTrades: TradeWithExtras[];
  initialTags: Tag[];
  riskSettings: RiskSettings | null;
}

export function TradeJournal({
  activeAccount,
  initialTrades,
  initialTags,
  riskSettings,
}: Props) {
  const [trades, setTrades] = useState<TradeWithExtras[]>(initialTrades);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [selected, setSelected] = useState<TradeWithExtras | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TradeWithExtras | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags ?? []);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trades?account=${activeAccount.id}`);
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeAccount]);

  const mutation = useCallback(
    async (url: string, method: string, body?: unknown): Promise<boolean> => {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }
      return true;
    },
    []
  );

  const handleSave = useCallback(
    async (values: unknown, id?: string) => {
      const body = { account_id: activeAccount!.id, ...(values as object) };
      if (id) {
        await mutation(`/api/trades/${id}`, "PUT", body);
      } else {
        await mutation("/api/trades", "POST", body);
      }
      await Promise.all([refresh(), refreshTags()]);
      setFormOpen(false);
      setEditing(null);
    },
    [activeAccount, mutation, refresh, refreshTags]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await mutation(`/api/trades/${id}`, "DELETE");
      await refresh();
      setSelected(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [mutation, refresh]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[], value: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((t: TradeWithExtras) => {
    setSelected(null);
    setEditing(t);
    setFormOpen(true);
  }, []);

  const uniqueSymbols = useMemo(
    () => Array.from(new Set(trades.map((t) => t.symbol))).sort(),
    [trades]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Journal</h1>
          <p className="text-sm text-muted">
            {trades.length} trade{trades.length === 1 ? "" : "s"} ·{" "}
            {activeAccount?.name ?? "No account"}
            {loading ? " · refreshing…" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="accent-btn px-4 py-2 text-sm font-semibold cursor-pointer"
        >
          + New trade
        </button>
      </div>

      <AnalyticsDashboard
        trades={trades}
        riskSettings={riskSettings}
        accountName={activeAccount?.name ?? "No account"}
      />

      <ExportBar
        trades={trades}
        selectedIds={selectedIds}
        symbolOptions={uniqueSymbols}
      />

      <TradeTable
        trades={trades}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onRowClick={setSelected}
      />

      {formOpen && (
        <TradeFormModal
          trade={editing}
          tags={tags}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {selected && (
        <TradeDetailModal
          trade={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}