import { motion } from "framer-motion";

export default function KpiWidget({
  title,
  value,
  compact = false,
  unit = "",
  comparisonValue = null,
  comparisonLabel = "vs año anterior",
  invertDelta = false, // true for attrition/absences where decrease is positive
  icon,
  badgeText,
}) {
  const numValue = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
  const formattedValue = Number.isFinite(numValue)
    ? unit === "%"
      ? `${numValue.toLocaleString("es-MX", { maximumFractionDigits: 1 })}%`
      : `${numValue.toLocaleString("es-MX", { maximumFractionDigits: 1 })} ${unit}`.trim()
    : "—";

  let deltaPct = null;
  let isPositive = null;

  if (Number.isFinite(numValue) && Number.isFinite(Number(comparisonValue)) && Number(comparisonValue) > 0) {
    deltaPct = Math.round(((numValue - Number(comparisonValue)) / Number(comparisonValue)) * 1000) / 10;
    isPositive = invertDelta ? deltaPct <= 0 : deltaPct >= 0;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex h-full flex-col justify-between rounded-xl border border-outline-variant/50 bg-surface-container-lowest ${
        compact ? "p-2 shadow-none" : "p-space-md shadow-xs"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className={`font-medium text-on-surface-variant truncate ${compact ? "text-xs leading-tight" : "text-label-md"}`}>{title}</span>
        {icon && (
          <span className={`material-symbols-outlined text-primary shrink-0 ${compact ? "text-[20px]" : "text-[20px]"}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </header>

      <div className={`flex items-baseline gap-2 ${compact ? "my-0.5" : "my-space-xs"}`}>
        <span className={`font-semibold tracking-tight ${compact ? "text-[34px] leading-none text-[#c5a000]" : "text-headline-lg text-primary"}`}>
          {formattedValue}
        </span>
        {badgeText && (
          <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-label-sm text-on-surface-variant">
            {badgeText}
          </span>
        )}
      </div>

      {(!compact || deltaPct !== null) && <footer className={`flex items-center gap-1 ${compact ? "text-[12px]" : "text-label-sm"}`}>
        {deltaPct !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${
              compact ? "px-1 py-0" : "px-2 py-0.5"
            } ${
              isPositive
                ? "bg-primary-container text-on-primary-container"
                : "bg-error-container text-on-error-container"
            }`}
          >
            <span className={`material-symbols-outlined ${compact ? "text-[14px]" : "text-[14px]"}`} aria-hidden="true">
              {deltaPct >= 0 ? "trending_up" : "trending_down"}
            </span>
            {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
          </span>
        ) : (
          <span className="text-on-surface-variant/70">Periodo actual</span>
        )}
        <span className="text-on-surface-variant truncate">{comparisonLabel}</span>
      </footer>}
    </motion.div>
  );
}
