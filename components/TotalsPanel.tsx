"use client";

import { useState } from "react";
import type { PersonTotal } from "@/lib/types";

interface Props {
  totals: PersonTotal[];
  grandTotal: number;
}

export default function TotalsPanel({ totals, grandTotal }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyForSpliwise(personId: string, name: string, amount: number) {
    navigator.clipboard.writeText(`${name}: $${amount.toFixed(2)}`);
    setCopied(personId);
    setTimeout(() => setCopied(null), 2000);
  }

  if (totals.every((t) => t.total === 0)) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          Who owes what
        </h2>
        <span className="text-sm text-muted">
          Total: <span className="text-foreground font-semibold">${grandTotal.toFixed(2)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {totals
          .filter((t) => t.total > 0)
          .map((t) => (
            <div
              key={t.person.id}
              className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3"
              style={{ borderLeftWidth: 3, borderLeftColor: t.person.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: t.person.color }}
                  />
                  <span className="font-semibold">{t.person.name}</span>
                </div>
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: t.person.color }}
                >
                  ${t.total.toFixed(2)}
                </span>
              </div>

              {/* Breakdown */}
              <div className="text-xs text-muted space-y-0.5">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>${t.subtotal.toFixed(2)}</span>
                </div>
                {t.sharedShare > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <span className="text-[10px] bg-muted/20 rounded px-1 py-0.5">
                        shared
                      </span>
                      Tax / tip / unassigned
                    </span>
                    <span>+${t.sharedShare.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() =>
                  copyForSpliwise(t.person.id, t.person.name, t.total)
                }
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium border border-border hover:border-accent hover:text-accent transition-colors"
              >
                {copied === t.person.id ? (
                  <span className="text-accent">✓ Copied!</span>
                ) : (
                  <>
                    <span>📋</span>
                    Copy for Splitwise
                  </>
                )}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
