const LEVEL_COLORS = {
  low: "var(--success)",
  controlled: "var(--primary)",
  elevated: "var(--warning)",
  critical: "var(--error)",
  "no-data": "var(--on-surface-variant)",
};

export function levelColor(level) {
  return LEVEL_COLORS[level?.tone] ?? LEVEL_COLORS["no-data"];
}
