import type { Person, Receipt } from "./types";
import { colorForIndex } from "./colors";

const PEOPLE_KEY = "receipt-split:people";
const HISTORY_KEY = "receipt-split:history";
const DRAFT_KEY = "receipt-split:current-draft";

const DEFAULT_PEOPLE: Person[] = [
  { id: "frank", name: "Frank", color: "#2dd4bf" },
  { id: "james", name: "James", color: "#60a5fa" },
  { id: "kevin", name: "Kevin", color: "#c084fc" },
  { id: "jack", name: "Jack", color: "#fb923c" },
];

export function loadPeople(): Person[] {
  if (typeof window === "undefined") return DEFAULT_PEOPLE;
  try {
    const raw = localStorage.getItem(PEOPLE_KEY);
    if (!raw) return DEFAULT_PEOPLE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PEOPLE;
  }
}

export function savePeople(people: Person[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
}

export function newPerson(existingCount: number, name: string): Person {
  return {
    id: `person-${Date.now()}`,
    name,
    color: colorForIndex(existingCount),
  };
}

export function loadHistory(): Receipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveToHistory(receipt: Receipt): void {
  const history = loadHistory();
  // Remove existing entry with same id if re-saving
  const filtered = history.filter((r) => r.id !== receipt.id);
  const updated = [receipt, ...filtered].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function deleteFromHistory(id: string): void {
  const history = loadHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function saveDraft(receipt: Receipt): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(receipt));
}

export function loadDraft(): Receipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Receipt;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
