import { useEffect, useId, useRef } from "react";
import { motion, useIsPresent } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const METRIC_CONFIG = {
  enps: {
    label: "eNPS",
    suffix: " puntos",
    higherIsBetter: true,
    hue: "mint",
    icon: "groups",
    eyebrow: "EXPERIENCIA DEL EQUIPO",
    description:
      "El eNPS mide la disposición del equipo a recomendar trabajar aquí. Se calcula restando el porcentaje de detractores al de promotores; no es una calificación sobre 100.",
  },
  attritionRisk: {
    label: "Índice de presión laboral",
    suffix: " / 100",
    higherIsBetter: false,
    hue: "peach",
    icon: "speed",
    eyebrow: "CARGA Y FATIGA",
    description:
      "Es un indicador orientativo de 0 a 100 basado en respuestas sobre fatiga de turno y carga emocional. No representa una probabilidad ni predice renuncias.",
  },
  activePulseRate: {
    label: "Participación",
    suffix: "%",
    higherIsBetter: true,
    hue: "sky",
    icon: "how_to_reg",
    eyebrow: "COBERTURA DE RESPUESTAS",
    description:
      "Muestra qué porcentaje de las personas invitadas respondió la medición. Una participación alta ayuda a interpretar los resultados con mayor contexto.",
  },
  psychSafety: {
    label: "Seguridad psicológica",
    suffix: " / 5",
    higherIsBetter: true,
    hue: "rose",
    icon: "forum",
    eyebrow: "CONFIANZA PARA HABLAR",
    description:
      "Refleja qué tan seguro se siente el equipo al expresar dudas, admitir errores y compartir opiniones sin temor a represalias.",
  },
  workLifeBalance: {
    label: "Balance vida-trabajo",
    suffix: " / 10",
    higherIsBetter: true,
    hue: "sky",
    icon: "balance",
    eyebrow: "BIENESTAR COTIDIANO",
    description:
      "Resume la percepción del equilibrio entre las responsabilidades laborales y el tiempo personal. Interprétalo junto con los comentarios y el contexto de cada área.",
  },
};

// Muestra como máximo un decimal; deja intactos textos como "72%" o "—".
function formatHeadlineValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
  }
  return value ?? "—";
}

const PAPER =
  "color-mix(in oklab, var(--h-bg) 45%, var(--surface-container-lowest, white))";

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

  const visibleLines =
    lines.length > 2 ? [lines[0], `${lines[1].slice(0, 18)}…`] : lines;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="end"
        fill="var(--h-ink)"
        className="text-[12px] font-medium font-sans"
      >
        {visibleLines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={x}
            dy={index === 0 ? (visibleLines.length > 1 ? -6 : 4) : 12}
          >
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

function MetricVisual({ dataKey, value }) {
  const number = Number(value);
  const safeValue = Number.isFinite(number) ? number : 0;

  if (dataKey === "enps") {
    const clamped = Math.max(-100, Math.min(100, safeValue));
    const position = ((clamped + 100) / 200) * 100;
    const interpretation =
      clamped >= 30
        ? "Favorable"
        : clamped >= 0
          ? "Positivo, con margen de mejora"
          : "Requiere atención";

    return (
      <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-sm font-bold">¿Cómo se interpreta?</span>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: "var(--h-soft)",
              color: "var(--h-deep)",
            }}
          >
            {interpretation}
          </span>
        </div>
        <div className="relative pt-5 pb-1">
          <div className="relative h-3 rounded-full overflow-hidden flex">
            <div className="w-1/2" style={{ background: "var(--risk-high)" }} />
            <div className="w-1/4" style={{ background: "var(--h-soft)" }} />
            <div className="w-1/4" style={{ background: "var(--risk-low)" }} />
          </div>
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${position}%` }}
          >
            <span
              className="rounded-md px-2 py-1 text-xs font-black shadow-sm"
              style={{ background: "var(--h-deep)", color: "white" }}
            >
              {clamped > 0 ? "+" : ""}{clamped}
            </span>
            <span
              className="h-4 w-0.5"
              style={{ background: "var(--h-deep)" }}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-between text-xs font-semibold text-on-surface-variant">
          <span>-100 · Crítico</span>
          <span>0 · Neutro</span>
          <span>+100 · Excelente</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
          El resultado va de -100 a +100. Un valor más alto indica una mayor
          proporción neta de promotores, pero conviene revisar también la
          participación y las diferencias entre áreas.
        </p>
      </div>
    );
  }

  if (dataKey === "attritionRisk") {
    const level =
      safeValue >= 70 ? "Presión alta" : safeValue >= 40 ? "Presión moderada" : "Presión baja";
    const width = Math.max(0, Math.min(100, safeValue));

    return (
      <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm font-bold">Nivel de presión</span>
          <span className="text-xs font-bold text-on-surface-variant">{level}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--h-bg)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${width}%`,
              background:
                safeValue >= 70 ? "var(--risk-high)" : safeValue >= 40 ? "var(--h-deep)" : "var(--risk-low)",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-on-surface-variant">
          <span>0 · Baja</span>
          <span>40 · Moderada</span>
          <span>100 · Alta</span>
        </div>
      </div>
    );
  }

  if (dataKey === "activePulseRate") {
    const percent = Math.max(0, Math.min(100, safeValue));
    return (
      <div className="mt-5 flex items-center gap-4 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "var(--h-soft)", color: "var(--h-deep)" }}
        >
          <span className="material-symbols-outlined text-3xl">how_to_reg</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="text-sm font-bold">Cobertura de la medición</span>
            <span className="text-sm font-black">{Math.round(percent)}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--h-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "var(--h-deep)" }} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
            {percent >= 80
              ? "Buena cobertura de respuestas."
              : percent >= 50
                ? "Cobertura parcial; considera quiénes faltan por responder."
                : "Cobertura limitada; interpreta los resultados con cautela."}
          </p>
        </div>
      </div>
    );
  }

  if (dataKey === "psychSafety") {
    const score = Math.max(0, Math.min(5, safeValue));
    return (
      <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm font-bold">Escala de seguridad percibida</span>
          <span className="text-sm font-bold text-on-surface-variant">{score.toFixed(1)} de 5</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((point) => (
            <div
              key={point}
              className="flex h-10 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background: score >= point ? "var(--h-deep)" : "var(--h-bg)",
                color: score >= point ? "white" : "var(--h-ink)",
                opacity: score >= point ? 1 : 0.65,
              }}
            >
              {point}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
          Cuanto más alto el resultado, mayor seguridad percibida para expresarse y pedir ayuda.
        </p>
      </div>
    );
  }

  if (dataKey === "workLifeBalance") {
    const score = Math.max(0, Math.min(10, safeValue));
    return (
      <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm font-bold">Equilibrio percibido</span>
          <span className="text-sm font-bold text-on-surface-variant">{score.toFixed(1)} de 10</span>
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 10 }, (_, index) => {
            const point = index + 1;
            return (
              <div
                key={point}
                className="h-3 rounded-sm"
                title={`${point} de 10`}
                style={{
                  background: score >= point ? "var(--h-deep)" : "var(--h-bg)",
                  opacity: score >= point ? 1 : 0.8,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-on-surface-variant">
          <span>Desequilibrio</span>
          <span>Buen equilibrio</span>
        </div>
      </div>
    );
  }

  return null;
}

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
  const config = METRIC_CONFIG[dataKey] || {
    label: title,
    suffix: "",
    higherIsBetter: true,
    hue: "sky",
    eyebrow: "INDICADOR",
    icon: "insights",
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const departmentData = (departmentRows || [])
    .filter((row) => Number.isFinite(Number(row[dataKey])) && row[dataKey] !== null)
    .map((row) => ({
      name: row.name,
      fullName: row.name,
      value: Number(row[dataKey] || 0),
    }))
    .sort((a, b) => dataKey === "enps" ? b.value - a.value : b.value - a.value);

  const bestIndex = config.higherIsBetter ? 0 : departmentData.length - 1;
  const attentionIndex = config.higherIsBetter ? departmentData.length - 1 : 0;
  const bestDepartment = departmentData[bestIndex];
  const attentionDepartment = departmentData[attentionIndex];
  const formatValue = (val) => `${Number.isInteger(val) ? val : Number(val.toFixed(1))}${config.suffix || ""}`;

  const tooltipStyle = {
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 12,
    border: "1px solid var(--h-bg)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
    background: PAPER,
    color: "var(--h-ink)",
    padding: "8px 12px",
  };

  const isEnps = dataKey === "enps";
  const isPressure = dataKey === "attritionRisk";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      />

      <motion.div
        layoutId={layoutId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: "var(--h-bg)",
          color: "var(--h-ink)",
          borderRadius: "28px",
          overflow: "hidden",
          border: "1px solid color-mix(in oklab, var(--h-ink) 8%, transparent)",
        }}
        className={`hue-${config.hue} relative flex flex-col w-full max-w-[720px] max-h-[92vh] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 z-0 h-64 w-64 rounded-full"
          style={{ background: "var(--h-soft)", opacity: 0.8 }}
        />

        <motion.div
          className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-7 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, delay: 0.06 } }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
        >
          <header className="relative mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: "var(--h-soft)", color: "var(--h-deep)" }}
                  >
                    <span className="material-symbols-outlined">
                      {config.icon || "insights"}
                    </span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold tracking-[0.14em] text-on-surface-variant">
                    {config.eyebrow || "INDICADOR"}
                  </span>
                </div>
                <h2 id={titleId} className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                  {title || config.label}
                </h2>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-5xl sm:text-6xl font-black tracking-[-0.06em] leading-none tabular-nums">
                    {formatHeadlineValue(value)}
                  </span>
                  {suffix && (
                    <span className="text-sm font-bold text-on-surface-variant whitespace-nowrap">
                      {suffix}
                    </span>
                  )}
                </div>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Cerrar detalle"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2"
                style={{ color: "var(--h-ink)" }}
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <MetricVisual dataKey={dataKey} value={value} />

            {config.description && (
              <p
                className="mt-4 rounded-xl border-l-4 px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: PAPER,
                  borderLeftColor: "var(--h-deep)",
                  color: "var(--h-ink)",
                }}
              >
                {config.description}
              </p>
            )}
          </header>

          {departmentData.length > 0 && (
            <section className="mb-5 rounded-2xl p-4 sm:p-5" style={{ background: PAPER }}>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-bold">
                    {isEnps ? "eNPS por departamento" : isPressure ? "Presión por departamento" : "Comparación por departamento"}
                  </h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {isEnps
                      ? "Compara la disposición a recomendar el lugar de trabajo."
                      : isPressure
                        ? "Un valor más bajo representa menor presión reportada."
                        : config.higherIsBetter
                          ? "Los valores más altos indican mejores resultados."
                          : "Los valores más bajos indican mejores resultados."}
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold text-on-surface-variant">
                  {departmentData.length} {departmentData.length === 1 ? "departamento" : "departamentos"}
                </span>
              </div>

              <div style={{ height: Math.max(190, departmentData.length * 48) }} className="w-full">
                {isPresent && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={departmentData}
                      margin={{ top: 4, right: 44, left: 0, bottom: 4 }}
                    >
                      <XAxis
                        type="number"
                        hide
                        domain={isEnps ? [-100, 100] : [0, "dataMax"]}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={132}
                        axisLine={false}
                        tickLine={false}
                        tick={<DepartmentAxisTick />}
                      />
                      {isEnps && (
                        <ReferenceLine x={0} stroke="var(--h-ink)" strokeOpacity={0.35} />
                      )}
                      <Tooltip
                        cursor={{ fill: "var(--h-soft)", opacity: 0.35, radius: 8 }}
                        formatter={(val) => [formatValue(val), config.label]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || "Departamento"}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="value"
                        radius={isEnps ? [0, 8, 8, 0] : [0, 8, 8, 0]}
                        maxBarSize={20}
                        isAnimationActive
                        animationDuration={700}
                        animationEasing="ease-out"
                      >
                        {departmentData.map((item, index) => {
                          const isBest = index === bestIndex;
                          const isAttention = index === attentionIndex;
                          const fill = isEnps
                            ? item.value < 0
                              ? "var(--risk-high)"
                              : item.value >= 30
                                ? "var(--risk-low)"
                                : "var(--h-deep)"
                            : isPressure
                              ? item.value >= 70
                                ? "var(--risk-high)"
                                : item.value < 40
                                  ? "var(--risk-low)"
                                  : "var(--h-deep)"
                              : isBest
                                ? "var(--risk-low)"
                                : isAttention
                                  ? "var(--risk-high)"
                                  : "var(--h-deep)";
                          return (
                            <Cell
                              key={item.fullName}
                              fill={fill}
                              fillOpacity={isBest || isAttention || isEnps || isPressure ? 0.95 : 0.5}
                            />
                          );
                        })}
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(val) => Number.isInteger(val) ? val : Number(val.toFixed(1))}
                          style={{ fontSize: 11, fontWeight: 800, fill: "var(--h-ink)" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {bestDepartment && attentionDepartment && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "var(--risk-low-container)", color: "var(--risk-low-container-text)" }}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ color: "var(--risk-low-container-icon)" }}>
                      check_circle
                    </span>
                    <div className="min-w-0 text-sm leading-relaxed">
                      <div className="text-xs font-semibold opacity-80 mb-1">Mejor resultado</div>
                      <strong>{bestDepartment.fullName}</strong>
                      <div className="font-bold">{formatValue(bestDepartment.value)}</div>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "var(--risk-high-container)", color: "var(--on-surface)" }}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ color: "var(--risk-high)" }}>
                      {isPressure ? "priority_high" : "visibility"}
                    </span>
                    <div className="min-w-0 text-sm leading-relaxed">
                      <div className="text-xs font-semibold opacity-80 mb-1">
                        {isPressure ? "Mayor presión" : "Conviene revisar"}
                      </div>
                      <strong>{attentionDepartment.fullName}</strong>
                      <div className="font-bold">{formatValue(attentionDepartment.value)}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--h-soft)" }}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--h-bg)", color: "var(--h-deep)" }}
              >
                <span className="material-symbols-outlined text-lg">lightbulb</span>
              </span>
              <h3 className="text-base font-bold">Lectura del indicador</h3>
            </div>
            {loadingExplanation ? (
              <AiSkeletonLoader />
            ) : (
              <p className="text-sm sm:text-[15px] leading-relaxed text-on-surface">
                {explanation || "Aún no hay una interpretación disponible para este indicador."}
              </p>
            )}
          </section>
        </motion.div>
      </motion.div>
    </div>
  );
}
