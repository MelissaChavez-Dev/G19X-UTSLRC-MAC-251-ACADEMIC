import { useEffect, useId, useRef } from "react";
import { motion, useIsPresent } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const METRIC_CONFIG = {
  enps: { label: "Salud neta", suffix: " puntos", higherIsBetter: true, hue: "mint" },
  attritionRisk: {
    label: "Índice de presión laboral",
    suffix: " / 100",
    higherIsBetter: false,
    hue: "peach",
    description: "Derivado de la respuesta sobre balance vida-trabajo. Escala 0-100 puntos basados en niveles de fatiga y carga emocional. Es una regla orientativa, no probabilística.",
  },
  activePulseRate: { label: "Participación", suffix: "%", higherIsBetter: true, hue: "sky" },
  psychSafety: { label: "Seguridad psicológica", suffix: " / 5.0", higherIsBetter: true, hue: "rose" },
};

const PAPER = "color-mix(in oklab, var(--h-bg) 45%, var(--surface-container-lowest, white))";

function DepartmentAxisTick({ x, y, payload }) {
  const words = String(payload?.value || "").split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > 17 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  const visibleLines = lines.length > 2
    ? [lines.slice(0, -1).join(" "), lines.at(-1)]
    : lines;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="end"
        fill="var(--h-ink)"
        className="text-[10px] font-medium font-sans"
      >
        {visibleLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? (visibleLines.length > 1 ? -6 : 4) : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

const AiSkeletonLoader = () => (
  <div className="flex flex-col gap-2.5 opacity-80" role="status">
    <div className="h-3 w-full rounded-full animate-pulse bg-[var(--h-bg)]" />
    <div className="h-3 w-11/12 rounded-full animate-pulse bg-[var(--h-bg)]/80" />
    <div className="h-3 w-4/5 rounded-full animate-pulse bg-[var(--h-bg)]/60" />
  </div>
);

export default function MetricDetailModal({
  layoutId,
  title,
  value,
  suffix,
  explanation,
  loadingExplanation,
  departmentRows,
  dataKey,
  onClose,
}) {
  const titleId = useId();
  const closeBtnRef = useRef(null);
  const isPresent = useIsPresent();
  const config = METRIC_CONFIG[dataKey] || { label: title, suffix: "", higherIsBetter: true, hue: "sky" };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const departmentData = (departmentRows || [])
    .filter((row) => Number.isFinite(row[dataKey]))
    .map((row) => ({
      name: row.name,
      fullName: row.name,
      value: Number(row[dataKey] || 0),
    }))
    .sort((a, b) => b.value - a.value);

  const bestIndex = config.higherIsBetter ? 0 : departmentData.length - 1;
  const attentionIndex = config.higherIsBetter ? departmentData.length - 1 : 0;
  const bestDepartment = departmentData[bestIndex] || { fullName: "N/A", value: 0 };
  const attentionDepartment = departmentData[attentionIndex] || { fullName: "N/A", value: 0 };
  const formatValue = (val) => `${val}${config.suffix}`;

  const tooltipStyle = {
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 16,
    border: "none",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    background: PAPER,
    color: "var(--h-ink)",
    padding: "8px 12px",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div
        layoutId={layoutId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ 
          background: "var(--h-bg)", 
          color: "var(--h-ink)",
          borderRadius: "48px", 
          overflow: "hidden",
          border: "none"
        }}
        className={`hue-${config.hue} relative flex flex-col w-full max-w-[600px] max-h-[90vh] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Figura decorativa superior derecha plana */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 z-0 h-64 w-64 rounded-full"
          style={{ background: "var(--h-soft)" }}
        />

        {/* Contenedor scrolleable interno con barra de desplazamiento estilizada */}
        <motion.div
          className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20 transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.1 } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
        >
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-bold opacity-80 mb-1">
                {title}
              </h2>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">
                  {value}
                </span>
                {suffix && <span className="text-sm font-bold opacity-60">{suffix}</span>}
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
              style={{ color: "var(--h-ink)" }}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-90">
                close
              </span>
            </button>
          </div>

          {config.description && (
            <p className="mb-6 rounded-[24px] p-5 text-sm font-medium leading-relaxed opacity-90" style={{ background: PAPER }}>
              {config.description}
            </p>
          )}

          {/* Comparación por departamento */}
          {departmentData.length > 0 && (
            <section className="mb-6 rounded-[32px] p-6 sm:p-7" style={{ background: PAPER }}>
              <h3 className="text-base font-bold mb-1">Comparación por departamento</h3>
              <p className="text-xs font-medium opacity-60 mb-6">
                {config.higherIsBetter ? "Un valor mayor indica una mejor situación." : "Un valor menor indica una mejor situación."}
              </p>

              <div style={{ height: Math.max(160, departmentData.length * 48) }} className="w-full">
                {isPresent && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={departmentData}
                      margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        axisLine={false}
                        tickLine={false}
                        tick={<DepartmentAxisTick />}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--h-soft)", opacity: 0.3, rx: 12 }}
                        formatter={(val) => [formatValue(val), config.label]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || "Área"}
                        contentStyle={tooltipStyle}
                      />
                      {/* Animación activada aquí */}
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} maxBarSize={22} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                        {departmentData.map((item, index) => {
                          const isBest = index === bestIndex;
                          const isAttention = index === attentionIndex;
                          return (
                            <Cell
                              key={item.fullName}
                              fill={isBest ? "var(--risk-low)" : isAttention ? "var(--risk-high)" : "var(--h-deep)"}
                              fillOpacity={isBest || isAttention ? 1 : 0.35}
                            />
                          );
                        })}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          style={{ fontSize: 11, fontWeight: 800, fill: "var(--h-ink)" }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Badges de Resumen */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-start gap-2 rounded-xl p-3 text-[11px] font-medium leading-relaxed" style={{ background: "var(--risk-low-container)", color: "var(--risk-low-container-text)" }}>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0" style={{ color: "var(--risk-low-container-icon)" }}>check_circle</span>
                  <div>
                    Mejor resultado: <strong style={{ color: "var(--risk-low)", fontWeight: 800 }}>{bestDepartment.fullName} ({formatValue(bestDepartment.value)})</strong>
                  </div>
                </div>
                <div className="flex-1 flex items-start gap-2 rounded-xl p-3 text-[11px] font-medium leading-relaxed" style={{ background: "var(--risk-high-container)", color: "var(--on-surface)" }}>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0" style={{ color: "var(--risk-high)" }}>warning</span>
                  <div>
                    {config.higherIsBetter ? "Más oportunidad:" : "Atención requerida:"} <strong style={{ color: "var(--risk-high)", fontWeight: 800 }}>{attentionDepartment.fullName} ({formatValue(attentionDepartment.value)})</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Interpretación de la IA */}
          <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-7" style={{ background: "var(--h-soft)" }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]" style={{ color: "var(--h-deep)" }}>
                  auto_awesome
                </span>
                <h3 className="text-base font-bold">Interpretación</h3>
              </div>

              {loadingExplanation ? (
                <AiSkeletonLoader />
              ) : (
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  {explanation || "Aún no hay un análisis."}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}