"use client";

import type { Person, ReceiptItem } from "@/lib/types";

interface Props {
  items: ReceiptItem[];
  people: Person[];
  onChange: (items: ReceiptItem[]) => void;
}

export default function ItemList({ items, people, onChange }: Props) {
  function updateItem(id: string, patch: Partial<ReceiptItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function togglePerson(itemId: string, personId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const already = item.assignedTo.includes(personId);
    updateItem(itemId, {
      assignedTo: already
        ? item.assignedTo.filter((id) => id !== personId)
        : [...item.assignedTo, personId],
    });
  }

  function deleteItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function addRow() {
    onChange([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: "",
        price: 0,
        assignedTo: [],
      },
    ]);
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 rounded-xl bg-card border border-border p-3"
        >
          <div className="flex items-center gap-2">
            {/* Name */}
            <input
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder="Item name"
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted"
            />
            {/* Price */}
            <div className="flex items-center gap-0.5 text-sm flex-shrink-0">
              <span className="text-muted">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.price || ""}
                onChange={(e) =>
                  updateItem(item.id, {
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="w-16 bg-transparent text-right outline-none placeholder:text-muted"
              />
            </div>
            {/* Delete */}
            <button
              onClick={() => deleteItem(item.id)}
              className="text-muted hover:text-red-400 transition-colors text-sm px-1"
            >
              ✕
            </button>
          </div>

          {/* Person chips */}
          <div className="flex flex-wrap gap-1.5">
            {people.map((p) => {
              const selected = item.assignedTo.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePerson(item.id, p.id)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all"
                  style={
                    selected
                      ? {
                          background: p.color,
                          borderColor: p.color,
                          color: "#000",
                        }
                      : {
                          borderColor: p.color + "55",
                          color: p.color,
                          background: "transparent",
                        }
                  }
                >
                  {p.name}
                </button>
              );
            })}
            {item.assignedTo.length === 0 && (
              <span className="text-xs text-muted italic">shared</span>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
      >
        + Add item
      </button>
    </div>
  );
}
