"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import { newPerson } from "@/lib/storage";

interface Props {
  people: Person[];
  onChange: (people: Person[]) => void;
}

export default function PeopleRoster({ people, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addValue, setAddValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  function startEdit(p: Person) {
    setEditingId(p.id);
    setEditValue(p.name);
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim();
    if (trimmed) {
      onChange(people.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    }
    setEditingId(null);
  }

  function remove(id: string) {
    onChange(people.filter((p) => p.id !== id));
  }

  function addPerson() {
    const trimmed = addValue.trim();
    if (!trimmed) return;
    onChange([...people, newPerson(people.length, trimmed)]);
    setAddValue("");
    setShowAdd(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {people.map((p) =>
        editingId === p.id ? (
          <div
            key={p.id}
            className="flex items-center gap-1 rounded-full border px-1 py-0.5"
            style={{ borderColor: p.color }}
          >
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(p.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-20 bg-transparent text-sm font-medium outline-none px-1"
              style={{ color: p.color }}
            />
            <button
              onMouseDown={() => remove(p.id)}
              className="text-muted hover:text-foreground text-xs px-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            key={p.id}
            onClick={() => startEdit(p)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border transition-opacity hover:opacity-80"
            style={{ borderColor: p.color, color: p.color }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: p.color }}
            />
            {p.name}
          </button>
        )
      )}

      {showAdd ? (
        <div className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
          <input
            autoFocus
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onBlur={() => {
              if (!addValue.trim()) setShowAdd(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPerson();
              if (e.key === "Escape") setShowAdd(false);
            }}
            placeholder="Name"
            className="w-20 bg-transparent text-sm outline-none"
          />
          <button
            onMouseDown={addPerson}
            className="text-accent text-xs font-semibold px-1"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add person
        </button>
      )}
    </div>
  );
}
