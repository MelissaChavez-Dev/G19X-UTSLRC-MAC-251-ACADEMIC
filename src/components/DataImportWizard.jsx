import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { INITIAL_METRICS, MAX_IMPORT_ROWS, SMALL_COHORT_THRESHOLD } from "../data/metricsCatalog";
import { useAuth } from "../hooks/useAuth";
import { saveDataImport } from "../services/dataHubService";
import { applyImportTransforms, readSpreadsheet, validateImportRows } from "../utils/dataImport";

const METRIC_FIELDS = [
  { id: "participationRate", label: "Participación en pulsos" },
  { id: "psychSafety", label: "Seguridad psicológica" },
  { id: "attritionRisk", label: "Índice de presión laboral" },
];
const MAX_DERIVED_COLUMNS = 20;

const INPUT_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function guessColumn(columns, pattern) {
  return columns.find((column) => pattern.test(column.label))?.id || "";
}

export default function DataImportWizard({ metrics, onClose, onImported }) {
  const { user } = useAuth();
  const [parsedFile, setParsedFile] = useState(null);
  const [columnLabels, setColumnLabels] = useState({});
  const [excludedColumns, setExcludedColumns] = useState([]);
  const [scaleTransforms, setScaleTransforms] = useState({});
  const [derivedColumns, setDerivedColumns] = useState([]);
  const [derivedForm, setDerivedForm] = useState({
    name: "",
    leftColumn: "",
    rightColumn: "",
    operation: "multiply",
  });
  const [transformError, setTransformError] = useState("");
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState({
    dateColumn: "",
    departmentColumn: "",
    metricColumns: Object.fromEntries(METRIC_FIELDS.map(({ id }) => [id, ""])),
  });
  const [phase, setPhase] = useState("select");
  const [fileError, setFileError] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const catalog = metrics.length ? metrics : INITIAL_METRICS;

  const transformedFile = useMemo(() => {
    if (!parsedFile) return null;
    return applyImportTransforms(parsedFile, { columnLabels, scaleTransforms, derivedColumns });
  }, [parsedFile, columnLabels, scaleTransforms, derivedColumns]);

  const validation = useMemo(() => {
    if (!transformedFile) return null;
    return validateImportRows(transformedFile.rows, mapping, catalog);
  }, [transformedFile, mapping, catalog]);

  const usedColumns = [
    mapping.dateColumn,
    mapping.departmentColumn,
    ...Object.values(mapping.metricColumns),
  ].filter(Boolean);

  const transformationAudit = useMemo(() => {
    if (!parsedFile) return [];
    const transforms = [{ type: "trim_whitespace" }];
    Object.entries(scaleTransforms).forEach(([columnId, transform]) => {
      const scale = transform.scale === "" ? 1 : Number(transform.scale);
      const offset = transform.offset === "" ? 0 : Number(transform.offset);
      if (scale !== 1 || offset !== 0) {
        transforms.push({
          type: "scale_offset",
          column: parsedFile.columns.find((column) => column.id === columnId)?.label || columnId,
          scale,
          offset,
        });
      }
    });
    parsedFile.columns.forEach((column) => {
      const name = columnLabels[column.id]?.trim();
      if (name && name !== column.label) {
        transforms.push({ type: "rename", column: column.label, name });
      }
      if (excludedColumns.includes(column.id)) {
        transforms.push({ type: "exclude", column: column.label });
      }
    });
    derivedColumns.forEach((column) => {
      const findLabel = (id) =>
        parsedFile.columns.find((item) => item.id === id)?.label ||
        derivedColumns.find((item) => item.id === id)?.name ||
        id;
      const left = findLabel(column.leftColumn);
      const right = findLabel(column.rightColumn);
      transforms.push({
        type: "derived",
        name: column.name,
        operation: column.operation,
        sources: [left, right],
      });
    });
    return transforms;
  }, [parsedFile, scaleTransforms, columnLabels, excludedColumns, derivedColumns]);
  const invalidScaleTransform = Object.values(scaleTransforms).some((transform) =>
    [transform.scale, transform.offset].some((value) => value !== "" && !Number.isFinite(Number(value)))
  );

  async function handleFile(file) {
    setFileError("");
    setImportError("");
    setParsedFile(null);
    setColumnLabels({});
    setExcludedColumns([]);
    setScaleTransforms({});
    setDerivedColumns([]);
    setDerivedForm({ name: "", leftColumn: "", rightColumn: "", operation: "multiply" });
    setTransformError("");
    setPhase("select");
    setFileName(file?.name || "");
    try {
      const parsed = await readSpreadsheet(file, XLSX);
      setParsedFile(parsed);
      setColumnLabels(Object.fromEntries(parsed.columns.map((column) => [column.id, column.label])));
      setDerivedForm({
        name: "",
        leftColumn: parsed.columns[0]?.id || "",
        rightColumn: parsed.columns[1]?.id || parsed.columns[0]?.id || "",
        operation: "multiply",
      });
      setMapping({
        dateColumn: guessColumn(parsed.columns, /fecha|date/i),
        departmentColumn: guessColumn(parsed.columns, /departamento|department|área|area/i),
        metricColumns: {
          participationRate: guessColumn(parsed.columns, /participación|participacion|participation|respuesta/i),
          psychSafety: guessColumn(parsed.columns, /seguridad psicológica|seguridad psicologica|psych.?safety/i),
          attritionRisk: guessColumn(parsed.columns, /presión laboral|presion laboral|attrition|riesgo/i),
        },
      });
      setPhase("map");
    } catch (error) {
      setFileError(error.message);
      setFileName("");
    }
  }

  function toggleExcludedColumn(columnId, shouldExclude) {
    setExcludedColumns((current) => shouldExclude
      ? [...new Set([...current, columnId])]
      : current.filter((id) => id !== columnId));
    if (shouldExclude) {
      const removedIds = new Set([columnId]);
      let foundDependency = true;
      while (foundDependency) {
        foundDependency = false;
        derivedColumns.forEach((derived) => {
          if (
            !removedIds.has(derived.id) &&
            (removedIds.has(derived.leftColumn) || removedIds.has(derived.rightColumn))
          ) {
            removedIds.add(derived.id);
            foundDependency = true;
          }
        });
      }
      setDerivedColumns((current) => current.filter((derived) => !removedIds.has(derived.id)));
      setMapping((current) => ({
        dateColumn: removedIds.has(current.dateColumn) ? "" : current.dateColumn,
        departmentColumn: removedIds.has(current.departmentColumn) ? "" : current.departmentColumn,
        metricColumns: Object.fromEntries(
          Object.entries(current.metricColumns).map(([metricId, value]) => [
            metricId,
            removedIds.has(value) ? "" : value,
          ])
        ),
      }));
    }
  }

  function addDerivedColumn() {
    const name = derivedForm.name.trim();
    if (!name || name.length > 60 || !derivedForm.leftColumn || !derivedForm.rightColumn) {
      setTransformError("Indica un nombre y selecciona dos columnas para crear el campo.");
      return;
    }
    if (derivedColumns.length >= MAX_DERIVED_COLUMNS) {
      setTransformError(`Puedes crear hasta ${MAX_DERIVED_COLUMNS} columnas derivadas.`);
      return;
    }
    if (derivedForm.leftColumn === derivedForm.rightColumn) {
      setTransformError("Selecciona dos columnas diferentes para el cálculo.");
      return;
    }
    if (transformedFile.columns.some((column) => column.label.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setTransformError("Ese nombre ya existe. Usa un nombre distinto para el campo derivado.");
      return;
    }
    setTransformError("");
    setDerivedColumns((current) => [
      ...current,
      {
        id: `derived_${globalThis.crypto?.randomUUID?.() || Date.now()}`,
        name,
        leftColumn: derivedForm.leftColumn,
        rightColumn: derivedForm.rightColumn,
        operation: derivedForm.operation,
      },
    ]);
    setDerivedForm((current) => ({ ...current, name: "" }));
  }

  function removeDerivedColumn(columnId) {
    const removedIds = new Set([columnId]);
    let foundDependency = true;
    while (foundDependency) {
      foundDependency = false;
      derivedColumns.forEach((derived) => {
        if (
          !removedIds.has(derived.id) &&
          (removedIds.has(derived.leftColumn) || removedIds.has(derived.rightColumn))
        ) {
          removedIds.add(derived.id);
          foundDependency = true;
        }
      });
    }
    setDerivedColumns((current) => current.filter((column) => !removedIds.has(column.id)));
    setMapping((current) => ({
      ...current,
      dateColumn: removedIds.has(current.dateColumn) ? "" : current.dateColumn,
      departmentColumn: removedIds.has(current.departmentColumn) ? "" : current.departmentColumn,
      metricColumns: Object.fromEntries(
        Object.entries(current.metricColumns).map(([metricId, value]) => [
          metricId,
          removedIds.has(value) ? "" : value,
        ])
      ),
    }));
  }

  function renderColumnSelect(id, label, value, onChange, excluded = []) {
    return (
      <label className="flex min-w-52 flex-1 flex-col gap-space-xs text-label-md text-on-surface" htmlFor={id}>
        {label}
        <select
          id={id}
          className={INPUT_CLASS}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecciona una columna</option>
          {transformedFile.columns.map((column) => (
            <option key={column.id} value={column.id} disabled={excluded.includes(column.id) && column.id !== value}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  async function handleImport() {
    if (!validation || validation.mappingErrors.length || validation.records.length === 0) return;
    if (invalidScaleTransform) {
      setImportError("Revisa los factores de escala y ajuste: deben ser números finitos.");
      return;
    }
    if (transformationAudit.length > 500) {
      setImportError("Hay más de 500 transformaciones auditables. Reduce los cambios antes de guardar.");
      return;
    }
    if (!user?.uid) {
      setImportError("No se pudo identificar tu cuenta. Actualiza la sesión e inténtalo de nuevo.");
      return;
    }

    setImportError("");
    setImporting(true);
    setProgress({ current: 0, total: validation.records.length });
    try {
      const importId = await saveDataImport({
        fileName,
        records: validation.records,
        rejectedRows: validation.issues.length,
        inputRows: validation.totalRows,
        smallCohortGroups: validation.smallCohortGroups,
        transformations: transformationAudit,
        createdBy: user.uid,
        onProgress: (current, total) => setProgress({ current, total }),
      });
      onImported(importId, {
        acceptedRows: validation.records.length,
        rejectedRows: validation.issues.length,
      });
    } catch (error) {
      setImportError(`No se pudo completar la importación. ${error.message}`);
    } finally {
      setImporting(false);
    }
  }

  const canReview = validation &&
    validation.mappingErrors.length === 0 &&
    validation.records.length > 0 &&
    !invalidScaleTransform &&
    transformationAudit.length <= 500;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-import-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
      >
        <header className="flex items-start justify-between gap-space-md border-b border-outline-variant/50 px-space-lg py-space-md">
          <div>
            <h2 id="data-import-title" className="text-headline-md text-on-surface">Conectar un archivo</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              CSV o Excel (.xlsx), hasta 10 MB y {MAX_IMPORT_ROWS.toLocaleString("es")} filas. El archivo se procesa aquí y no se conserva.
            </p>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            aria-label="Cerrar asistente de importación"
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-space-md overflow-y-auto p-space-lg">
          {fileError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{fileError}</p>}
          {importError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{importError}</p>}

          {phase === "select" && (
            <label
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-space-sm rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low p-space-lg text-center hover:border-primary"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <span className="material-symbols-outlined text-[36px] text-primary" aria-hidden="true">upload_file</span>
              <span className="text-label-lg text-on-surface">Suelta un archivo aquí o selecciónalo</span>
              <span className="text-body-sm text-on-surface-variant">Solo se guardarán fecha, departamento y métricas mapeadas.</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          )}

          {phase === "map" && parsedFile && transformedFile && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <p className="text-label-md text-on-surface">
                  {fileName} · hoja «{parsedFile.sheetName}» · {parsedFile.rows.length} filas
                </p>
                <button
                  type="button"
                  onClick={() => { setParsedFile(null); setPhase("select"); }}
                  className="text-label-md text-primary underline"
                >
                  Elegir otro archivo
                </button>
              </div>

              <details className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-space-md">
                <summary className="cursor-pointer text-label-md text-on-surface">Explorador y transformaciones · {parsedFile.columns.length} columnas</summary>
                <p className="mt-space-xs text-body-sm text-on-surface-variant">
                  Los espacios exteriores se limpian automáticamente. Los campos no mapeados se excluyen del análisis.
                </p>
                <div className="mt-space-sm max-h-72 space-y-2 overflow-auto">
                  {parsedFile.columns.map((column) => {
                    const transform = scaleTransforms[column.id] || { scale: "", offset: "" };
                    return (
                      <div key={column.id} className="grid gap-space-xs rounded-lg bg-surface-container-lowest p-space-sm sm:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto_auto_auto] sm:items-center">
                        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                          Nombre visible
                          <input
                            className={INPUT_CLASS}
                            value={columnLabels[column.id] ?? column.label}
                            maxLength={80}
                            onChange={(event) => setColumnLabels((current) => ({ ...current, [column.id]: event.target.value }))}
                            aria-label={`Renombrar columna ${column.label}`}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                          <input
                            type="checkbox"
                            checked={excludedColumns.includes(column.id)}
                            onChange={(event) => toggleExcludedColumn(column.id, event.target.checked)}
                          />
                          Excluir
                        </label>
                        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                          Escala ×
                          <input
                            type="number"
                            step="any"
                            className={INPUT_CLASS}
                            value={transform.scale}
                            onChange={(event) => setScaleTransforms((current) => ({
                              ...current,
                              [column.id]: { ...transform, scale: event.target.value },
                            }))}
                            aria-label={`Factor de escala para ${column.label}`}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                          Ajuste +
                          <input
                            type="number"
                            step="any"
                            className={INPUT_CLASS}
                            value={transform.offset}
                            onChange={(event) => setScaleTransforms((current) => ({
                              ...current,
                              [column.id]: { ...transform, offset: event.target.value },
                            }))}
                            aria-label={`Ajuste numérico para ${column.label}`}
                          />
                        </label>
                        <span className="text-label-sm text-on-surface-variant">
                          {usedColumns.includes(column.id) ? "Mapeada" : "No mapeada"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-space-md rounded-xl bg-surface-container-lowest p-space-md">
                  <h3 className="text-label-md text-on-surface">Crear columna derivada ({derivedColumns.length}/{MAX_DERIVED_COLUMNS})</h3>
                  <div className="mt-space-sm grid gap-space-sm sm:grid-cols-2">
                    <input
                      className={INPUT_CLASS}
                      value={derivedForm.name}
                      maxLength={60}
                      onChange={(event) => setDerivedForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Nombre del campo"
                      aria-label="Nombre de la columna derivada"
                    />
                    <select
                      className={INPUT_CLASS}
                      value={derivedForm.operation}
                      onChange={(event) => setDerivedForm((current) => ({ ...current, operation: event.target.value }))}
                      aria-label="Operación de columna derivada"
                    >
                      <option value="multiply">Multiplicar</option>
                      <option value="divide">Dividir</option>
                      <option value="add">Sumar</option>
                      <option value="subtract">Restar</option>
                    </select>
                    {[["leftColumn", "Primera columna"], ["rightColumn", "Segunda columna"]].map(([field, label]) => (
                      <label key={field} className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
                        {label}
                        <select
                          className={INPUT_CLASS}
                          value={derivedForm[field]}
                          onChange={(event) => setDerivedForm((current) => ({ ...current, [field]: event.target.value }))}
                        >
                          {transformedFile.columns
                            .filter((column) => !excludedColumns.includes(column.id))
                            .map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  {transformError && <p role="alert" className="mt-space-sm text-body-sm text-error">{transformError}</p>}
                  <button type="button" onClick={addDerivedColumn} className="mt-space-sm rounded-full border border-outline-variant px-space-md py-2 text-label-sm text-primary hover:bg-surface-container">
                    Añadir campo calculado
                  </button>
                  {derivedColumns.length > 0 && (
                    <ul className="mt-space-sm space-y-1 text-body-sm text-on-surface-variant">
                      {derivedColumns.map((column) => (
                        <li key={column.id} className="flex items-center justify-between gap-2">
                          <span>{column.name} · campo disponible para mapear</span>
                          <button type="button" onClick={() => removeDerivedColumn(column.id)} className="text-error" aria-label={`Quitar columna derivada ${column.name}`}>Quitar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              <div className="flex flex-wrap gap-space-md">
                {renderColumnSelect(
                  "map-date",
                  "Fecha",
                  mapping.dateColumn,
                  (dateColumn) => setMapping((current) => ({ ...current, dateColumn })),
                  [...usedColumns.filter((column) => column !== mapping.dateColumn), ...excludedColumns]
                )}
                {renderColumnSelect(
                  "map-department",
                  "Departamento",
                  mapping.departmentColumn,
                  (departmentColumn) => setMapping((current) => ({ ...current, departmentColumn })),
                  [...usedColumns.filter((column) => column !== mapping.departmentColumn), ...excludedColumns]
                )}
                {METRIC_FIELDS.map((metric) => (
                  <div key={metric.id} className="flex min-w-52 flex-1">
                    {renderColumnSelect(
                      `map-${metric.id}`,
                      metric.label,
                      mapping.metricColumns[metric.id],
                      (columnId) => setMapping((current) => ({
                        ...current,
                        metricColumns: { ...current.metricColumns, [metric.id]: columnId },
                      })),
                      [...usedColumns.filter((column) => column !== mapping.metricColumns[metric.id]), ...excludedColumns]
                    )}
                  </div>
                ))}
              </div>

              {validation?.mappingErrors.length > 0 && (
                <ul className="list-inside list-disc text-body-sm text-error" role="alert">
                  {validation.mappingErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              )}
              {invalidScaleTransform && (
                <p role="alert" className="text-body-sm text-error">Los factores de escala y ajuste deben ser números finitos.</p>
              )}
              {transformationAudit.length > 500 && (
                <p role="alert" className="text-body-sm text-error">Reduce las transformaciones auditables a 500 o menos antes de continuar.</p>
              )}

              {validation && (
                <div className="flex flex-wrap gap-space-md rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface">
                  <span>{validation.records.length} filas válidas</span>
                  <span>{validation.issues.length} filas con errores</span>
                  {validation.smallCohortGroups > 0 && (
                    <span className="text-warning">
                      Aviso: {validation.smallCohortGroups} grupos con menos de {SMALL_COHORT_THRESHOLD} filas.
                    </span>
                  )}
                </div>
              )}

              {validation?.issues.length > 0 && (
                <details className="rounded-xl border border-outline-variant/60 p-space-md">
                  <summary className="cursor-pointer text-label-md text-on-surface">Revisar anomalías ({validation.issues.length})</summary>
                  <ul className="mt-space-sm max-h-36 overflow-auto text-body-sm text-on-surface-variant">
                    {validation.issues.slice(0, 20).map((issue) => (
                      <li key={issue.rowNumber}>Fila {issue.rowNumber}: {issue.reasons.join("; ")}</li>
                    ))}
                    {validation.issues.length > 20 && <li>Se muestran los primeros 20 errores.</li>}
                  </ul>
                </details>
              )}

              <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
                <table className="min-w-full text-left text-body-sm">
                  <caption className="sr-only">Vista previa de las primeras ocho filas</caption>
                  <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                    <tr>{transformedFile.columns.filter((column) => !excludedColumns.includes(column.id)).map((column) => <th key={column.id} className="px-space-sm py-2">{column.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsedFile.rows.slice(0, 8).map((row) => (
                      <tr key={row.rowNumber} className="border-t border-outline-variant/40">
                        {transformedFile.columns.filter((column) => !excludedColumns.includes(column.id)).map((column) => (
                          <td key={column.id} className="max-w-64 truncate px-space-sm py-2 text-on-surface">
                            {row.values[column.id] instanceof Date
                              ? row.values[column.id].toISOString().slice(0, 10)
                              : String(row.values[column.id] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {phase === "review" && validation && (
            <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg">
              <div>
                <h3 className="text-headline-sm text-on-surface">Confirma antes de guardar</h3>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {fileName}: {validation.records.length} filas se guardarán; {validation.issues.length} se excluirán por anomalías.
                </p>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Solo se conservarán los campos mapeados. Los grupos pequeños se permiten, pero pueden ser identificables; verifica que los campos seleccionados no incluyan información personal.
              </p>
              {validation.smallCohortGroups > 0 && (
                <p className="rounded-xl bg-warning-container px-space-md py-space-sm text-body-sm text-on-warning-container">
                  Advertencia: hay {validation.smallCohortGroups} grupos por fecha y departamento con menos de {SMALL_COHORT_THRESHOLD} filas.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap justify-between gap-space-sm border-t border-outline-variant/50 px-space-lg py-space-md">
          <button
            type="button"
            disabled={importing || phase === "select"}
            onClick={() => setPhase("map")}
            className="rounded-full border border-outline-variant px-space-lg py-2.5 text-label-md text-on-surface disabled:opacity-50"
          >
            Volver al mapeo
          </button>
          <div className="flex gap-space-sm">
            {phase === "map" && (
              <button
                type="button"
                disabled={!canReview}
                onClick={() => setPhase("review")}
                className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
              >
                Revisar importación
              </button>
            )}
            {phase === "review" && (
              <>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setPhase("map")}
                  className="rounded-full border border-outline-variant px-space-lg py-2.5 text-label-md text-on-surface disabled:opacity-50"
                >
                  Editar mapeo
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleImport}
                  className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
                >
                  {importing ? `Guardando ${progress.current} de ${progress.total}…` : "Confirmar y conectar"}
                </button>
              </>
            )}
          </div>
          {importing && (
            <progress className="h-2 w-full accent-primary" max={progress.total} value={progress.current} aria-label="Progreso de importación" />
          )}
        </footer>
      </section>
    </div>
  );
}
