"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Receipt } from "@/lib/types";
import { loadHistory, deleteFromHistory } from "@/lib/storage";
import { calcSplit } from "@/lib/splitCalc";
import { exportReceiptPdf } from "@/lib/exportPdf";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<Receipt[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setMounted(true);
  }, []);

  function remove(id: string) {
    deleteFromHistory(id);
    setHistory((h) => h.filter((r) => r.id !== id));
  }

  function openReceipt(r: Receipt) {
    // Store the receipt to re-open on the main page via sessionStorage
    sessionStorage.setItem("receipt-split:reopen", JSON.stringify(r));
    router.push("/");
  }

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-5 px-4 py-6 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-muted hover:text-foreground transition-colors text-sm"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
          <span className="text-5xl">🧾</span>
          <p className="text-sm">No receipts saved yet.</p>
          <Link
            href="/"
            className="text-accent text-sm hover:underline"
          >
            Split your first receipt →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((r) => {
            const totals = calcSplit(r.items, r.tax, r.tip, r.people);
            const grandTotal = totals.reduce((s, t) => s + t.total, 0);

            return (
              <div
                key={r.id}
                className="rounded-2xl bg-card border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">{formatDate(r.date)}</p>
                    <p className="font-semibold text-lg mt-0.5">
                      ${grandTotal.toFixed(2)}{" "}
                      <span className="text-sm text-muted font-normal">
                        total
                      </span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {r.items.length} items · {r.people.length} people
                    </p>
                  </div>
                  {r.imageDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageDataUrl}
                      alt="Receipt"
                      className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0"
                    />
                  )}
                </div>

                {/* Per-person breakdown */}
                <div className="flex flex-wrap gap-2">
                  {totals
                    .filter((t) => t.total > 0)
                    .map((t) => (
                      <div
                        key={t.person.id}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border"
                        style={{
                          borderColor: t.person.color + "60",
                          color: t.person.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: t.person.color }}
                        />
                        {t.person.name}
                        <span className="font-semibold">
                          ${t.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openReceipt(r)}
                    className="flex-1 rounded-xl bg-card border border-border py-2 text-sm text-muted hover:text-foreground hover:border-accent transition-colors"
                  >
                    Reopen &amp; edit
                  </button>
                  <button
                    onClick={() => exportReceiptPdf(r, totals)}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
                    title="Export PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
