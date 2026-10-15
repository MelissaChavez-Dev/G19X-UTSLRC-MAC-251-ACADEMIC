import LevelBadge from "./LevelBadge";
import { CHECK_DOCS, QUALITY_LEVEL_FROM, QUALITY_WEIGHTS } from "../data/dataQualityRules";
import { levelColor } from "../utils/qualityLevel";

const STATUS = {
  ok: { label: "Correcto", color: "var(--success)", icon: "check_circle" },
  warn: { label: "Atención", color: "var(--warning)", icon: "error" },
  fail: { label: "Falla", color: "var(--error)", icon: "cancel" },
  info: { label: "Informativa", color: "var(--on-surface-variant)", icon: "info" },
};

const READINGS = {
  low: "Confiable: puedes apoyarte en estos datos para decidir.",
  controlled: "Aceptable: hay detalles por corregir, pero los KPIs son utilizables.",
  elevated: "Con reservas: revisa las verificaciones que fallan antes de presentar resultados.",
  critical: "No confiable: corrige los problemas antes de usar los KPIs.",
  "no-data": "Aún no hay respuestas para evaluar.",
};

const STEPS = [
  { icon: "speed", title: "Mira el puntaje", text: "Resume en un número de 0 a 100 qué tan confiables son los datos que alimentan el dashboard." },
  { icon: "fact_check", title: "Abre lo que falla", text: "Cada verificación explica qué revisa, por qué importa y cómo corregirlo, con ejemplos para buscar en Firestore." },
  { icon: "refresh", title: "Corrige y vuelve a evaluar", text: "Arregla el problema en su origen y pulsa «Volver a evaluar». Esta página solo lee: nunca cambia ni borra datos." },
];

function StatusChip({ status }) {
  const config = STATUS[status] ?? STATUS.info;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold text-on-surface"
      style={{ background: `color-mix(in srgb, ${config.color} 22%, transparent)` }}
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]" style={{ color: config.color }}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}

function ScoreRing({ score, color }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const hasScore = Number.isFinite(score);
  const value = hasScore ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-40 w-40 shrink-0"
      role="img"
      aria-label={hasScore ? `Puntaje de calidad: ${score} de 100` : "Sin puntaje de calidad"}
    >
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-container-high)" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        transform="rotate(-90 60 60)"
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
      <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--on-surface)">
        {hasScore ? score : "—"}
      </text>
    </svg>
  );
}

function CheckCard({ check }) {
  const docs = CHECK_DOCS[check.id];
  const informative = check.weight === 0;

  return (
    <details className="group rounded-[28px] bg-surface-container-low">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-space-sm px-space-lg py-space-md [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          chevron_right
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label-md font-semibold text-on-surface">{check.title}</span>
          <span className="block text-body-sm text-on-surface-variant">{check.summary}</span>
        </span>
        <span className="text-label-sm text-on-surface-variant">
          {informative ? "No suma al puntaje" : `${check.weight} pts`}
        </span>
        <StatusChip status={check.status} />
      </summary>

      <div className="flex flex-col gap-space-md px-space-lg pb-space-lg">
        <dl className="grid grid-cols-1 gap-space-md md:grid-cols-3">
          <div>
            <dt className="text-label-md font-semibold text-on-surface">Qué revisa</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">{docs.what}</dd>
          </div>
          <div>
            <dt className="text-label-md font-semibold text-on-surface">Por qué importa</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">{docs.why}</dd>
          </div>
          <div>
            <dt className="text-label-md font-semibold text-on-surface">Cómo corregirlo</dt>
            <dd className="mt-1 text-body-sm text-on-surface-variant">{docs.fix}</dd>
          </div>
        </dl>

        {(check.details.length > 0 || check.examples.length > 0) && (
          <div className="rounded-2xl bg-surface-container p-space-md">
            <p className="text-label-md font-semibold text-on-surface">Hallazgos</p>
            {check.details.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-body-sm text-on-surface-variant">
                {check.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
            {check.examples.length > 0 && (
              <p className="mt-2 text-label-sm text-on-surface-variant">
                Ejemplos para buscar en la colección <code>responses</code> (id del documento):{" "}
                {check.examples.map((id, index) => (
                  <span key={id}>
                    <code>{id}</code>
                    {index < check.examples.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
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
  const weightedChecks = result ? result.checks.filter((check) => check.weight > 0) : [];
  const informativeChecks = result ? result.checks.filter((check) => check.weight === 0) : [];

  return (
    <>
      {/* 1. Introducción */}
      <header className="flex flex-col gap-space-sm">
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">menu_book</span>
          Guía y estado de los datos
        </span>
        <h1 className="text-headline-xl text-on-surface">Calidad de los datos</h1>
        <p className="max-w-3xl text-body-md text-on-surface-variant">
          Esta página explica qué tan confiables son los números del dashboard y cómo leerlos. Revisa las respuestas
          guardadas de las encuestas con una lista fija de verificaciones y las resume en un puntaje. No modifica ni
          borra datos.
        </p>
      </header>

      <section aria-labelledby="dq-how" className="flex flex-col gap-space-sm">
        <h2 id="dq-how" className="text-headline-sm text-on-surface">Cómo usar esta página</h2>
        <ol className="grid grid-cols-1 gap-space-md md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-space-xs rounded-[28px] bg-surface-container-low p-space-lg">
              <span className="flex items-center gap-space-xs text-label-md font-semibold text-on-surface">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                </span>
                {index + 1}. {step.title}
              </span>
              <span className="text-body-sm text-on-surface-variant">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 2. Estado actual */}
      <section aria-labelledby="dq-status" className="flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <h2 id="dq-status" className="text-headline-sm text-on-surface">Estado actual</h2>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary px-space-md py-2 text-label-md text-on-primary disabled:opacity-60"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? "Evaluando..." : "Volver a evaluar"}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
            No se pudieron cargar las respuestas. Revisa tu conexión o los permisos de tu cuenta.
          </p>
        )}

        {loading && !result && (
          <div role="status" aria-label="Evaluando la calidad de los datos" className="animate-shimmer min-h-[12rem]" style={{ borderRadius: 32 }} />
        )}

        {result && (
          <div className="grid grid-cols-1 gap-space-md">
            <div className="flex flex-wrap items-center gap-space-lg rounded-[32px] bg-surface-container-low p-space-lg">
              <ScoreRing score={result.score} color={color} />
              <div className="flex min-w-0 flex-1 flex-col gap-space-xs">
                <span className="text-label-md text-on-surface-variant">Puntaje de calidad</span>
                <LevelBadge level={result.level} />
                <p className="text-body-sm text-on-surface">{READINGS[result.level.tone]}</p>
                <p className="text-label-sm text-on-surface-variant">
                  Se evaluaron {result.total} {result.total === 1 ? "respuesta reciente" : "respuestas recientes"} de los últimos 12 meses (máximo 5,000).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Verificaciones */}
      {result && result.checks.length > 0 && (
        <section aria-labelledby="dq-checks" className="flex flex-col gap-space-sm">
          <h2 id="dq-checks" className="text-headline-sm text-on-surface">Verificaciones</h2>
          <p className="text-body-sm text-on-surface-variant">Toca una para ver el manual y los hallazgos.</p>
          <div className="flex flex-col gap-space-sm">
            {weightedChecks.map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </div>
          {informativeChecks.length > 0 && (
            <>
              <h3 className="mt-space-sm text-label-md font-semibold text-on-surface">Informativas (no suman al puntaje)</h3>
              <div className="flex flex-col gap-space-sm">
                {informativeChecks.map((check) => (
                  <CheckCard key={check.id} check={check} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {result && result.checks.length === 0 && (
        <p role="status" className="rounded-2xl bg-surface-container-low px-space-md py-space-md text-body-md text-on-surface-variant">
          No hay respuestas recientes para evaluar en el último año.
        </p>
      )}

      {/* 4. Cómo se calcula */}
      <section aria-labelledby="dq-score" className="flex flex-col gap-space-sm">
        <h2 id="dq-score" className="text-headline-sm text-on-surface">Cómo se calcula el puntaje</h2>
        <p className="max-w-3xl text-body-sm text-on-surface-variant">
          Cada verificación obtiene un resultado de 0 a 1 y el puntaje es el promedio ponderado de las cinco que suman
          puntos. Los pesos y los niveles son valores iniciales propuestos, no un estándar oficial: se pueden ajustar con
          datos reales de la organización.
        </p>
        <div className="overflow-x-auto rounded-[28px] bg-surface-container-low">
          <table className="w-full text-left text-body-sm">
            <caption className="sr-only">Peso de cada verificación en el puntaje</caption>
            <thead>
              <tr className="text-label-md text-on-surface">
                <th scope="col" className="px-space-lg py-space-sm">Verificación</th>
                <th scope="col" className="px-space-lg py-space-sm">Peso</th>
              </tr>
            </thead>
            <tbody className="text-on-surface-variant">
              {Object.entries(QUALITY_WEIGHTS).map(([id, weight]) => (
                <tr key={id}>
                  <td className="px-space-lg py-2">{CHECK_DOCS[id].title}</td>
                  <td className="px-space-lg py-2">{weight} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-wrap gap-space-xs text-label-md text-on-surface">
          <li className="rounded-full bg-surface-container-low px-3 py-1">Bajo riesgo: {QUALITY_LEVEL_FROM.low} o más</li>
          <li className="rounded-full bg-surface-container-low px-3 py-1">Controlado: {QUALITY_LEVEL_FROM.controlled} a {QUALITY_LEVEL_FROM.low - 1}</li>
          <li className="rounded-full bg-surface-container-low px-3 py-1">Elevado: {QUALITY_LEVEL_FROM.elevated} a {QUALITY_LEVEL_FROM.controlled - 1}</li>
          <li className="rounded-full bg-surface-container-low px-3 py-1">Crítico: menos de {QUALITY_LEVEL_FROM.elevated}</li>
        </ul>
      </section>

      {/* 5. Alcance y límites */}
      <section aria-labelledby="dq-limits" className="flex flex-col gap-space-xs rounded-[28px] bg-surface-container-low p-space-lg">
        <h2 id="dq-limits" className="text-headline-sm text-on-surface">Qué no hace esta página</h2>
        <ul className="list-disc pl-5 text-body-sm text-on-surface-variant">
          <li>Revisa los datos después de guardados; no impide que entre una respuesta mal formada.</li>
          <li>Las respuestas no incluyen UID; aun así, el texto libre podría contener información que identifique a quien responde.</li>
          <li>No corrige nada por su cuenta: los arreglos se hacen en el Constructor de encuestas o en Firestore.</li>
        </ul>
      </section>
    </>
  );
}
