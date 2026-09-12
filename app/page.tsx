"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Person, ReceiptItem, Receipt, GeminiReceiptResponse } from "@/lib/types";
import { loadPeople, savePeople, loadHistory, saveToHistory, saveDraft, loadDraft, clearDraft } from "@/lib/storage";
import { calcSplit } from "@/lib/splitCalc";
import { exportReceiptPdf } from "@/lib/exportPdf";
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
  const [draftSaved, setDraftSaved] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage once mounted
  useEffect(() => {
    const stored = loadPeople();
    setPeople(stored);
    setHistoryCount(loadHistory().length);

    // Re-open a receipt from history (takes priority over draft)
    const reopen = sessionStorage.getItem("receipt-split:reopen");
    if (reopen) {
      sessionStorage.removeItem("receipt-split:reopen");
      try {
        const r = JSON.parse(reopen) as Receipt;
        setReceipt(r);
        setPeople(r.people);
      } catch {
        // ignore
      }
    } else {
      // Restore in-progress draft
      const draft = loadDraft();
      if (draft) {
        setReceipt(draft);
        setPeople(draft.people);
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

  // Debounce-save draft on every receipt mutation
  useEffect(() => {
    if (!mounted || !receipt) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(receipt);
      setDraftSaved(true);
      if (draftFeedbackRef.current) clearTimeout(draftFeedbackRef.current);
      draftFeedbackRef.current = setTimeout(() => setDraftSaved(false), 2000);
    }, 200);
  }, [receipt, mounted]);

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
        storeName: data.storeName,
        people,
      };
      setReceipt(r);
    },
    [people]
  );

  function updateItems(items: ReceiptItem[]) {
    setReceipt((r) => r && { ...r, items });
  }

  function removePerson(id: string) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setReceipt((r) =>
      r && {
        ...r,
        people: r.people.filter((p) => p.id !== id),
        items: r.items.map((item) => ({
          ...item,
          assignedTo: item.assignedTo.filter((pid) => pid !== id),
        })),
      }
    );
  }

  function updateMeta(patch: Partial<Receipt>) {
    setReceipt((r) => r && { ...r, ...patch });
  }

  function saveCurrentReceipt() {
    if (!receipt) return;
    saveToHistory(receipt);
    setHistoryCount(loadHistory().length);
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 2000);
  }

  function startNew() {
    if (receipt && !confirm("Discard current receipt?")) return;
    clearDraft();
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
          <p className="text-sm text-muted mt-0.5 flex items-center gap-2">
            Upload · assign · split
            {draftSaved && (
              <span className="text-xs text-accent/80">✓ auto-saved</span>
            )}
          </p>
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
        <PeopleRoster people={people} onChange={setPeople} onRemove={removePerson} />
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
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <button
                onClick={saveCurrentReceipt}
                className="flex-1 rounded-xl bg-accent text-black font-semibold py-3 text-sm hover:opacity-90 transition-opacity"
              >
                {snapshotSaved ? "Snapshot saved!" : "Save snapshot"}
              </button>
              <button
                onClick={startNew}
                className="rounded-xl border border-border px-4 py-3 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                New receipt
              </button>
            </div>
            <button
              onClick={() => exportReceiptPdf(receipt, totals)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
