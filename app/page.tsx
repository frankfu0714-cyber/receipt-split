"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Person, ReceiptItem, Receipt, GeminiReceiptResponse } from "@/lib/types";
import { loadPeople, savePeople, loadHistory, saveToHistory } from "@/lib/storage";
import { calcSplit } from "@/lib/splitCalc";
import PeopleRoster from "@/components/PeopleRoster";
import ReceiptUpload from "@/components/ReceiptUpload";
import ItemList from "@/components/ItemList";
import TotalsPanel from "@/components/TotalsPanel";

function newId() {
  return `receipt-${Date.now()}`;
}

function blankReceipt(people: Person[]): Receipt {
  return {
    id: newId(),
    date: new Date().toISOString(),
    items: [],
    tax: 0,
    tip: 0,
    total: 0,
    people,
  };
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage once mounted
  useEffect(() => {
    const stored = loadPeople();
    setPeople(stored);
    setHistoryCount(loadHistory().length);

    // Re-open a receipt from history
    const reopen = sessionStorage.getItem("receipt-split:reopen");
    if (reopen) {
      sessionStorage.removeItem("receipt-split:reopen");
      try {
        const r = JSON.parse(reopen) as Receipt;
        // Merge current people roster into the receipt's people for colors
        setReceipt(r);
        setPeople(r.people);
      } catch {
        // ignore
      }
    }

    setMounted(true);
  }, []);

  // Persist people changes
  useEffect(() => {
    if (mounted) savePeople(people);
  }, [people, mounted]);

  // Sync receipt's people list when roster changes
  useEffect(() => {
    if (receipt) {
      setReceipt((r) => r && { ...r, people });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  const handleParsed = useCallback(
    (data: GeminiReceiptResponse, imageDataUrl: string) => {
      const items: ReceiptItem[] = data.items.map((item, i) => ({
        id: `item-${Date.now()}-${i}`,
        name: item.name,
        price: item.price,
        assignedTo: [],
      }));
      const r: Receipt = {
        id: newId(),
        date: new Date().toISOString(),
        imageDataUrl,
        items,
        tax: data.tax ?? 0,
        tip: data.tip ?? 0,
        total: data.total ?? 0,
        people,
      };
      setReceipt(r);
    },
    [people]
  );

  function updateItems(items: ReceiptItem[]) {
    setReceipt((r) => r && { ...r, items });
  }

  function updateMeta(patch: Partial<Receipt>) {
    setReceipt((r) => r && { ...r, ...patch });
  }

  function saveCurrentReceipt() {
    if (!receipt) return;
    saveToHistory(receipt);
    setHistoryCount(loadHistory().length);
    alert("Saved to history!");
  }

  function startNew() {
    setReceipt(null);
  }

  const totals = receipt
    ? calcSplit(receipt.items, receipt.tax, receipt.tip, people)
    : [];

  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-6 max-w-xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipt Split</h1>
          <p className="text-sm text-muted mt-0.5">Upload · assign · split</p>
        </div>
        <Link
          href="/history"
          className="relative flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          🕐 History
          {historyCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-accent text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {historyCount}
            </span>
          )}
        </Link>
      </div>

      {/* People roster */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          People
        </h2>
        <PeopleRoster people={people} onChange={setPeople} />
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Upload */}
      {!receipt && (
        <section className="space-y-2 fade-in">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Receipt
          </h2>
          <ReceiptUpload onParsed={handleParsed} />

          {/* Manual entry fallback */}
          <button
            onClick={() => setReceipt(blankReceipt(people))}
            className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          >
            Enter items manually instead
          </button>
        </section>
      )}

      {/* Receipt editor */}
      {receipt && (
        <div className="space-y-5 fade-in">
          {/* Preview thumbnail */}
          {receipt.imageDataUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.imageDataUrl}
                alt="Receipt"
                className="max-h-32 rounded-xl object-contain border border-border"
              />
            </div>
          )}

          {/* Items */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
              Items
            </h2>
            <ItemList items={receipt.items} people={people} onChange={updateItems} />
          </section>

          {/* Tax / Tip */}
          <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
              Tax &amp; Tip
              <span className="ml-2 font-normal normal-case text-muted/60">
                split proportionally among everyone
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Tax</span>
                <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 focus-within:border-accent">
                  <span className="text-muted text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receipt.tax || ""}
                    onChange={(e) =>
                      updateMeta({ tax: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Tip</span>
                <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 focus-within:border-accent">
                  <span className="text-muted text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receipt.tip || ""}
                    onChange={(e) =>
                      updateMeta({ tip: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
            </div>
          </section>

          {/* Totals */}
          {totals.length > 0 && (
            <TotalsPanel totals={totals} grandTotal={grandTotal} />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveCurrentReceipt}
              className="flex-1 rounded-xl bg-accent text-black font-semibold py-3 text-sm hover:opacity-90 transition-opacity"
            >
              Save to history
            </button>
            <button
              onClick={startNew}
              className="rounded-xl border border-border px-4 py-3 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              New receipt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
