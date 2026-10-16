import { KPI_THRESHOLDS, MIN_SAMPLE } from "../data/kpiThresholds";

const COLUMNS = [
  { key: "cognitiveLoad", label: "Carga Cognitiva", invert: false },
  { key: "roleAmbiguity", label: "Ambigüedad de Rol", invert: false },
  { key: "emotionalLabor", label: "Carga Emocional", invert: false },
  { key: "shiftFatigue", label: "Fatiga", invert: false },
  { key: "autonomy", label: "Autonomía", invert: true },
  { key: "psychSafety", label: "Seguridad Psicológica", invert: true },
  { key: "workLifeBalance", label: "Balance vida-trabajo", neutral: true },
];

/* ------------------------------------------------------------------
   Paleta de riesgo. Colores fijos (no dependen de los tokens del tema,
   donde "warning" y "error" no se leían como alerta). Cálidos y vivos
   para que resalten sobre el verde salvia sin pelearse con él.
   Las llaves coinciden con row.tier.tone.
------------------------------------------------------------------- */
const BANDS = {
  low: { label: "Bajo", bg: "#1F8A5B", fg: "#FFFFFF" },
  controlled: { label: "Moderado", bg: "#F5C542", fg: "#3B2F00" },
  elevated: { label: "Elevado", bg: "#F28C38", fg: "#3A1C00" },
  critical: { label: "Crítico", bg: "#D64550", fg: "#FFFFFF" },
};

const NO_DATA_BG = "color-mix(in srgb, var(--on-surface-variant) 14%, transparent)";

const INK = "text-on-secondary-container";
const INK_SOFT = "text-on-secondary-container/75";
const T = KPI_THRESHOLDS.psychosocialRisk.from;

const fmt = (n) => n.toFixed(1).replace(".", ",");

/* Mismos cortes que la leyenda; los factores "más alto = mejor" se invierten (escala 1–5). */
function bandForValue(value, invert) {
  const risk = invert ? 6 - value : value;
  if (risk < T.controlled) return BANDS.low;
  if (risk < T.elevated) return BANDS.controlled;
  if (risk < T.critical) return BANDS.elevated;
  return BANDS.critical;
}

function LegendDot({ band, range, bold }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full ring-2 ring-white/50"
        style={{ background: band.bg }}
      />
      <span className={`${INK_SOFT} ${bold ? "font-semibold" : ""}`}>
        {range} {band.label}
      </span>
    </div>
  );
}

export default function RiskHeatmap({ rows = [] }) {
  return (
    <section
      aria-labelledby="risk-title"
      className="relative min-w-0 overflow-hidden rounded-[40px] bg-secondary-container p-space-lg"
    >
      {/* Figura decorativa: círculo recortado por la esquina inferior derecha */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-25 -left-14 h-40 w-40 rounded-full bg-secondary/15 sm:-bottom-16 sm:-right-16 sm:h-48 sm:w-48"
      />

      <div className="relative z-10 mb-space-md flex flex-col justify-between gap-space-sm lg:flex-row lg:items-center">
        <div>
          <h2 id="risk-title" className={`text-headline-md tracking-tight ${INK}`}>
            Matriz de Riesgo Psicosocial
          </h2>
          <p className={`text-body-sm ${INK_SOFT}`}>
            Factores inspirados en ISO 45003; son indicadores orientativos, no una evaluación de conformidad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm">
          <LegendDot band={BANDS.low} range={`${fmt(1)}–${fmt(T.controlled - 0.1)}`} />
          <LegendDot band={BANDS.controlled} range={`${fmt(T.controlled)}–${fmt(T.elevated - 0.1)}`} />
          <LegendDot band={BANDS.elevated} range={`${fmt(T.elevated)}–${fmt(T.critical - 0.1)}`} />
          <LegendDot band={BANDS.critical} range={`${fmt(T.critical)}+`} bold />
        </div>
      </div>

      {/* Sin overflow-x: table-fixed reparte el ancho y todo cabe en el panel */}
      <div className="relative z-10 rounded-[28px] bg-surface-container-lowest p-2 sm:p-3">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "18%" }} />
            {COLUMNS.map((col) => (
              <col key={col.key} style={{ width: "9.5%" }} />
            ))}
            <col style={{ width: "15.5%" }} />
          </colgroup>

          <thead>
            <tr className={`bg-surface-container-low text-label-md ${INK_SOFT}`}>
              <th className="rounded-l-lg px-space-md py-3">Departamento</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-1 py-3 text-center text-[11px] leading-tight [overflow-wrap:anywhere]"
                  title={
                    col.invert
                      ? `${col.label} (más alto = menos riesgo)`
                      : col.neutral
                        ? `${col.label} (referencia, sin nivel de riesgo)`
                        : col.label
                  }
                >
                  {col.label}
                </th>
              ))}
              <th className="rounded-r-lg px-space-md py-3 text-right text-[11px] leading-tight">
                Nivel de Riesgo
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-container-high text-body-sm">
            {rows.map((row) => {
              const tierBand = BANDS[row.tier?.tone] ?? null;

              return (
                <tr key={row.id} className="transition-colors hover:bg-surface-container-high/50">
                  <td className={`px-space-md py-3.5 font-semibold ${INK}`}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: tierBand ? tierBand.bg : "var(--outline-variant)" }}
                      />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{row.name}</span>
                    </span>
                  </td>

                  {COLUMNS.map((col) => {
                    const value =
                      col.key === "workLifeBalance" ? row.workLifeBalance : row.factors?.[col.key];
                    const hasEnoughSample =
                      col.key === "workLifeBalance"
                        ? row.sampleSize >= MIN_SAMPLE.responses
                        : row.psychosocialSampleSize >= MIN_SAMPLE.responses;
                    const hasValue = Number.isFinite(value);
                    const colored = !col.neutral && hasEnoughSample && hasValue;
                    const band = colored ? bandForValue(value, col.invert) : null;

                    return (
                      <td key={col.key} className="px-1 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[2.6rem] items-center justify-center rounded-full px-2.5 py-1 font-mono text-[13px] tabular-nums ${
                            band
                              ? "font-bold shadow-sm"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                          style={band ? { background: band.bg, color: band.fg } : undefined}
                          title={
                            !hasValue
                              ? "Sin datos"
                              : band
                                ? `${col.label}: ${value.toFixed(1)} · ${band.label}`
                                : !hasEnoughSample
                                  ? "Muestra insuficiente"
                                  : "Referencia, sin nivel de riesgo"
                          }
                        >
                          {hasValue ? value.toFixed(1) : "–"}
                        </span>
                      </td>
                    );
                  })}

                  <td className="px-space-md py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        tierBand ? "shadow-sm" : "text-on-surface-variant"
                      }`}
                      style={
                        tierBand
                          ? { background: tierBand.bg, color: tierBand.fg }
                          : { background: NO_DATA_BG }
                      }
                    >
                      {tierBand && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: tierBand.fg }}
                        />
                      )}
                      {row.tier?.label ?? "Sin datos"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}