import { getRiskColorClasses } from "../utils/riskColors";

const COLUMNS = [
  { key: "cognitiveLoad", label: "Carga Cognitiva", invert: false },
  { key: "roleAmbiguity", label: "Ambigüedad de Rol", invert: false },
  { key: "emotionalLabor", label: "Carga Emocional", invert: false },
  { key: "shiftFatigue", label: "Fatiga", invert: false },
  { key: "autonomy", label: "Autonomía", invert: true },
  { key: "psychSafety", label: "Seguridad Psicológica", invert: true },
];

const TIER_STYLES = {
  critical: "bg-red-700 text-white",
  elevated: "bg-orange-300 text-orange-950",
  controlled: "bg-amber-100 text-amber-950",
  low: "bg-emerald-100 text-emerald-950",
};

const TIER_DOT = {
  critical: "bg-red-700",
  elevated: "bg-orange-500",
  controlled: "bg-amber-500",
  low: "bg-emerald-500",
};

function LegendDot({ colorClass, label, bold }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${colorClass}`} />
      <span className={`text-on-surface-variant ${bold ? "font-semibold" : ""}`}>{label}</span>
    </div>
  );
}

export default function RiskHeatmap({ rows }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm mb-space-md">
        <div>
          <h2 className="text-headline-md text-on-surface tracking-tight">
            Matriz de Riesgo Psicosocial
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Correlación de dinámicas de carga laboral con marcadores tipo ISO 45003
          </p>
        </div>
        <div className="flex items-center gap-2 text-label-sm flex-wrap">
          <LegendDot colorClass="bg-emerald-500" label="1,0-1,9 Bajo" />
          <LegendDot colorClass="bg-amber-500" label="2,0-2,9 Moderado" />
          <LegendDot colorClass="bg-orange-500" label="3,0-3,9 Elevado" />
          <LegendDot colorClass="bg-red-700" label="4,0+ Crítico" bold />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant text-label-md">
              <th className="py-3 px-space-md rounded-l-lg">Departamento</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="py-3 px-2 text-center">{col.label}</th>
              ))}
              <th className="py-3 px-space-md text-right rounded-r-lg">Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-low text-body-sm">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-3.5 px-space-md font-semibold text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${TIER_DOT[row.tier.tone]}`} />
                    {row.name}
                    <span className="text-label-sm text-on-surface-variant font-normal">
                      ({row.headcount} personas)
                    </span>
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
                      {row.factors[col.key]?.toFixed(1) ?? "–"}
                    </span>
                  </td>
                ))}
                <td className="py-3 px-space-md text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-bold ${TIER_STYLES[row.tier.tone]}`}
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
    </div>
  );
}