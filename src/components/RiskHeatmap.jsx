import { getRiskColorClasses } from "../utils/riskColors";

/*
  Paleta monocromática azul en dos modos.
  Mismo criterio que las otras tarjetas: en oscuro los niveles se invierten.
  La tabla vive en un panel interno claro (en oscuro, hundido) para que los
  indicadores de riesgo conserven el fondo sobre el que fueron pensados y la
  figura decorativa nunca quede detrás de ellos.

                    claro      oscuro
  contenedor       #b9e6ec    #243E66
  figura (esquina) #a8d8eb    #1a3a68
  panel de tabla   #EAF3FD    #172C4B
  encabezado/línea #D6E6F8    #243E66
  texto            #123A63    #E3EEFB

  Los colores de indicadores (celdas, chips de nivel, puntos y leyenda) NO
  se tocaron: siguen viniendo de getRiskColorClasses, TIER_STYLES y TIER_DOT.
*/

const COLUMNS = [
  { key: "cognitiveLoad", label: "Carga Cognitiva", invert: false },
  { key: "roleAmbiguity", label: "Ambigüedad de Rol", invert: false },
  { key: "emotionalLabor", label: "Carga Emocional", invert: false },
  { key: "shiftFatigue", label: "Fatiga", invert: false },
  { key: "autonomy", label: "Autonomía", invert: true },
  { key: "psychSafety", label: "Seguridad Psicológica", invert: true },
];

const TIER_STYLES = {
  critical: "bg-error text-on-error",
  elevated: "bg-warning-container text-on-warning-container",
  controlled: "bg-tertiary-container text-on-tertiary-container",
  low: "bg-success-container text-on-success-container",
  "no-data": "bg-surface-container text-on-surface-variant",
};

const TIER_DOT = {
  critical: "bg-error",
  elevated: "bg-warning",
  controlled: "bg-tertiary",
  low: "bg-success",
  "no-data": "bg-outline-variant",
};

const INK = "text-[#123A63] dark:text-[#E3EEFB]";
const INK_SOFT = "text-[#123A63]/75 dark:text-[#E3EEFB]/75";

function LegendDot({ colorClass, label, bold }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${colorClass}`} />
      <span className={`${INK_SOFT} ${bold ? "font-semibold" : ""}`}>{label}</span>
    </div>
  );
}

export default function RiskHeatmap({ rows }) {
  return (
    <section
      aria-labelledby="risk-title"
      className="relative h-full overflow-hidden rounded-[40px] bg-[#b9e6ec] p-space-lg dark:bg-[#243E66]"
    >
      {/* Figura decorativa: círculo recortado por la esquina inferior derecha */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-25 -left-14 h-40 w-40 rounded-full bg-[#a8d8eb] dark:bg-[#1a3a68] sm:-bottom-16 sm:-right-16 sm:h-48 sm:w-48"
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm mb-space-md">
        <div>
          <h2 id="risk-title" className={`text-headline-md tracking-tight ${INK}`}>
            Matriz de Riesgo Psicosocial
          </h2>
          <p className={`text-body-sm ${INK_SOFT}`}>
            Correlación de dinámicas de carga laboral con marcadores tipo ISO 45003
          </p>
        </div>
        <div className="flex items-center gap-2 text-label-sm flex-wrap">
          <LegendDot colorClass="bg-success" label="1,0-1,9 Bajo" />
          <LegendDot colorClass="bg-tertiary" label="2,0-2,9 Moderado" />
          <LegendDot colorClass="bg-warning" label="3,0-3,9 Elevado" />
          <LegendDot colorClass="bg-error" label="4,0+ Crítico" bold />
        </div>
      </div>

      <div className="relative z-10 overflow-x-auto rounded-[28px] bg-[#EAF3FD] p-2 dark:bg-[#172C4B] sm:p-3">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`bg-[#D6E6F8] text-label-md dark:bg-[#243E66] ${INK_SOFT}`}>
              <th className="py-3 px-space-md rounded-l-lg">Departamento</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="py-3 px-2 text-center">{col.label}</th>
              ))}
              <th className="py-3 px-space-md text-right rounded-r-lg">Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E6F8] text-body-sm dark:divide-[#243E66]">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-[#D6E6F8]/50 dark:hover:bg-[#243E66]/60"
              >
                <td className={`py-3.5 px-space-md font-semibold ${INK}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${TIER_DOT[row.tier.tone]}`} />
                    {row.name}
                  </div>
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className="py-3 px-2 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded font-mono ${getRiskColorClasses(
                        row.factors[col.key] || 0,
                        col.invert
                      )}`}
                    >
                      {Number.isFinite(row.factors[col.key]) ? row.factors[col.key].toFixed(1) : "–"}
                    </span>
                  </td>
                ))}
                <td className="py-3 px-space-md text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-bold tracking-wide shadow-sm ${TIER_STYLES[row.tier.tone]}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[row.tier.tone]}`} />
                    {row.tier.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}