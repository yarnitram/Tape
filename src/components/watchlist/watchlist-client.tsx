"use client";

import { useState } from "react";
import type { WatchlistItem } from "@/lib/types";

interface Props {
  initialItems: WatchlistItem[];
}

export function WatchlistClient({ initialItems }: Props) {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) return;
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          notes: notes || null,
          alert_price: alertPrice || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add");
      }
      const { item } = await res.json();
      setItems((prev) => [...prev, item]);
      setSymbol("");
      setNotes("");
      setAlertPrice("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const inputCls =
    "hairline bg-panel px-2 py-1.5 text-xs outline-none focus:border-accent";

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Watchlist</h1>
        <p className="text-sm text-muted">
          Instruments you&apos;re keeping an eye on ({items.length}).
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Symbol</span>
          <input
            className={`${inputCls} w-32`}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="SPY"
            required
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-40">
          <span className="text-xs text-muted">Notes</span>
          <input
            className={inputCls}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Alert price</span>
          <input
            type="number"
            step="0.01"
            className={`${inputCls} w-32`}
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            placeholder="optional"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !symbol.trim()}
          className="px-4 py-1.5 text-xs accent-btn font-semibold cursor-pointer disabled:opacity-60"
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </form>

      {error && <div className="text-sm text-loss">{error}</div>}

      {items.length === 0 ? (
        <div className="hairline text-muted p-8 text-center text-sm">
          Your watchlist is empty — add a symbol above.
        </div>
      ) : (
        <div className="hairline overflow-x-auto bg-panel/40">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide hairline-b">
                <th className="px-3 py-2.5">Symbol</th>
                <th className="px-3 py-2.5">Notes</th>
                <th className="px-3 py-2.5 text-right">Alert price</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="hairline-b hover:bg-panel">
                  <td className="px-3 py-2.5 font-medium">{i.symbol}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {i.notes || "—"}
                  </td>
                  <td className="px-3 py-2.5 num">
                    {i.alert_price != null
                      ? i.alert_price.toLocaleString("en-US", {
                          maximumFractionDigits: 4,
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(i.id)}
                      className="text-loss hover:underline text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}