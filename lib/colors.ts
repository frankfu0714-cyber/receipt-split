export const PERSON_COLORS = [
  "#2dd4bf", // teal
  "#60a5fa", // blue
  "#c084fc", // purple
  "#fb923c", // orange
  "#f472b6", // pink
  "#4ade80", // green
  "#facc15", // yellow
  "#f87171", // red
];

export function colorForIndex(i: number): string {
  return PERSON_COLORS[i % PERSON_COLORS.length];
}
