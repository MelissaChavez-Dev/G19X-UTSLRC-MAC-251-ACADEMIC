import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MIN_SAMPLE, clamp01, DEF_BY_ID, PULSE_ROWS } from "./dashboardMetrics";

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

export function SectionHeading({ id, title, subtitle }) {
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

export function LevelBadge({ level }) {
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
      aria-label={`${def.label}: ${metrics.enps ?? "sin datos"}. Ver análisis`}
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

export const PulseSection = memo(function PulseSection({ metrics, previousMetrics, headcount, onExpand }) {
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
export function EmptyPulse() {
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

/* Marcadores de posición mientras cargan los KPIs (evita saltos de diseño) */
export function PulseSkeleton() {
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
