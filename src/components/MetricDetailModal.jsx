import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const METRIC_CONFIG = {
  enps: { label: "Salud neta", suffix: " puntos", higherIsBetter: true },
  attritionRisk: { label: "Riesgo de rotación", suffix: "%", higherIsBetter: false },
  activePulseRate: { label: "Participación", suffix: "%", higherIsBetter: true },
  psychSafety: { label: "Seguridad psicológica", suffix: " / 5", higherIsBetter: true },
};

export default function MetricDetailModal({
  layoutId, title, value, suffix, explanation, loadingExplanation, trendData, departmentRows, dataKey, onClose,
}) {
  const config = METRIC_CONFIG[dataKey] || { label: title, suffix: "", higherIsBetter: true };
  const departmentData = (departmentRows || [])
    .map((row) => ({
      name: row.name.length > 16 ? `${row.name.slice(0, 16)}...` : row.name,
      fullName: row.name,
      value: Number(row[dataKey] || 0),
    }))
    .sort((a, b) => b.value - a.value);
  const bestIndex = config.higherIsBetter ? 0 : departmentData.length - 1;
  const attentionIndex = config.higherIsBetter ? departmentData.length - 1 : 0;
  const bestDepartment = departmentData[bestIndex];
  const attentionDepartment = departmentData[attentionIndex];
  const formatValue = (item) => `${item.value}${config.suffix}`;

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

        {departmentData.length > 0 && (
          <section className="mb-space-md">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-label-md font-semibold text-on-surface">Comparación por departamento</h3>
                <p className="text-label-sm text-on-surface-variant">
                  {config.higherIsBetter ? "Un valor mayor indica una mejor situación." : "Un valor mayor requiere más atención."}
                </p>
              </div>
              <span className="text-label-sm text-on-surface-variant">{config.label}</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 8, right: 8, left: -16, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7dee8" />
                  <XAxis dataKey="name" angle={-18} textAnchor="end" height={48} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip
                    formatter={(chartValue) => [`${chartValue}${config.suffix}`, config.label]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || "Departamento"}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {departmentData.map((item, index) => (
                      <Cell
                        key={item.fullName}
                        fill={index === bestIndex ? "#0f766e" : index === attentionIndex ? "#ea580c" : "#5b8def"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-label-sm">
              <p className="rounded-md bg-emerald-50 text-emerald-950 p-2">
                Mejor resultado: <strong>{bestDepartment.fullName}</strong> ({formatValue(bestDepartment)})
              </p>
              <p className="rounded-md bg-orange-50 text-orange-950 p-2">
                {config.higherIsBetter ? "Más oportunidad" : "Mayor atención"}: <strong>{attentionDepartment.fullName}</strong> ({formatValue(attentionDepartment)})
              </p>
            </div>
          </section>
        )}

        {trendData && trendData.length > 1 && (
          <section className="h-32 mb-space-md">
            <h3 className="text-label-md font-semibold text-on-surface mb-1">Evolución semanal</h3>
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
          </section>
        )}

        <div className="bg-surface-container-low rounded-lg p-space-md">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-primary-container text-[16px]">auto_awesome</span>
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
              Interpretación
            </span>
          </div>
          <p className="text-body-sm text-on-surface">
            {loadingExplanation ? "Analizando..." : explanation || "Aún no hay un análisis."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}