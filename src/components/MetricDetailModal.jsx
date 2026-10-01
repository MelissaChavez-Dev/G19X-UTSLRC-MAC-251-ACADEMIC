import { useEffect, useId } from "react";
import { motion, useIsPresent } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Cada métrica tiene su propio tono pastel (familias hue-* de index-v2.css)
const METRIC_CONFIG = {
  enps: { label: "Salud neta", suffix: " puntos", higherIsBetter: true, hue: "mint" },
  attritionRisk: { label: "Riesgo de rotación", suffix: "%", higherIsBetter: false, hue: "peach" },
  activePulseRate: { label: "Participación", suffix: "%", higherIsBetter: true, hue: "sky" },
  psychSafety: { label: "Seguridad psicológica", suffix: " / 5", higherIsBetter: true, hue: "rose" },
};

// "Papel": un panel más claro que el bloque, que se adapta a claro y oscuro
const PAPER = "color-mix(in oklab, var(--h-bg) 45%, var(--surface-container-lowest))";

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
        fontSize={10}
        fontFamily="inherit"
      >
        {visibleLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? (visibleLines.length > 1 ? -5 : 4) : 12}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function MetricDetailModal({
  layoutId, title, value, suffix, explanation, loadingExplanation, trendData, departmentRows, dataKey, onClose,
}) {
  const titleId = useId();
  // false en cuanto empieza la animación de cierre: se quitan las gráficas (SVG pesado)
  // pero se conserva la altura de cada sección para que el tamaño no salte
  const isPresent = useIsPresent();
  const config = METRIC_CONFIG[dataKey] || { label: title, suffix: "", higherIsBetter: true, hue: "sky" };

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const departmentData = (departmentRows || [])
    .map((row) => ({
      name: row.name,
      fullName: row.name,
      value: Number(row[dataKey] || 0),
    }))
    .sort((a, b) => b.value - a.value);
  const bestIndex = config.higherIsBetter ? 0 : departmentData.length - 1;
  const attentionIndex = config.higherIsBetter ? departmentData.length - 1 : 0;
  const bestDepartment = departmentData[bestIndex];
  const attentionDepartment = departmentData[attentionIndex];
  const formatValue = (item) => `${item.value}${config.suffix}`;

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 16,
    border: "none",
    boxShadow: "none",
    background: PAPER,
    color: "var(--h-ink)",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Fondo oscuro: solo cambia opacity (se anima en la GPU, sin repintar la página) */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "rgba(37,28,77,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        layoutId={layoutId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Sin borderRadius en línea a propósito: la tarjeta KPI redondea con CSS (clase),
        // y si el modal lo definiera en línea Framer animaría la tarjeta hacia 0 al cerrar.
        style={{ background: "var(--h-bg)", color: "var(--h-ink)" }}
        className={`hue-${config.hue} relative isolate overflow-hidden w-full max-w-lg rounded-[36px]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Figura suave de fondo */}
        <span
          aria-hidden="true"
          className="blob blob-c"
          style={{ "--blob-size": "12rem", top: "-4rem", right: "-4rem", background: "var(--h-soft)" }}
        />

        <motion.div
          className="max-h-[90vh] overflow-y-auto p-space-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.12 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
        >
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-space-sm mb-space-md">
            <div className="min-w-0">
              <h2 id={titleId} className="text-headline-sm opacity-80">
                {title}
              </h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-display-lg leading-none">{value}</span>
                {suffix && <span className="text-body-sm opacity-75">{suffix}</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="motion-press w-10 h-10 shrink-0 flex items-center justify-center hover:opacity-80"
              style={{ borderRadius: "var(--blob-b)", background: "var(--h-soft)", color: "var(--h-ink)" }}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Comparación por departamento */}
          {departmentData.length > 0 && (
            <section className="mb-space-md p-space-md" style={{ background: PAPER, borderRadius: 28 }}>
              <h3 className="text-headline-sm">Comparación por departamento</h3>
              <p className="text-body-sm opacity-75 mb-3">
                {config.higherIsBetter
                  ? "Un valor mayor indica una mejor situación."
                  : "Un valor mayor requiere más atención."}
              </p>

              <div style={{ height: Math.max(165, departmentData.length * 42) }}>
                {isPresent && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={departmentData}
                    margin={{ top: 0, right: 32, left: 4, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={142}
                      axisLine={false}
                      tickLine={false}
                      tick={<DepartmentAxisTick />}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--h-soft)", opacity: 0.45 }}
                      formatter={(chartValue) => [`${chartValue}${config.suffix}`, config.label]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || "Departamento"}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="value" radius={[12, 12, 12, 12]} maxBarSize={22} isAnimationActive={false}>
                      {departmentData.map((item, index) => {
                        const highlight = index === bestIndex || index === attentionIndex;
                        return (
                          <Cell
                            key={item.fullName}
                            fill={
                              index === bestIndex
                                ? "var(--risk-low)"
                                : index === attentionIndex
                                ? "var(--risk-high)"
                                : "var(--h-deep)"
                            }
                            fillOpacity={highlight ? 1 : 0.35}
                          />
                        );
                      })}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "var(--h-ink)" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-label-sm">
                <p className="rounded-2xl bg-risk-low-container text-on-surface p-3">
                  Mejor resultado: <strong>{bestDepartment.fullName}</strong> ({formatValue(bestDepartment)})
                </p>
                <p className="rounded-2xl bg-risk-high-container text-on-surface p-3">
                  {config.higherIsBetter ? "Más oportunidad" : "Mayor atención"}:{" "}
                  <strong>{attentionDepartment.fullName}</strong> ({formatValue(attentionDepartment)})
                </p>
              </div>
            </section>
          )}

          {/* Evolución semanal */}
          {trendData && trendData.length > 1 && (
            <section className="mb-space-md p-space-md" style={{ background: PAPER, borderRadius: 28 }}>
              <h3 className="text-headline-sm mb-2">Evolución semanal</h3>
              <div className="h-24">
                {isPresent && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
                    <XAxis dataKey="weekId" hide />
                    <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                    <Tooltip
                      cursor={false}
                      contentStyle={tooltipStyle}
                      labelFormatter={(w) => `Semana ${w}`}
                    />
                    <Line
                      type="monotone"
                      dataKey={dataKey}
                      stroke="var(--h-deep)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      isAnimationActive={false}
                      dot={false}
                      activeDot={{ r: 5, fill: "var(--h-deep)", stroke: "none" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>
            </section>
          )}

          {/* Interpretación de la IA */}
          <div className="p-space-md" style={{ background: "var(--h-soft)", borderRadius: 28 }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[18px]"
                style={{ color: "var(--h-deep)" }}
              >
                auto_awesome
              </span>
              <h3 className="text-headline-sm">Interpretación</h3>
            </div>

            {loadingExplanation ? (
              <div className="flex flex-col gap-2" role="status" aria-label="Analizando">
                <div className="h-3 w-full rounded-full animate-pulse" style={{ background: "var(--h-bg)" }} />
                <div className="h-3 w-4/5 rounded-full animate-pulse" style={{ background: "var(--h-bg)" }} />
              </div>
            ) : (
              <p className="text-body-md">{explanation || "Aún no hay un análisis."}</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}