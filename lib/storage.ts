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

export interface SaveResult {
  photoOmitted: boolean;
}

function withoutPhoto(receipt: Receipt): Receipt {
  const { imageDataUrl: _photo, ...data } = receipt;
  return data;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
}

// Retry with receipt data only. Never evict snapshots to make room for a photo.
function persistReceipt(key: string, data: Receipt | Receipt[]): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { photoOmitted: false };
  } catch (error) {
    if (!isQuotaError(error)) throw error;
  }
  const compact = Array.isArray(data) ? data.map(withoutPhoto) : withoutPhoto(data);
  try {
    localStorage.setItem(key, JSON.stringify(compact));
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    // Older stored photos may occupy nearly all available space.
    const otherKey = key === HISTORY_KEY ? DRAFT_KEY : HISTORY_KEY;
    const raw = localStorage.getItem(otherKey);
    if (raw) {
      const other = JSON.parse(raw) as Receipt | Receipt[];
      localStorage.setItem(otherKey, JSON.stringify(
        Array.isArray(other) ? other.map(withoutPhoto) : withoutPhoto(other)
      ));
    }
    localStorage.setItem(key, JSON.stringify(compact));
  }
  return { photoOmitted: true };
}

export function saveToHistory(receipt: Receipt): SaveResult {
  const history = loadHistory();
  // Remove existing entry with same id if re-saving
  const filtered = history.filter((r) => r.id !== receipt.id);
  const updated = [receipt, ...filtered].slice(0, 20);
  return persistReceipt(HISTORY_KEY, updated);
}

export function deleteFromHistory(id: string): void {
  const history = loadHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function saveDraft(receipt: Receipt): SaveResult {
  return persistReceipt(DRAFT_KEY, receipt);
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
