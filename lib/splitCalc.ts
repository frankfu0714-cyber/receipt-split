import type { Person, ReceiptItem, PersonTotal } from "./types";

export function calcSplit(
  items: ReceiptItem[],
  tax: number,
  tip: number,
  people: Person[]
): PersonTotal[] {
  if (people.length === 0) return [];

  // Per-person subtotal from assigned items
  const subtotals: Record<string, number> = {};
  for (const p of people) subtotals[p.id] = 0;

  const unassignedItemsTotal = items
    .filter((item) => item.assignedTo.length === 0)
    .reduce((sum, item) => sum + item.price, 0);

  for (const item of items) {
    if (item.assignedTo.length === 0) continue;
    const share = item.price / item.assignedTo.length;
    for (const pid of item.assignedTo) {
      if (pid in subtotals) subtotals[pid] += share;
    }
  }

  // Shared pool: tax + tip + unassigned items
  const sharedPool = tax + tip + unassignedItemsTotal;

  // People who owe something (have assigned items)
  const activePeople = people.filter((p) => subtotals[p.id] > 0);
  const splitBase = activePeople.length > 0 ? activePeople : people;

  const baseTotal = splitBase.reduce((sum, p) => sum + subtotals[p.id], 0);
  const sharedShares: Record<string, number> = {};
  for (const p of people) sharedShares[p.id] = 0;

  if (sharedPool > 0) {
    if (baseTotal === 0) {
      // No one has items — split equally
      const equalShare = sharedPool / splitBase.length;
      for (const p of splitBase) sharedShares[p.id] = equalShare;
    } else {
      for (const p of splitBase) {
        sharedShares[p.id] = (subtotals[p.id] / baseTotal) * sharedPool;
      }
    }
  }

  return people.map((p) => {
    const subtotal = subtotals[p.id];
    const sharedShare = sharedShares[p.id];
    const total = Math.round((subtotal + sharedShare) * 100) / 100;
    return { person: p, subtotal, sharedShare, total };
  });
}
