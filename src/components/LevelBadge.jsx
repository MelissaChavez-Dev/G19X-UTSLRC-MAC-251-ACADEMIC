// Chip con el nivel de un KPI (usa las etiquetas y tonos de src/data/kpiThresholds.js).
import { levelColor } from "../utils/qualityLevel";

export default function LevelBadge({ level }) {
  if (!level) return null;
  const color = levelColor(level);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold text-on-surface"
      style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: color }} />
      {level.label}
    </span>
  );
}
