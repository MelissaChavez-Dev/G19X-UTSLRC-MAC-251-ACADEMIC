
import LevelBadge from "./LevelBadge";
import {
  CHECK_DOCS,
  QUALITY_LEVEL_FROM,
  QUALITY_WEIGHTS,
} from "../data/dataQualityRules";
import { levelColor } from "../utils/qualityLevel";

const STATUS = {
  ok: {
    label: "Correcto",
    color: "var(--success)",
    icon: "check_circle",
  },
  warn: {
    label: "Atención",
    color: "var(--warning)",
    icon: "error",
  },
  fail: {
    label: "Falla",
    color: "var(--error)",
    icon: "cancel",
  },
  info: {
    label: "Informativa",
    color: "var(--on-surface-variant)",
    icon: "info",
  },
};

const READINGS = {
  low: "Los datos presentan buenas condiciones de calidad y pueden utilizarse para apoyar decisiones.",
  controlled:
    "La información es utilizable, aunque conviene corregir algunos detalles antes de presentar resultados.",
  elevated:
    "Hay inconsistencias que requieren revisión. Comprueba los hallazgos antes de interpretar los indicadores.",
  critical:
    "La confiabilidad de los datos está comprometida. Revisa los problemas detectados antes de utilizar los indicadores.",
  "no-data": "Todavía no hay respuestas suficientes para evaluar la calidad.",
};

const STEPS = [
  {
    number: "01",
    icon: "monitoring",
    title: "Consulta el diagnóstico",
    text: "Revisa el puntaje general y el nivel de calidad de las respuestas analizadas.",
  },
  {
    number: "02",
    icon: "fact_check",
    title: "Investiga los hallazgos",
    text: "Abre cada verificación para conocer el problema, su impacto y cómo localizarlo.",
  },
  {
    number: "03",
    icon: "sync",
    title: "Corrige y reevalúa",
    text: "Soluciona los problemas en su origen y vuelve a ejecutar la evaluación.",
  },
];

function Icon({ children, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, description, id }) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow && (
        <span className="text-label-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
      )}
      <h2
        id={id}
        className="text-headline-sm font-semibold text-on-surface"
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-3xl text-body-sm text-on-surface-variant">
          {description}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const config = STATUS[status] ?? STATUS.info;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold"
      style={{
        color: config.color,
        background: `color-mix(in srgb, ${config.color} 13%, var(--surface-container-low))`,
      }}
    >
      <Icon className="text-[16px]">{config.icon}</Icon>
      {config.label}
    </span>
  );
}

function ScoreRing({ score, color }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const hasScore = Number.isFinite(score);
  const value = hasScore ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 112 112"
        className="h-full w-full"
        role="img"
        aria-label={
          hasScore
            ? `Puntaje de calidad: ${score} de 100`
            : "Sin puntaje de calidad"
        }
      >
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="var(--surface-container-highest)"
          strokeWidth="9"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform="rotate(-90 56 56)"
          className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
        <text
          x="56"
          y="53"
          textAnchor="middle"
          fontSize="27"
          fontWeight="700"
          fill="var(--on-surface)"
        >
          {hasScore ? score : "—"}
        </text>
        <text
          x="56"
          y="71"
          textAnchor="middle"
          fontSize="10"
          fill="var(--on-surface-variant)"
        >
          DE 100
        </text>
      </svg>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, accent }) {
  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4"
      style={{
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon className="text-[20px]">{icon}</Icon>
        <span className="text-label-sm font-medium">{label}</span>
      </div>

      <div className="min-w-0">
        <p className="text-headline-md font-semibold text-on-surface">
          {value}
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {detail}
        </p>
      </div>
    </div>
  );
}

function CheckCard({ check }) {
  const docs = CHECK_DOCS[check.id];
  const informative = check.weight === 0;
  const config = STATUS[check.status] ?? STATUS.info;
  const details = check.details ?? [];
  const examples = check.examples ?? [];

  return (
    <details
      className="group overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low transition-colors hover:border-outline-variant"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: config.color,
            background: `color-mix(in srgb, ${config.color} 14%, var(--surface-container-low))`,
          }}
        >
          <Icon>{config.icon}</Icon>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-body-md font-semibold text-on-surface">
            {check.title}
          </span>
          <span className="mt-0.5 block text-body-sm text-on-surface-variant">
            {check.summary}
          </span>
        </span>

        <span className="hidden shrink-0 text-label-sm text-on-surface-variant sm:block">
          {informative ? "Sin ponderación" : `${check.weight} pts`}
        </span>

        <StatusChip status={check.status} />

        <Icon className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-180">
          expand_more
        </Icon>
      </summary>

      <div className="border-t border-outline-variant/40 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: "search",
              title: "Qué revisa",
              text: docs?.what,
            },
            {
              icon: "help",
              title: "Por qué importa",
              text: docs?.why,
            },
            {
              icon: "build",
              title: "Cómo corregirlo",
              text: docs?.fix,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-surface-container p-4"
            >
              <div className="mb-2 flex items-center gap-2 text-on-surface">
                <Icon className="text-[18px] text-primary">
                  {item.icon}
                </Icon>
                <h3 className="text-label-md font-semibold">
                  {item.title}
                </h3>
              </div>
              <p className="text-body-sm leading-relaxed text-on-surface-variant">
                {item.text ?? "No hay documentación disponible."}
              </p>
            </div>
          ))}
        </div>

        {(details.length > 0 || examples.length > 0) && (
          <div className="mt-3 rounded-xl border border-outline-variant/40 bg-surface-container p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon className="text-primary">assignment_late</Icon>
              <h3 className="text-label-md font-semibold text-on-surface">
                Detalle de los hallazgos
              </h3>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
                {details.length}
              </span>
            </div>

            {details.length > 0 && (
              <ul className="flex flex-col gap-2">
                {details.map((detail, index) => (
                  <li
                    key={`${check.id}-detail-${index}`}
                    className="flex items-start gap-2 text-body-sm text-on-surface-variant"
                  >
                    <Icon className="mt-0.5 text-[17px] text-secondary">
                      fiber_manual_record
                    </Icon>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}

            {examples.length > 0 && (
              <div className="mt-4 border-t border-outline-variant/40 pt-3">
                <p className="mb-2 text-label-sm font-semibold text-on-surface">
                  Documentos de ejemplo en Firestore
                </p>
                <p className="mb-2 text-body-sm text-on-surface-variant">
                  Busca estos identificadores en la colección{" "}
                  <code className="rounded bg-surface-container-high px-1.5 py-0.5 text-primary">
                    responses
                  </code>
                  .
                </p>

                <div className="flex flex-wrap gap-2">
                  {examples.map((id) => (
                    <code
                      key={id}
                      className="break-all rounded-lg border border-outline-variant/50 bg-surface-container-low px-2.5 py-1.5 text-label-sm text-on-surface"
                    >
                      {id}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export default function DataQualityView({
  result,
  loading,
  error,
  onReload,
}) {
  const color = levelColor(result?.level);

  const checks = result?.checks ?? [];

  const weightedChecks = checks.filter((check) => check.weight > 0);
  const informativeChecks = checks.filter((check) => check.weight === 0);

  const failedCount = checks.filter(
    (check) => check.status === "fail"
  ).length;

  const warningCount = checks.filter(
    (check) => check.status === "warn"
  ).length;

  const okCount = checks.filter(
    (check) => check.status === "ok"
  ).length;

  const reading = READINGS[result?.level?.tone] ??
    "Consulta los resultados de las verificaciones para conocer el estado de los datos.";

  return (
    <div className="flex flex-col gap-8">
      {/* Encabezado */}
      <header className="relative overflow-hidden rounded-[28px] border border-outline-variant/40 bg-surface-container-low p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary-container">
              <Icon className="text-[17px]">verified</Icon>
              Auditoría de información
            </div>

            <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface sm:text-headline-xl">
              Calidad de los datos
            </h1>

            <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
              Evalúa la confiabilidad de las respuestas que alimentan los
              indicadores del dashboard. Identifica inconsistencias,
              consulta los hallazgos y encuentra cómo solucionarlos.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
              <Icon className="text-[24px]">database</Icon>
            </span>
            <div>
              <p className="text-label-md font-semibold text-on-surface">
                Solo lectura
              </p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                Sin cambios en los datos
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Guía rápida */}
      <section aria-labelledby="dq-how" className="flex flex-col gap-4">
        <SectionHeading
          id="dq-how"
          eyebrow="Guía rápida"
          title="De la evaluación a la solución"
          description="Tres pasos para interpretar los resultados y actuar sobre los problemas detectados."
        />

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="flex gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon className="text-[22px]">{step.icon}</Icon>
              </div>

              <div className="min-w-0">
                <span className="text-label-sm font-semibold text-primary">
                  PASO {step.number}
                </span>
                <h3 className="mt-1 text-body-md font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Estado actual */}
      <section aria-labelledby="dq-status" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            id="dq-status"
            eyebrow="Monitor de calidad"
            title="Estado actual"
            description="Resumen de la última evaluación de las respuestas."
          />

          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="motion-press inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-label-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className={loading ? "animate-spin" : ""}>
              refresh
            </Icon>
            {loading ? "Evaluando..." : "Volver a evaluar"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error-container p-4 text-on-error-container"
          >
            <Icon className="mt-0.5">error</Icon>
            <div>
              <p className="text-label-md font-semibold">
                No se pudo completar la carga
              </p>
              <p className="mt-1 text-body-sm">
                Revisa tu conexión o los permisos de tu cuenta e intenta
                evaluar nuevamente.
              </p>
            </div>
          </div>
        )}

        {loading && !result && (
          <div
            role="status"
            aria-label="Evaluando la calidad de los datos"
            className="min-h-52 animate-shimmer rounded-[28px] bg-surface-container-low"
          />
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
              {/* Tarjeta principal */}
              <div className="flex flex-col justify-between gap-5 rounded-[28px] border border-outline-variant/40 bg-surface-container-low p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">
                      Índice de calidad
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      Evaluación general de los datos
                    </p>
                  </div>

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">
                    <Icon className="text-[22px]">analytics</Icon>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <ScoreRing score={result.score} color={color} />

                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-label-sm text-on-surface-variant">
                      Nivel de confiabilidad
                    </p>

                    <LevelBadge level={result.level} />

                    <p className="mt-3 text-body-md leading-relaxed text-on-surface">
                      {reading}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 border-t border-outline-variant/40 pt-4 text-body-sm text-on-surface-variant">
                  <Icon className="mt-0.5 text-[18px] text-primary">
                    schedule
                  </Icon>
                  <p>
                    Se analizaron{" "}
                    <strong className="font-semibold text-on-surface">
                      {result.total.toLocaleString("es-MX")}
                    </strong>{" "}
                    {result.total === 1
                      ? "respuesta"
                      : "respuestas"}{" "}
                    de los últimos 12 meses, con un límite de 5,000.
                  </p>
                </div>
              </div>

              {/* Resumen de verificaciones */}
              <div className="flex flex-col gap-3 rounded-[28px] border border-outline-variant/40 bg-surface-container-low p-5 sm:p-6">
                <div>
                  <p className="text-label-md font-semibold text-on-surface">
                    Resumen de verificaciones
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Resultados por estado
                  </p>
                </div>

                <MetricCard
                  icon="check_circle"
                  label="Correctas"
                  value={okCount}
                  detail="Sin inconsistencias detectadas"
                  accent="var(--success)"
                />

                <MetricCard
                  icon="warning"
                  label="Requieren atención"
                  value={warningCount}
                  detail="Conviene revisar estos resultados"
                  accent="var(--warning)"
                />

                <MetricCard
                  icon="cancel"
                  label="Fallidas"
                  value={failedCount}
                  detail="Problemas que deben investigarse"
                  accent="var(--error)"
                />
              </div>
            </div>

            {result.total === 0 && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4"
              >
                <Icon className="text-primary">info</Icon>
                <div>
                  <p className="text-label-md font-semibold text-on-surface">
                    Sin respuestas para evaluar
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    No se encontraron respuestas dentro del periodo
                    analizado. El puntaje no debe interpretarse como una
                    validación de datos inexistentes.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Verificaciones */}
      {result && checks.length > 0 && (
        <section aria-labelledby="dq-checks" className="flex flex-col gap-4">
          <SectionHeading
            id="dq-checks"
            eyebrow="Diagnóstico detallado"
            title="Verificaciones"
            description="Explora cada control para conocer qué se revisó, cuáles son los hallazgos y cómo resolverlos."
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-label-sm font-semibold text-on-surface">
              {weightedChecks.length} controles ponderados
            </span>
            <span className="rounded-full bg-secondary-container px-3 py-1.5 text-label-sm font-semibold text-on-secondary-container">
              {informativeChecks.length} informativos
            </span>
          </div>

          {weightedChecks.length > 0 && (
            <div className="flex flex-col gap-3">
              {weightedChecks.map((check) => (
                <CheckCard key={check.id} check={check} />
              ))}
            </div>
          )}

          {informativeChecks.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <Icon className="text-secondary">info</Icon>
                <h3 className="text-body-md font-semibold text-on-surface">
                  Controles informativos
                </h3>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface-variant">
                  No afectan el puntaje
                </span>
              </div>

              {informativeChecks.map((check) => (
                <CheckCard key={check.id} check={check} />
              ))}
            </div>
          )}
        </section>
      )}

      {result && checks.length === 0 && (
        <div
          role="status"
          className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-5"
        >
          <div className="flex items-center gap-3">
            <Icon className="text-[24px] text-primary">fact_check</Icon>
            <div>
              <p className="text-body-md font-semibold text-on-surface">
                No hay verificaciones disponibles
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                No se generaron controles para el resultado actual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metodología */}
      <section aria-labelledby="dq-score" className="flex flex-col gap-4">
        <SectionHeading
          id="dq-score"
          eyebrow="Metodología"
          title="Cómo se calcula el puntaje"
          description="El índice resume los resultados de los controles ponderados. Los controles informativos se muestran por separado y no modifican la puntuación."
        />

        <div className="overflow-hidden rounded-[24px] border border-outline-variant/40 bg-surface-container-low">
          <div className="flex items-center gap-3 border-b border-outline-variant/40 p-4 sm:px-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <Icon>calculate</Icon>
            </span>
            <div>
              <h3 className="text-body-md font-semibold text-on-surface">
                Distribución de ponderaciones
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Peso asignado a cada verificación
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <caption className="sr-only">
                Peso de cada verificación en el puntaje de calidad
              </caption>
              <thead className="bg-surface-container">
                <tr className="text-label-sm font-semibold text-on-surface-variant">
                  <th scope="col" className="px-5 py-3">
                    Verificación
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Peso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {Object.entries(QUALITY_WEIGHTS).map(([id, weight]) => (
                  <tr key={id}>
                    <td className="px-5 py-3.5 text-on-surface">
                      {CHECK_DOCS[id]?.title ?? id}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex rounded-lg bg-primary-container px-2.5 py-1 font-semibold text-on-primary-container">
                        {weight} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-outline-variant/40 p-4 sm:p-5">
            <p className="mb-3 text-label-md font-semibold text-on-surface">
              Umbrales de calidad
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                {
                  label: "Bajo riesgo",
                  range: `${QUALITY_LEVEL_FROM.low}–100`,
                  color: "var(--success)",
                },
                {
                  label: "Controlado",
                  range: `${QUALITY_LEVEL_FROM.controlled}–${QUALITY_LEVEL_FROM.low - 1}`,
                  color: "var(--secondary)",
                },
                {
                  label: "Elevado",
                  range: `${QUALITY_LEVEL_FROM.elevated}–${QUALITY_LEVEL_FROM.controlled - 1}`,
                  color: "var(--warning)",
                },
                {
                  label: "Crítico",
                  range: `Menos de ${QUALITY_LEVEL_FROM.elevated}`,
                  color: "var(--error)",
                },
              ].map((level) => (
                <div
                  key={level.label}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-container p-3"
                >
                  <span className="flex items-center gap-2 text-body-sm text-on-surface">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: level.color }}
                    />
                    {level.label}
                  </span>
                  <span className="text-label-md font-semibold text-on-surface">
                    {level.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="flex items-start gap-2 text-body-sm leading-relaxed text-on-surface-variant">
          <Icon className="mt-0.5 text-[18px]">info</Icon>
          <span>
            Los pesos y los niveles son parámetros iniciales de la
            organización, no un estándar oficial. La interpretación depende
            de las reglas definidas en la configuración de calidad.
          </span>
        </p>
      </section>

      {/* Límites */}
      <section
        aria-labelledby="dq-limits"
        className="rounded-[24px] border border-outline-variant/40 bg-surface-container-low p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon>shield</Icon>
          </span>

          <div>
            <h2
              id="dq-limits"
              className="text-headline-sm font-semibold text-on-surface"
            >
              Alcance y limitaciones
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Qué debes tener en cuenta al interpretar los resultados.
            </p>
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {[
            {
              title: "No previene errores de captura",
              text: "Las verificaciones se ejecutan sobre los datos guardados; no impiden que se almacene una respuesta incorrecta.",
            },
            {
              title: "No modifica los registros",
              text: "Las correcciones deben realizarse en el Constructor de encuestas o en Firestore, según el origen del problema.",
            },
            {
              title: "Protege la información personal",
              text: "Aunque las respuestas no incluyan UID, el texto libre podría contener información que permita identificar a una persona.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-xl bg-surface-container p-4"
            >
              <Icon className="mt-0.5 text-primary">arrow_right</Icon>
              <div>
                <p className="text-label-md font-semibold text-on-surface">
                  {item.title}
                </p>
                <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                  {item.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
