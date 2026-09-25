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
      className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-display-lg text-on-surface leading-none">{value}</span>
            {suffix && <span className="text-body-sm text-on-surface-variant">{suffix}</span>}
            {hasDelta && (
              <span className="text-label-md text-on-secondary-container bg-secondary-container/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">
                  {deltaDirection === "down" ? "arrow_downward" : "arrow_upward"}
                </span>
                {delta}
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container flex-shrink-0">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>

      {footerLabel && (
        <div className="mt-space-md flex flex-col">
          <span className="text-body-sm text-on-surface-variant">{footerLabel}</span>
          <span className="text-label-sm text-on-surface font-semibold">{footerValue}</span>
        </div>
      )}

      <span className="text-label-sm text-primary-container mt-space-sm flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
        Ver análisis
      </span>
    </motion.div>
  );
}