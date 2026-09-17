"use client";

import { useMemo, useState } from "react";
import type { Tag, TradeWithExtras } from "@/lib/types";
import { ModalShell } from "@/components/ui/modal-shell";

interface Props {
  trade: TradeWithExtras | null;
  tags: Tag[];
  onClose: () => void;
  onSave: (values: Record<string, unknown>, id?: string) => Promise<void>;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function TradeFormModal({ trade, tags, onClose, onSave }: Props) {
  const editing = !!trade;

  const [symbol, setSymbol] = useState(trade?.symbol ?? "");
  const [direction, setDirection] = useState<"long" | "short">(
    trade?.direction ?? "long"
  );
  const [size, setSize] = useState(trade ? String(trade.size) : "");
  const [entryPrice, setEntryPrice] = useState(
    trade ? String(trade.entry_price) : ""
  );
  const [exitPrice, setExitPrice] = useState(
    trade?.exit_price != null ? String(trade.exit_price) : ""
  );
  const [stopPrice, setStopPrice] = useState(
    trade?.stop_price != null ? String(trade.stop_price) : ""
  );
  const [fees, setFees] = useState(trade ? String(trade.fees) : "0");
  const [entryTime, setEntryTime] = useState(
    toLocalInput(trade?.entry_time ?? null)
  );
  const [thesis, setThesis] = useState(
    trade?.notes?.pre_trade_thesis ?? ""
  );
  const [review, setReview] = useState(
    trade?.notes?.post_trade_review ?? ""
  );
  const [discipline, setDiscipline] = useState(
    trade?.notes?.discipline_score != null
      ? String(trade.notes.discipline_score)
      : ""
  );

  const [selectedTags, setSelectedTags] = useState<string[]>(
    trade?.tags.map((t) => t.name) ?? []
  );
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const known = new Set(tags.map((t) => t.name));
    return Array.from(new Set([...selectedTags, ...known])).filter((n) =>
      newTag.trim() === ""
        ? selectedTags.includes(n)
        : n.toLowerCase().includes(newTag.trim().toLowerCase())
    );
  }, [tags, selectedTags, newTag]);

  function toggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function commitNewTag() {
    const name = newTag.trim();
    if (!name) return;
    if (!selectedTags.includes(name)) {
      setSelectedTags((prev) => [...prev, name]);
    }
    setNewTag("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const entry = num(entryPrice);
    const exit = num(exitPrice);

    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }
    if (size.trim() === "" || entry == null || Number.isNaN(entry)) {
      setError("Size and entry price are required");
      return;
    }
    if (!entryTime) {
      setError("Entry time is required");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          symbol,
          direction,
          size: num(size),
          entry_price: entry,
          exit_price: exit,
          stop_price: num(stopPrice),
          fees: num(fees) ?? 0,
          entry_time: new Date(entryTime).toISOString(),
          tags: selectedTags,
          pre_trade_thesis: thesis || null,
          post_trade_review: review || null,
          discipline_score: discipline.trim() === "" ? null : Number(discipline),
        },
        trade?.id
      );
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const inputCls =
    "hairline bg-panel px-3 py-2 text-sm outline-none focus:border-accent w-full";

  return (
    <ModalShell title={editing ? "Edit trade" : "New trade"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="hairline border-loss text-loss px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Symbol
            <input
              className={inputCls}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="SPY"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Direction
            <select
              className={inputCls}
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "long" | "short")
              }
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Size
            <input
              className={inputCls}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="100"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Entry time
            <input
              type="datetime-local"
              className={inputCls}
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Entry price
            <input
              className={inputCls}
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="420.50"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Exit price{" "}
            <span className="normal-case text-muted/70 font-normal">
              (blank = still open)
            </span>
            <input
              className={inputCls}
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="425.00"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Stop price (for R)
            <input
              className={inputCls}
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="418.00"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Fees
            <input
              className={inputCls}
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>

        {/* Tags */}
        <fieldset>
          <legend className="text-xs text-muted mb-1">
            Tags{" "}
            <span className="text-muted/70 font-normal">
              (selected: {selectedTags.length})
            </span>
          </legend>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((name) => {
              const active = selectedTags.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleTag(name)}
                  className={`px-2 py-1 text-xs cursor-pointer ${
                    active
                      ? "hairline border-accent text-accent"
                      : "hairline text-muted hover:text-text"
                  }`}
                >
                  {name} {active ? "✓" : ""}
                </button>
              );
            })}
            <div className="flex gap-1 items-center">
              <input
                className="hairline bg-panel px-2 py-1 text-xs outline-none w-32 focus:border-accent"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitNewTag();
                  }
                }}
                placeholder="create tag…"
              />
              <button
                type="button"
                onClick={commitNewTag}
                className="px-2 py-1 text-xs btn-ghost cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Pre-trade thesis
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="Why am I taking this trade?"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Post-trade review
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="How did it go? Lessons?"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted w-40">
            Discipline (1–5)
            <select
              className={inputCls}
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2 hairline-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm btn-ghost cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm accent-btn font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add trade"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}