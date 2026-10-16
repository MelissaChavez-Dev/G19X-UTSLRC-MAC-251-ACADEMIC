import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import RiskHeatmap from "../components/RiskHeatmap";
import AIStrategistPanel from "../components/AIStrategistPanel";
import DepartmentSentimentTrend from "../components/DepartmentSentimentTrend";
import FrictionHotspots from "../components/FrictionHotspots";
import FrictionSourceChart from "../components/FrictionSourceChart";
import MetricDetailModal from "../components/MetricDetailModal";
import { useOrgHealthMetrics } from "../hooks/useOrgHealthMetrics";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useFrictionSources } from "../hooks/useFrictionSources";
import { useWeeklySentiment } from "../hooks/useWeeklySentiment";
import { useWeeklyTrends } from "../hooks/useWeeklyTrends";
import { useAbsenceMetrics } from "../hooks/usePresence";
import { useTurnoverMetrics } from "../hooks/useTurnoverMetrics";
import { useTeamPerformance } from "../hooks/useTeamPerformance";
import { useSidebarState } from "../hooks/useSidebarState";
import { useDepartments } from "../hooks/useDepartments";
import { getKpiLevel, getKpiLevelForSample, LEVELS, MIN_SAMPLE } from "../data/kpiThresholds"; // KPI-LEVEL
import { buildDashboardAlerts } from "../utils/dashboardAlerts";
import { explainMetric } from "../services/aiService";
import { exportDashboardPdf, exportResponsesExcel } from "../services/exportService";
import teamIllustration from "../assets/ilust 2.png";
import riskIllustration from "../assets/ilust4.png";

/* ------------------------------------------------------------------
   Versiones memoizadas de los componentes pesados.
   Al abrir/cerrar el modal cambia el estado de Dashboard; con memo,
   React no vuelve a dibujar el heatmap, el panel de IA, etc. mientras
   corre la animación.
------------------------------------------------------------------- */
const MemoSidebar = memo(Sidebar);
const MemoTopBar = memo(TopBar);
const MemoRiskHeatmap = memo(RiskHeatmap);
const MemoAIStrategistPanel = memo(AIStrategistPanel);
const MemoDepartmentSentimentTrend = memo(DepartmentSentimentTrend);
const MemoFrictionHotspots = memo(FrictionHotspots);

const RATE_LIMIT_MESSAGE =
  "Se alcanzó el límite diario de consultas automáticas. Vuelve a intentarlo mañana o activa una cuenta con límites más altos.";
const GENERIC_ERROR_MESSAGE = "No se pudo generar la explicación en este momento. Ábrela de nuevo para reintentar.";
const EXPORT_ERROR_MESSAGE = "No se pudo generar el archivo. Inténtalo de nuevo.";

const isRateLimit = (text) => /429|RESOURCE_EXHAUSTED/i.test(text);
const clamp01 = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

function change(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return null;
  return diff;
}

function formatDelta(diff, unit = "") {
  if (diff === null) return null;
  return `${diff > 0 ? "+" : ""}${diff}${unit}`;
}

/* Definiciones de los KPIs que abren el modal con análisis de IA.
   (El modal usa getValue, getSuffix, label y dataKey.) */
const KPI_DEFS = [
  {
    id: "kpi-enps",
    icon: "sentiment_very_satisfied",
    label: "Salud neta del equipo (eNPS)",
    dataKey: "enps",
    getValue: (m) => m.enps,
    getSuffix: () => null,
  },
  {
    id: "kpi-attrition",
    icon: "trending_down",
    label: "Índice de presión laboral",
    dataKey: "attritionRisk",
    getValue: (m) => (Number.isFinite(m.attritionRisk) ? m.attritionRisk : "—"),
    getSuffix: () => "/ 100 puntos",
  },
  {
    id: "kpi-work-life",
    icon: "balance",
    label: "Balance vida-trabajo",
    dataKey: "workLifeBalance",
    getValue: (m) => (Number.isFinite(m.workLifeBalance) ? m.workLifeBalance : "—"),
    getSuffix: (m) => (Number.isFinite(m.workLifeBalance) ? "/ 10" : null),
  },
  {
    id: "kpi-pulse",
    icon: "how_to_reg",
    label: "Participación en pulsos",
    dataKey: "activePulseRate",
    getValue: (m) => `${m.activePulseRate}%`,
    getSuffix: (m) => `~${m.avgPerWeek}`,
  },
  {
    id: "kpi-safety",
    icon: "verified_user",
    label: "Índice de seguridad psicológica",
    dataKey: "psychSafety",
    getValue: (m) => (Number.isFinite(m.psychSafety) ? m.psychSafety : "—"),
    getSuffix: (m) => (Number.isFinite(m.psychSafety) ? "/ 5,0" : null),
  },
];

const DEF_BY_ID = Object.fromEntries(KPI_DEFS.map((def) => [def.id, def]));

/* Filas secundarias del pulso: cada una explica su escala en una línea. */
const PULSE_ROWS = [
  {
    id: "kpi-attrition",
    progress: (m) => clamp01(m.attritionRisk / 100),
    color: "var(--error)",
    unit: "/ 100",
    deltaUnit: " pts",
    hint: (m) => m.psychosocialSampleSize < MIN_SAMPLE.responses
      ? `Valor preliminar · ${m.psychosocialSampleSize}/${MIN_SAMPLE.responses} respuestas`
      : "Escala orientativa, no es una probabilidad",
    level: (m) => getKpiLevelForSample("workPressure", m.attritionRisk, m.psychosocialSampleSize), // KPI-LEVEL
  },
  {
    id: "kpi-work-life",
    progress: (m) => clamp01(m.workLifeBalance / 10),
    color: "var(--primary)",
    unit: "/ 10",
    deltaUnit: " pts",
    hint: (m) => m.sampleSize < MIN_SAMPLE.responses
      ? `Promedio preliminar · ${m.sampleSize}/${MIN_SAMPLE.responses} respuestas`
      : `Promedio sobre ${m.sampleSize} respuestas`,
  },
  {
    id: "kpi-pulse",
    progress: (m) => clamp01(m.activePulseRate / 100),
    level: (m, headcount) => headcount >= MIN_SAMPLE.headcount
      ? getKpiLevelForSample("participation", m.activePulseRate, m.sampleSize)
      : LEVELS.noData, // KPI-LEVEL
    color: "var(--success)",
    unit: null,
    deltaUnit: "",
    hint: (m, headcount) => {
      const participation = headcount > 0
        ? `~${m.avgPerWeek} de ${headcount} por semana`
        : `~${m.avgPerWeek} por semana`;
      return m.sampleSize < MIN_SAMPLE.responses
        ? `Preliminar · ${m.sampleSize}/${MIN_SAMPLE.responses} respuestas · ${participation}`
        : participation;
    },
  },
  {
    id: "kpi-safety",
    progress: (m) => clamp01(m.psychSafety / 5),
    level: (m) => getKpiLevelForSample("psychSafety", m.psychSafety, m.psychosocialSampleSize), // KPI-LEVEL
    color: "var(--secondary)",
    unit: "/ 5,0",
    deltaUnit: "",
    hint: (m) => {
      if (!Number.isFinite(m.psychSafety)) return "Sin datos aún";
      if (m.psychosocialSampleSize < MIN_SAMPLE.responses) {
        return `Promedio preliminar · ${m.psychosocialSampleSize}/${MIN_SAMPLE.responses} respuestas`;
      }
      return ["low", "controlled"].includes(getKpiLevel("psychSafety", m.psychSafety).tone) // KPI-LEVEL: mismo criterio que el chip
        ? "Estable"
        : "Requiere atención";
    },
  },
];

/* ---------- Piezas pequeñas ---------- */

const ENPS_LEVELS = [
  { label: "Bajo", min: -100, max: -10, mood: "sad", color: "var(--enps-band-low)", range: "< −10" },
  { label: "Bueno", min: -10, max: 20, mood: "neutral", color: "var(--enps-band-passive)", range: "−10 a 19" },
  { label: "Muy bueno", min: 20, max: 40, mood: "smile", color: "var(--enps-band-good)", range: "20 a 39" },
  { label: "Excelente", min: 40, max: 100, mood: "happy", color: "var(--enps-band-excellent)", range: "≥ 40" },
];

function enpsLevel(score) {
  return ENPS_LEVELS.find((level) => score < level.max) ?? ENPS_LEVELS[ENPS_LEVELS.length - 1];
}

function enpsPoint(score, radius = 92) {
  const progress = clamp01((score + 100) / 200);
  const angle = Math.PI * (1 - progress);

  return {
    x: 140 + radius * Math.cos(angle),
    y: 124 - radius * Math.sin(angle),
  };
}

function enpsArc(start, end) {
  const from = enpsPoint(start);
  const to = enpsPoint(end);

  return `M ${from.x} ${from.y} A 92 92 0 0 1 ${to.x} ${to.y}`;
}

function EnpsFaceGlyph({ level }) {
  const faceColor = level.label === "Bueno"
    ? "var(--enps-face-on-amber)"
    : "var(--enps-face-on-color)";
  const mouth = {
    sad: "M 8 16 Q 12 11 16 16",
    neutral: "M 8 15 H 16",
    smile: "M 8 13 Q 12 18 16 13",
    happy: "M 6 11 Q 12 22 18 11",
  }[level.mood];

  return (
    <>
      <circle cx="12" cy="12" r="11" fill={level.color} />
      <g
        fill={faceColor}
        stroke={faceColor}
        strokeLinecap="round"
        strokeWidth="1.5"
      >
        <circle cx="9" cy="9" r="0.9" />
        <circle cx="15" cy="9" r="0.9" />
        <path d={mouth} fill="none" />
      </g>
    </>
  );
}

function EnpsThermometer({ score, sampleSize }) {
  const hasResponses = sampleSize > 0 && Number.isFinite(score);
  const safeScore = Number.isFinite(score)
    ? Math.max(-100, Math.min(100, score))
    : 0;

  const level = enpsLevel(safeScore);
  const progress = clamp01((safeScore + 100) / 200);
  const needleAngle = -90 + progress * 180;

  return (
    <div className="flex w-full max-w-[520px] shrink-0 flex-col items-center">
      <svg
        viewBox="0 0 280 166"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={
          hasResponses
            ? `Medidor eNPS: ${safeScore}, nivel ${level.label}`
            : "Medidor eNPS sin respuestas suficientes"
        }
      >
        {/* Base neutra: separa visualmente los segmentos del fondo. */}
        <path
          d={enpsArc(-100, 100)}
          fill="none"
          stroke="var(--surface-container-highest)"
          strokeWidth="31"
          strokeLinecap="round"
        />

        {/* Segmentos del indicador. */}
        {ENPS_LEVELS.map((item, index) => {
          const gap = 2;
          const start = item.min + (index === 0 ? 0 : gap);
          const end = item.max - (index === ENPS_LEVELS.length - 1 ? 0 : gap);
          const facePoint = enpsPoint((item.min + item.max) / 2);

          return (
            <g key={item.label}>
              <path
                d={enpsArc(start, end)}
                fill="none"
                stroke={item.color}
                strokeWidth="25"
                strokeLinecap="round"
              />

              <g
                transform={`translate(${facePoint.x - 12} ${facePoint.y - 12})`}
              >
                <EnpsFaceGlyph level={item} />
              </g>
            </g>
          );
        })}

        {/* Aguja con pivote central. */}
        <g
          transform={`rotate(${needleAngle} 140 124)`}
          className="transition-transform duration-700 ease-out motion-reduce:transition-none"
        >
          <path
            d="M 140 48 L 135 126 L 140 119 L 145 126 Z"
            fill="var(--on-surface)"
          />
        </g>

        <circle
          cx="140"
          cy="124"
          r="10"
          fill="var(--surface-container)"
        />
        <circle
          cx="140"
          cy="124"
          r="6"
          fill="var(--on-surface)"
        />

        {/* Valor legible debajo de la aguja. */}
        <text
          x="140"
          y="162"
          fill="var(--on-surface)"
          fontSize="25"
          fontWeight="750"
          textAnchor="middle"
        >
          {hasResponses
            ? `${safeScore > 0 ? "+" : ""}${safeScore}`
            : "—"}
        </text>
      </svg>

      {/* Leyenda compacta y adaptable. */}
      <div className="mt-1 grid w-full grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4">
        {ENPS_LEVELS.map((item) => {
          const isActive = hasResponses && item === level;

          return (
            <span
              key={item.label}
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-1.5 py-1 text-label-sm transition-colors ${
                isActive
                  ? "bg-surface-container-high text-on-surface font-semibold"
                  : "text-on-surface-variant"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
              >
                <EnpsFaceGlyph level={item} />
              </svg>
              <span className="truncate">{item.label}</span>
            </span>
          );
        })}
      </div>

      {!hasResponses && (
        <p className="mt-2 text-center text-label-sm text-on-surface-variant">
          Aún no hay respuestas para evaluar el eNPS.
        </p>
      )}
    </div>
  );
}

function SectionHeading({ id, title, subtitle }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="text-headline-sm text-on-surface">
        {title}
      </h2>
      {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
    </div>
  );
}

function DeltaNote({ diff, unit, hasPrevious = true }) {
  if (!hasPrevious) {
    return <span className="text-label-sm text-on-surface-variant">Sin periodo previo</span>;
  }
  if (diff === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
        {diff > 0 ? "arrow_upward" : "arrow_downward"}
      </span>
      {formatDelta(diff, unit)} frente al periodo anterior
    </span>
  );
}

/* Chip con el nivel del KPI según src/data/kpiThresholds.js */ // KPI-LEVEL
const LEVEL_COLORS = {
  low: "var(--success)",
  controlled: "var(--primary)",
  elevated: "var(--warning)",
  critical: "var(--error)",
  "no-data": "var(--on-surface-variant)",
};

function LevelBadge({ level }) {
  if (!level) return null;
  const color = LEVEL_COLORS[level.tone] ?? LEVEL_COLORS["no-data"];
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

/* Protagonista del bloque: un medidor eNPS semicircular. */
const HeroTile = memo(function HeroTile({
  def,
  metrics,
  previousMetrics,
  onExpand,
}) {
  const diff = previousMetrics
    ? change(metrics.enps, previousMetrics.enps)
    : null;

  return (
    <motion.button
      type="button"
      layoutId={def.id}
      onClick={() => onExpand(def)}
      aria-label={`${def.label}: ${metrics.enps}. Ver análisis`}
      style={{
        borderRadius: 32,
      }}
      className="enps-hero-tile group motion-press relative flex min-w-0 flex-col items-center gap-space-md overflow-hidden p-space-md text-center sm:p-space-lg"
    >
      {/* Acento discreto, sin degradados. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full"
        style={{
          background: "var(--primary)",
          opacity: 0.07,
        }}
      />

      <span className="relative flex w-full flex-col items-center gap-space-xs">
        <span className="block text-headline-md font-semibold text-on-surface">
          {def.label}
        </span>
        <span className="block text-body-sm text-on-surface-variant">
          Escala de −100 a +100
        </span>
      </span>

      <EnpsThermometer
        score={metrics.enps}
        sampleSize={metrics.sampleSize}
      />

      <span className="relative flex w-full flex-col items-center gap-space-sm">
        {metrics.sampleSize < MIN_SAMPLE.responses && (
          <span className="rounded-xl bg-surface-container-low px-space-sm py-1 text-label-sm text-on-surface-variant">
            Resultado preliminar · {metrics.sampleSize}/{MIN_SAMPLE.responses} respuestas
          </span>
        )}

        {previousMetrics && (
          <DeltaNote
            diff={diff}
            unit=""
            hasPrevious
          />
        )}

        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-surface-container-low px-space-lg py-space-sm text-label-md font-medium text-on-surface">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[18px]"
          >
            auto_awesome
          </span>
          Ver análisis
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[18px]"
          >
            arrow_forward
          </span>
        </span>
      </span>
    </motion.button>
  );
});

/* Fila secundaria: icono, valor, barra fina y una línea de contexto. */
const PulseRow = memo(function PulseRow({ config, metrics, previousMetrics, headcount, onExpand }) {
  const def = DEF_BY_ID[config.id];
  const diff = previousMetrics ? change(metrics[def.dataKey], previousMetrics[def.dataKey]) : null;
  const value = def.getValue(metrics);

  return (
    <motion.button
      type="button"
      layoutId={def.id}
      onClick={() => onExpand(def)}
      aria-label={`${def.label}: ${value}. Ver análisis`}
      style={{
        "--pulse-accent": config.color,
        borderRadius: 32,
      }}
      className="pulse-kpi-card motion-press group flex flex-1 items-center gap-space-md px-space-lg py-space-md text-left transition-all hover:brightness-95"
    >
      <span
        aria-hidden="true"
        className="pulse-kpi-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm"
      >
        <span className="material-symbols-outlined text-[22px]">{def.icon}</span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-space-xs">
        <span className="flex items-baseline justify-between gap-space-sm">
          <span className="flex min-w-0 items-center gap-space-xs">
            <span className="truncate text-label-md font-semibold text-on-surface">{def.label}</span>
            <LevelBadge level={config.level?.(metrics, headcount)} />
          </span>
          <span className="shrink-0 text-headline-sm text-on-surface">
            {value}
            {config.unit && value !== "—" && (
              <span className="ml-1 text-label-sm text-on-surface-variant">{config.unit}</span>
            )}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high/60"
        >
          <span
            className="block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${config.progress(metrics) * 100}%`, background: config.color }}
          />
        </span>

        <span className="flex items-center justify-between gap-space-sm">
          <span className="truncate text-label-sm text-on-surface-variant">{config.hint(metrics, headcount)}</span>
          {previousMetrics
            ? diff !== null && (
              <span className="shrink-0 text-label-sm text-on-surface-variant">{formatDelta(diff, config.deltaUnit)}</span>
            )
            : <span className="shrink-0 text-label-sm text-on-surface-variant">Sin periodo previo</span>}
        </span>
      </span>

      {/* Nuevo indicador visual para clic */}
      <span 
        aria-hidden="true" 
        className="material-symbols-outlined text-on-surface-variant opacity-60 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
      >
        chevron_right
      </span>
    </motion.button>
  );
});

const PulseSection = memo(function PulseSection({ metrics, previousMetrics, headcount, onExpand }) {
  return (
    <section aria-labelledby="pulse-heading" className="flex flex-col gap-space-sm">
      <SectionHeading
        id="pulse-heading"
        title="Pulso del equipo"
        subtitle="Toca un indicador para ver su análisis."
      />
      <div className="grid grid-cols-1 items-stretch gap-space-md xl:grid-cols-[5fr_7fr]">
        <HeroTile def={DEF_BY_ID["kpi-enps"]} metrics={metrics} previousMetrics={previousMetrics} onExpand={onExpand} />
        <div className="flex flex-col gap-space-sm">
          {PULSE_ROWS.map((config) => (
            <PulseRow
              key={config.id}
              config={config}
              metrics={metrics}
              previousMetrics={previousMetrics}
              headcount={headcount}
              onExpand={onExpand}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

/* Una sola invitación en lugar de cuatro tarjetas vacías. */
function EmptyPulse() {
  return (
    <section
      aria-labelledby="pulse-heading"
      className="flex flex-col gap-space-md rounded-[40px] bg-surface-container-low p-space-lg md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-space-xs">
        <h2 id="pulse-heading" className="text-headline-sm text-on-surface">
          Aún no hay respuestas en este periodo
        </h2>
        <p className="max-w-xl text-body-md text-on-surface-variant">
          Los indicadores del pulso aparecen en cuanto el equipo contesta la encuesta de bienestar.
        </p>
      </div>
      {/* Ajusta la ruta si tu encuesta vive en otra */}
      <Link
        to="/survey-builder"
        className="motion-press inline-flex items-center justify-center gap-space-xs self-start rounded-full bg-primary px-space-lg py-3 text-label-md text-on-primary md:self-auto"
      >
        Crear encuesta
      </Link>
    </section>
  );
}

/* Tarjeta sencilla para lo operativo (no abre modal). */
function OpsTile({ icon, label, period, value, hint, level }) {
  return (
    <div style={{ borderRadius: 32 }} className="flex flex-col gap-space-sm bg-surface-container-low p-space-lg">
      <div className="flex items-center justify-between gap-space-sm text-on-surface-variant">
        <span className="flex min-w-0 items-center gap-space-xs">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            {icon}
          </span>
          <span className="truncate text-label-md font-semibold text-on-surface">{label}</span>
        </span>
        {period && <span className="shrink-0 text-label-sm">{period}</span>}
      </div>
      <div className="flex items-baseline gap-space-sm">
        <span className="text-3xl font-bold leading-none text-on-surface">{value}</span>
        <LevelBadge level={level} />
      
      </div>
      <p className="text-label-sm text-on-surface-variant">{hint}</p>
    </div>
  );
}



const OperationStrip = memo(function OperationStrip({
  absence,
  absenceLoading,
  turnover,
  turnoverLoading,
  performance,
  performanceLoading,
}) {
  const showAbsence = Boolean(absence) || absenceLoading;
  const showTurnover = Boolean(turnover) || turnoverLoading;
  const showPerformance = Boolean(performance) || performanceLoading;
  if (!showAbsence && !showTurnover && !showPerformance) return null;

  const hasWorkdayRecords = Boolean(absence && absence.eligibleWorkDays > 0);
  const turnoverDiff =
    turnover && Number.isFinite(turnover.rate) && Number.isFinite(turnover.previousRate)
      ? Math.round((turnover.rate - turnover.previousRate) * 10) / 10
      : null;
  const punctualityHint = Number.isFinite(performance?.punctualityRate)
    ? `Puntualidad: ${performance.punctualityRate}% (${performance.punctualitySample} ${
      performance.punctualitySample === 1 ? "tarea terminada" : "tareas terminadas"
    } con fecha límite).`
    : "Puntualidad: sin tareas terminadas con fecha límite y fecha de cierre medible.";
  const performanceHint = performance?.totalTasks
    ? `${performance.doneTasks}/${performance.totalTasks} hechas, ${performance.overdueTasks} vencidas. ${punctualityHint}`
    : `Sin tareas registradas aún. ${punctualityHint}`;

  return (
    <section aria-labelledby="ops-heading" className="flex flex-col gap-space-sm">
      <SectionHeading id="ops-heading" title="Operación del equipo" />
      <div className="grid grid-cols-1 items-center gap-space-md xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
          {showAbsence && (
            <OpsTile
              icon="person_off"
              label="Actividad digital no registrada"
              level={absenceLoading ? undefined : hasWorkdayRecords ? getKpiLevel("digitalAbsence", absence?.rate) : LEVELS.noData} // KPI-LEVEL
              period="30 días"
              value={absenceLoading ? "…" : Number.isFinite(absence?.rate) ? `${absence.rate}%` : "—"}
              hint={
                absenceLoading
                  ? "Calculando..."
                  : hasWorkdayRecords
                    ? `${absence.unjustifiedDays} jornadas sin actividad digital no cubiertas por permiso; ${absence.justifiedDays} cubiertas.`
                    : absence?.workDays > 0
                      ? "Todas las jornadas sin actividad digital están cubiertas por permisos aprobados."
                      : "Sin registros aún, se calcula cada noche"
              }
            />
          )}
          {showTurnover && (
            <OpsTile
              icon="logout"
              label="Rotación real"
              level={turnoverLoading ? undefined : turnover?.headcount >= MIN_SAMPLE.headcount ? getKpiLevel("turnover90d", turnover?.rate) : LEVELS.noData} // KPI-LEVEL
              period="90 días"
              value={turnoverLoading ? "…" : Number.isFinite(turnover?.rate) ? `${turnover.rate}%` : "—"}
              diff={turnoverDiff}
              hint={
                turnoverLoading
                  ? "Calculando..."
                  : `${turnover?.departures ?? 0} bajas sobre ${turnover?.headcount ?? 0} activos`
              }
            />
          )}
          {showPerformance && (
            <OpsTile
              icon="task_alt"
              label="Tareas al corriente"
              level={performanceLoading ? undefined : performance?.levels?.onTrack} // KPI-LEVEL
              value={performanceLoading ? "…" : Number.isFinite(performance?.onTimeRate) ? `${performance.onTimeRate}%` : "—"}
              hint={
                performanceLoading
                  ? "Calculando..."
                  : performanceHint
              }
            />
          )}
        </div>
        <img
          src={teamIllustration}
          alt=""
          aria-hidden="true"
          className="mx-auto h-auto w-48 object-contain xl:mx-0 xl:ml-auto xl:w-80"
        />
      </div>
    </section>
  );
});

/* Marcadores de posición mientras cargan los KPIs (evita saltos de diseño) */
function PulseSkeleton() {
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-space-md xl:grid-cols-[5fr_7fr]"
      role="status"
      aria-label="Calculando indicadores"
    >
      <div className="animate-shimmer min-h-[16rem]" style={{ borderRadius: 40 }} />
      <div className="flex flex-col gap-space-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-shimmer min-h-[5rem] flex-1" style={{ borderRadius: 32 }} />
        ))}
      </div>
    </div>
  );
}

/* Reemplaza tu componente ExportActions actual con este */
function ExportActions({ onExport, exporting, disabled }) {
  const base =
    "motion-press inline-flex items-center gap-space-xs rounded-full px-space-md py-2 text-label-md font-medium transition-colors disabled:brightness-90";
  return (
    <div className="flex flex-col items-end gap-space-xs">
      <span id="export-actions-label" className="text-label-sm text-on-surface-variant">
        Presiona para descargar el reporte PDF o Excel
      </span>
      <div className="flex flex-wrap gap-space-xs" role="group" aria-labelledby="export-actions-label">
        <button
          type="button"
          onClick={() => onExport("pdf")}
          disabled={disabled || exporting !== null}
          className={`${base} bg-error-container text-on-error-container hover:brightness-95 dark:bg-error-container dark:text-on-error-container dark:hover:brightness-110`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            picture_as_pdf
          </span>
          {exporting === "pdf" ? "Generando..." : "Reporte PDF"}
        </button>
        <button
          type="button"
          onClick={() => onExport("excel")}
          disabled={disabled || exporting !== null}
          className={`${base} bg-success-container text-on-success-container hover:brightness-95 dark:bg-success-container dark:text-on-success-container dark:hover:brightness-110`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            table
          </span>
          {exporting === "excel" ? "Generando..." : "Excel"}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [departmentId, setDepartmentId] = useState(null);
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();
  const { metrics, previousMetrics, periodLabel, loading, headcount } = useOrgHealthMetrics(departmentId);
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk(departmentId);
  const {
    sources: frictionSources,
    loading: frictionSourcesLoading,
    error: frictionSourcesError,
  } = useFrictionSources(departmentId);
  const {
    trend,
    hotspots,
    comments,
    loading: sentimentLoading,
    error: sentimentError,
  } = useWeeklySentiment(departmentId);
  const { trends: weeklyTrends } = useWeeklyTrends(departmentId);
  const { absence, loading: absenceLoading } = useAbsenceMetrics(departmentId);
  const { metrics: turnover, loading: turnoverLoading } = useTurnoverMetrics(departmentId);
  const { metrics: performance, loading: performanceLoading } = useTeamPerformance(departmentId);
  const alerts = buildDashboardAlerts({
    metrics,
    previousMetrics,
    headcount,
    departmentRows: deptRows || [],
    absence,
    turnover,
    performance,
    departments,
  });

  const [expanded, setExpanded] = useState(null); // definición del KPI abierto
  const [explanations, setExplanations] = useState({}); // explicaciones guardadas (incluye límite 429)
  const [failedIds, setFailedIds] = useState({}); // errores pasajeros: NO se guardan, permiten reintentar
  const [loadingId, setLoadingId] = useState(null); // id del KPI que se está analizando
  const [aiMarkdown, setAiMarkdown] = useState("");
  const [aiSummaryMinimized, setAiSummaryMinimized] = useState(false);
  const [exporting, setExporting] = useState(null); // null | "pdf" | "excel"
  const [exportError, setExportError] = useState(null);

  // Siempre los datos más recientes, sin cambiar la identidad de handleExpand
  const latest = useRef({});
  useEffect(() => {
    latest.current = { metrics, previousMetrics, explanations };
  }, [metrics, previousMetrics, explanations]);

  async function handleExport(kind) {
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "pdf") {
        exportDashboardPdf({
          metrics, deptRows: deptRows || [], aiMarkdown, departmentId, departments,
          turnover, performance, absence, headcount, periodLabel,
        });
      } else {
        await exportResponsesExcel({
          metrics, deptRows: deptRows || [], departments, turnover, performance,
          absence, headcount, departmentId, periodLabel,
        });
      }
    } catch {
      setExportError(EXPORT_ERROR_MESSAGE);
    } finally {
      setExporting(null);
    }
  }

  const handleExpand = useCallback(async (def) => {
    setExpanded(def);

    const { metrics: m, previousMetrics: prev, explanations: saved } = latest.current;
    if (saved[def.id] || !m) return;

    setFailedIds((f) => {
      if (!f[def.id]) return f;
      const rest = { ...f };
      delete rest[def.id];
      return rest;
    });
    setLoadingId(def.id);

    try {
      const text = await explainMetric({
        label: def.label,
        context: {
          valorActual: def.getValue(m),
          valorAnterior: prev ? def.getValue(prev) : null,
          muestra: ["attritionRisk", "psychSafety"].includes(def.dataKey)
            ? m.psychosocialSampleSize
            : m.sampleSize,
          interpretacion: def.dataKey === "attritionRisk"
            ? "Índice orientativo de 0 a 100 puntos calculado con preguntas directas de fatiga de turno y carga emocional. No es una probabilidad ni predice renuncias."
            : undefined,
        },
      });
      const explanation = isRateLimit(text) ? RATE_LIMIT_MESSAGE : text;
      setExplanations((e) => ({ ...e, [def.id]: explanation }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      if (isRateLimit(errorText)) {
        // El límite diario se guarda para no gastar más consultas al volver a abrir
        setExplanations((e) => ({ ...e, [def.id]: RATE_LIMIT_MESSAGE }));
      } else {
        setFailedIds((f) => ({ ...f, [def.id]: GENERIC_ERROR_MESSAGE }));
      }
    } finally {
      // Solo apaga la carga si sigue siendo la de este KPI (evita carreras entre KPIs)
      setLoadingId((current) => (current === def.id ? null : current));
    }
  }, []);

  const handleClose = useCallback(() => setExpanded(null), []);

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <MemoSidebar />
      <MemoTopBar
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
        periodLabel={periodLabel}
        alerts={alerts}
      />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-space-lg px-space-xl py-space-lg">
          {/* 1. Encabezado: título a la izquierda, exportar discreto a la derecha */}
          <header className="flex flex-wrap items-end justify-between gap-space-md">
            <div className="flex flex-col gap-space-sm">
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                {metrics ? metrics.sampleSize : "…"} respuestas · {periodLabel}
              </span>
              <h1 className="text-headline-xl text-on-surface">Diagnóstico Psicosocial y Salud Estratégica</h1>
            </div>
            <div className="flex flex-col items-end gap-space-xs">
              <ExportActions onExport={handleExport} exporting={exporting} disabled={!metrics} />
              {exportError && (
                <p role="alert" className="rounded-full bg-error-container px-3 py-1 text-label-md text-on-error-container">
                  {exportError}
                </p>
              )}
            </div>
          </header>

          {/* 2. Pulso: un protagonista + tres filas tranquilas */}
          {loading && !metrics && <PulseSkeleton />}
          {metrics &&
            (metrics.sampleSize > 0 ? (
              <PulseSection
                metrics={metrics}
                previousMetrics={previousMetrics}
                headcount={headcount}
                onExpand={handleExpand}
              />
            ) : (
              <EmptyPulse />
            ))}
          {!loading && !metrics && (
            <p role="status" className="text-body-md text-on-surface-variant">
              No se pudieron cargar los indicadores. Revisa tu conexión o los permisos de tu cuenta.
            </p>
          )}

          {/* 3. Operación: una sola franja de tres tarjetas simples */}
          {metrics && (
            <OperationStrip
              absence={absence}
              absenceLoading={absenceLoading}
              turnover={turnover}
              turnoverLoading={turnoverLoading}
              performance={performance}
              performanceLoading={performanceLoading}
            />
          )}

          {/* 4. Dónde está el riesgo */}
          {deptRows && (
            <div className="grid grid-cols-1 items-start gap-space-md xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
              <div className="flex min-w-0 self-stretch flex-col">
                <MemoRiskHeatmap rows={deptRows} />
                {aiMarkdown && !aiSummaryMinimized && (
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                    <img
                      src={riskIllustration}
                      alt=""
                      aria-hidden="true"
                      className="h-full min-h-0 w-full object-contain"
                    />
                  </div>
                )}
              </div>
              <MemoAIStrategistPanel
                orgMetrics={metrics}
                departmentRisk={deptRows}
                openComments={comments}
                onAnalysisChange={setAiMarkdown}
                minimized={aiSummaryMinimized}
                onMinimizedChange={setAiSummaryMinimized}
              />
            </div>
          )}
          {deptLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Calculando matriz de riesgo...
            </p>
          )}

          {/* 5. Qué dicen los comentarios */}
          {trend && hotspots && (
            <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
              <MemoDepartmentSentimentTrend rows={trend} />
              <MemoFrictionHotspots items={hotspots} />
            </div>
          )}
          <FrictionSourceChart
            items={frictionSources}
            loading={frictionSourcesLoading}
            error={frictionSourcesError}
          />
          {sentimentLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Analizando sentimiento de comentarios...
            </p>
          )}
          {sentimentError && (
            <p role="alert" className="rounded-2xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
              No se pudo analizar el sentimiento de los comentarios. Revisa la conexión y los permisos para volver a intentarlo.
            </p>
          )}
        </div>
      </main>

      <AnimatePresence>
        {expanded && metrics && (
          <MetricDetailModal
            layoutId={expanded.id}
            title={expanded.label}
            value={expanded.getValue(metrics)}
            suffix={expanded.getSuffix(metrics)}
            explanation={explanations[expanded.id] ?? failedIds[expanded.id]}
            loadingExplanation={loadingId === expanded.id}
            trendData={weeklyTrends}
            departmentRows={deptRows}
            dataKey={expanded.dataKey}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}