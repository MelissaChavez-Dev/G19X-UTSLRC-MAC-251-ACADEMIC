import { useState } from "react";

export default function MatrixWidget({
  matrixData = [], // [{ name: rowKey, col1: count, col2: count, ... }]
  rowLabel = "Categoría",
  alternatorOptions = null, // e.g. [{ id: "tenure", label: "Por Experiencia" }, { id: "age", label: "Por Edad" }]
  onAlternatorChange = null,
  activeAlternator = null,
}) {
  const [internalAlternator, setInternalAlternator] = useState(
    alternatorOptions ? alternatorOptions[0]?.id : null
  );

  const currentAlt = activeAlternator || internalAlternator;

  if (!matrixData || matrixData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos disponibles.
      </div>
    );
  }

  // Extract all column keys excluding "name"
  const colKeys = Array.from(
    new Set(matrixData.flatMap((row) => Object.keys(row).filter((k) => k !== "name")))
  ).sort();

  // Find max value for heat map opacity calculation
  const maxVal = Math.max(
    ...matrixData.flatMap((row) => colKeys.map((col) => Number(row[col]) || 0)),
    1
  );

  return (
    <div className="flex flex-col gap-2 w-full text-body-sm">
      {/* Optional Alternator Toggle */}
      {alternatorOptions && (
        <div className="flex justify-end gap-1">
          <div className="inline-flex rounded-lg bg-surface-container-low p-1 text-label-sm">
            {alternatorOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setInternalAlternator(opt.id);
                  onAlternatorChange?.(opt.id);
                }}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  currentAlt === opt.id
                    ? "bg-surface-container-lowest font-medium text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant/60 bg-surface-container-lowest">
        <table className="min-w-full text-left text-body-sm">
          <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
            <tr>
              <th className="px-3 py-2.5">{rowLabel}</th>
              {colKeys.map((col) => (
                <th key={col} className="px-3 py-2.5 text-center">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, idx) => (
              <tr key={row.name || idx} className="border-t border-outline-variant/40">
                <td className="px-3 py-2 font-medium text-on-surface">{row.name}</td>
                {colKeys.map((col) => {
                  const val = Number(row[col]) || 0;
                  const ratio = Math.min(1, val / maxVal);
                  return (
                    <td
                      key={col}
                      className="px-3 py-2 text-center text-on-surface"
                      style={{
                        backgroundColor: val > 0 ? `rgba(237, 196, 0, ${0.12 + ratio * 0.35})` : "transparent",
                      }}
                    >
                      {val.toLocaleString("es-MX")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
