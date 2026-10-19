import { KPI_THRESHOLDS, MIN_SAMPLE } from "../data/kpiThresholds";

const COLUMNS = [
  { key: "cognitiveLoad", label: "Carga mental", invert: false },
  { key: "roleAmbiguity", label: "Claridad del rol", invert: true },
  { key: "emotionalLabor", label: "Exigencia emocional", invert: false },
  { key: "shiftFatigue", label: "Cansancio al finalizar la jornada", invert: false },
  { key: "autonomy", label: "Autonomía", invert: true },
  { key: "psychSafety", label: "Seguridad psicológica", invert: true },
  {
    key: "workLifeBalance",
    label: "Balance vida-trabajo",
    neutral: true,
    normalizedScale: true,
  },
];

const BANDS = {
  low: { label: "Adecuado", bg: "var(--heatmap-low-bg)", fg: "var(--heatmap-low-fg)", dot: "var(--heatmap-low-dot)" },
  controlled: { label: "Vigilar", bg: "var(--heatmap-controlled-bg)", fg: "var(--heatmap-controlled-fg)", dot: "var(--heatmap-controlled-dot)" },
  elevated: { label: "Alto", bg: "var(--heatmap-elevated-bg)", fg: "var(--heatmap-elevated-fg)", dot: "var(--heatmap-elevated-dot)" },
  critical: { label: "Prioritario", bg: "var(--heatmap-critical-bg)", fg: "var(--heatmap-critical-fg)", dot: "var(--heatmap-critical-dot)" },
};

const NO_DATA_BG = "color-mix(in srgb, var(--on-surface-variant) 10%, transparent)";
const INK = "text-on-secondary-container";
const INK_SOFT = "text-on-secondary-container";
const T = KPI_THRESHOLDS.psychosocialRisk.from;

const fmt = (n) => Number(n).toFixed(1).replace(".", ",");

function bandForValue(value, invert) {
  const risk = invert ? 6 - value : value;
  if (risk < T.controlled) return BANDS.low;
  if (risk < T.elevated) return BANDS.controlled;
  if (risk < T.critical) return BANDS.elevated;
  return BANDS.critical;
}

function LegendItem({ band, range }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: band.dot }} />
      <span className={`${INK_SOFT} text-sm leading-snug`}>
        <span className="font-semibold">{band.label}</span>
        <span className="ml-1 opacity-80">{range}</span>
      </span>
    </div>
  );
}

export default function RiskHeatmap({ rows = [] }) {
  return (
    <section
      aria-labelledby="risk-title"
      className="relative min-w-0 overflow-hidden rounded-[32px] bg-secondary-container p-space-lg"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-secondary/10"
      />

      <div className="relative z-10 mb-space-md flex flex-col gap-space-md">
        <div className="min-w-0">
          <p className={`mb-2 text-label-sm font-bold uppercase tracking-[0.12em] ${INK_SOFT}`}>
            Vista general
          </p>
          <h2 id="risk-title" className={`text-headline-md ${INK}`}>
            Factores del entorno laboral
          </h2>
          <p className={`mt-1 max-w-2xl text-body-sm leading-relaxed ${INK_SOFT}`}>
            Comparación de las condiciones reportadas por cada departamento. Los resultados son orientativos y no constituyen una evaluación de conformidad con ISO 45003.
          </p>
        </div>

        <div
          aria-label="Leyenda de niveles de atención"
          className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl bg-surface-container-lowest/80 p-4 sm:grid-cols-2 2xl:grid-cols-4"
        >
          <LegendItem band={BANDS.low} range={`< ${fmt(T.controlled)}`} />
          <LegendItem band={BANDS.controlled} range={`${fmt(T.controlled)}–${fmt(T.elevated - 0.1)}`} />
          <LegendItem band={BANDS.elevated} range={`${fmt(T.elevated)}–${fmt(T.critical - 0.1)}`} />
          <LegendItem band={BANDS.critical} range={`≥ ${fmt(T.critical)}`} />
        </div>
      </div>

      <div
        tabIndex={0}
        aria-label="Matriz de riesgo; desplázate horizontalmente para ver todas las columnas"
        className="relative z-10 overflow-x-auto rounded-[24px] bg-surface-container-lowest p-2 sm:p-3"
      >
        <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "20%" }} />
            {COLUMNS.map((col) => (
              <col key={col.key} style={{ width: "9%" }} />
            ))}
            <col style={{ width: "17%" }} />
          </colgroup>

          <thead>
            <tr className={`bg-surface-container-low text-label-md ${INK_SOFT}`}>
              <th className="rounded-l-lg px-space-md py-3 font-semibold">Departamento</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-1 py-3 text-center text-[13px] font-semibold leading-normal"
                  title={
                    col.invert
                      ? `${col.label}: una puntuación alta es favorable`
                      : col.normalizedScale
                        ? "Balance vida-trabajo normalizado a escala de 1 a 5; se muestra como referencia"
                        : col.label
                  }
                >
                  <span className="inline-block whitespace-normal break-normal [overflow-wrap:normal]">
                    {col.label}
                  </span>
                </th>
              ))}
              <th className="rounded-r-lg px-space-md py-3 text-right text-[13px] font-semibold leading-normal">Atención</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-container-high text-body-sm">
            {rows.map((row) => {
              const tierBand = BANDS[row.tier?.tone] ?? null;

              return (
                <tr key={row.id} className="transition-colors hover:bg-surface-container-low/70">
                  <td className={`px-space-md py-3.5 font-semibold ${INK}`}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: tierBand ? tierBand.dot : "var(--outline-variant)" }}
                      />
                      <span className="min-w-0 whitespace-normal break-normal [overflow-wrap:normal]">{row.name}</span>
                    </span>
                  </td>

                  {COLUMNS.map((col) => {
                    const isBalance = col.key === "workLifeBalance";
                    const value = isBalance ? row.workLifeBalanceFivePoint : row.factors?.[col.key];
                    const hasEnoughSample = isBalance
                      ? row.sampleSize >= MIN_SAMPLE.responses
                      : row.psychosocialSampleSize >= MIN_SAMPLE.responses;
                    const hasValue = Number.isFinite(value);
                    // Balance vida-trabajo también recibe color, usando la escala invertida:
                    // una puntuación alta indica mejor balance y, por tanto, menor riesgo.
                    const colored = hasEnoughSample && hasValue;
                    const band = colored ? bandForValue(value, col.invert || isBalance) : null;

                    return (
                      <td key={col.key} className="px-1 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[2.6rem] items-center justify-center rounded-lg px-2.5 py-1 font-mono text-[14px] font-semibold tabular-nums ${
                            band ? "font-bold" : "bg-surface-container text-on-surface-variant"
                          }`}
                          style={band ? { background: band.bg, color: band.fg } : undefined}
                          title={
                            !hasValue
                              ? "Sin datos disponibles"
                              : band
                                ? `${col.label}: ${fmt(value)} · ${band.label}`
                                : `Muestra insuficiente: se necesitan al menos ${MIN_SAMPLE.responses} respuestas`
                          }
                        >
                          {hasValue ? fmt(value) : "—"}
                        </span>
                      </td>
                    );
                  })}

                  <td className="px-space-md py-3 text-right">
                    <span
                      className="inline-flex max-w-full items-center justify-end gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-bold leading-normal"
                      style={
                        tierBand
                          ? { background: tierBand.bg, color: tierBand.fg }
                          : { background: NO_DATA_BG, color: "var(--on-surface-variant)" }
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: tierBand ? tierBand.dot : "var(--outline-variant)" }}
                      />
                      <span className="whitespace-normal text-right">{tierBand?.label ?? "Sin datos"}</span>
                    </span>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-4 py-10 text-center text-body-sm text-on-surface-variant">
                  Aún no hay datos suficientes para mostrar la comparación.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={`relative z-10 mt-3 text-body-sm leading-relaxed ${INK_SOFT}`}>
        Los colores indican el nivel de atención estimado. Las celdas sin color pueden corresponder a una muestra insuficiente o a datos no disponibles.
      </p>
    </section>
  );
}
