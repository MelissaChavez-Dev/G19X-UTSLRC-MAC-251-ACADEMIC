import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function MetricDetailModal({
  layoutId, title, value, suffix, explanation, loadingExplanation, trendData, dataKey, onClose,
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ backgroundColor: "rgba(11,28,48,0)" }}
      animate={{ backgroundColor: "rgba(11,28,48,0.55)" }}
      exit={{ backgroundColor: "rgba(11,28,48,0)" }}
      onClick={onClose}
    >
      <motion.div
        layoutId={layoutId}
        className="bg-surface-container-lowest rounded-xl shadow-2xl p-space-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-space-md">
          <div>
            <span className="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
              {title}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-display-lg text-on-surface leading-none">{value}</span>
              {suffix && <span className="text-body-sm text-on-surface-variant">{suffix}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {trendData && trendData.length > 1 && (
          <div className="h-32 mb-space-md">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="weekId" hide />
                <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(w) => `Semana ${w}`}
                />
                <Line type="monotone" dataKey={dataKey} stroke="#000000" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-surface-container-low rounded-lg p-space-md">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-primary-container text-[16px]">auto_awesome</span>
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
              Análisis con IA
            </span>
          </div>
          <p className="text-body-sm text-on-surface">
            {loadingExplanation ? "Analizando..." : explanation || "Sin análisis generado todavía."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}