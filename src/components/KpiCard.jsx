import { motion } from "framer-motion";

export default function KpiCard({
  id, icon, label, value, suffix, delta, deltaDirection,
  footerLabel, footerValue, onExpand,
}) {
  const hasDelta = delta !== undefined && delta !== null;

  return (
    <motion.div
      layoutId={id}
      onClick={onExpand}
      className="motion-card bg-surface-container-lowest p-space-lg flex flex-col justify-between cursor-pointer"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex flex-col min-w-0">
          <span className="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <span className="text-display-lg text-on-surface leading-none">{value}</span>
            {suffix && <span className="text-body-sm text-on-surface-variant">{suffix}</span>}
          </div>
          {hasDelta && (
            <span
              className={`text-label-md mt-1 flex items-center gap-0.5 ${
                deltaDirection === "down" ? "text-error" : "text-success"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {deltaDirection === "down" ? "arrow_downward" : "arrow_upward"}
              </span>
              {delta}
            </span>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      {footerLabel && (
        <div className="mt-space-md flex flex-col">
          <span className="text-label-sm text-on-surface-variant font-semibold">{footerLabel}</span>
          <span className="text-label-sm text-on-surface font-semibold">{footerValue}</span>
        </div>
      )}

      <span className="text-label-sm text-primary mt-space-sm flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
        Ver análisis
      </span>
    </motion.div>
  );
}