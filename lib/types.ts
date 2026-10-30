export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[]; // person IDs
  shares?: Record<string, number>; // optional relative weights; defaults to 1 each
}

export interface Receipt {
  id: string;
  date: string;
  imageDataUrl?: string;
  items: ReceiptItem[];
  tax: number;
  tip: number;
  people: Person[];
  total: number;
  storeName?: string;
}

export interface GeminiReceiptResponse {
  items: { name: string; price: number }[];
  tax: number;
  tip: number;
  total: number;
  storeName?: string;
  notes?: string;
}

export interface PersonTotal {
  person: Person;
  subtotal: number;   // items directly assigned
  sharedShare: number; // proportional share of tax+tip+unassigned
  total: number;
}
