import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { INITIAL_METRICS, MAX_IMPORT_ROWS, SMALL_COHORT_THRESHOLD } from "../../data/metricsCatalog";
import { useAuth } from "../../hooks/useAuth";
import { useSidebarState } from "../../hooks/useSidebarState";
import {
  ensureMetricsCatalog,
  getImportRecords,
  getSurveyResponseCount,
  saveDataImport,
  subscribeImportBatches,
  subscribeMetricsCatalog,
} from "../../services/dataHubService";
import { readSpreadsheet, validateImportRows } from "../../utils/dataImport";

const METRIC_FIELDS = [
  { id: "participationRate", label: "Participación en pulsos" },
  { id: "psychSafety", label: "Seguridad psicológica" },
  { id: "attritionRisk", label: "Índice de presión laboral" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30";

function guessColumn(columns, pattern) {
  return columns.find((column) => pattern.test(column.label))?.id || "";
}

function formatDate(value) {
  const date = value?.toDate?.();
  return date ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(date) : "—";
}

function formatMetricValue(metricId, value, catalog) {
  const metric = catalog.find((item) => item.id === metricId);
  if (!Number.isFinite(value)) return "—";
  return `${value} ${metric?.unit || ""}`.trim();
}

export default function DataHub() {
  const { user } = useAuth();
  const { collapsed } = useSidebarState();
  const [metrics, setMetrics] = useState([]);
  const [batches, setBatches] = useState([]);
  const [surveyCount, setSurveyCount] = useState(null);
  const [surveyCountError, setSurveyCountError] = useState("");
  const [pageError, setPageError] = useState("");
  const [parsedFile, setParsedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState({
    dateColumn: "",
    departmentColumn: "",
    metricColumns: Object.fromEntries(METRIC_FIELDS.map(({ id }) => [id, ""])),
  });
  const [phase, setPhase] = useState("select");
  const [fileError, setFileError] = useState("");
  const [selectedImportId, setSelectedImportId] = useState("");
  const [recordResult, setRecordResult] = useState({ importId: "", records: [], error: "" });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    ensureMetricsCatalog().catch((error) => {
      if (active) setPageError(`No se pudo preparar el catálogo de métricas: ${error.message}`);
    });

    const unsubscribeMetrics = subscribeMetricsCatalog(
      (nextMetrics) => {
        if (active) setMetrics(nextMetrics);
      },
      (error) => {
        if (active) setPageError(`No se pudo cargar el catálogo de métricas: ${error.message}`);
      }
    );
    const unsubscribeBatches = subscribeImportBatches(
      (nextBatches) => {
        if (!active) return;
        setBatches(nextBatches);
        setSelectedImportId((current) =>
          current || nextBatches.find((batch) => batch.status === "complete")?.id || ""
        );
      },
      (error) => {
        if (active) setPageError(`No se pudo cargar el historial de importaciones: ${error.message}`);
      }
    );
    getSurveyResponseCount()
      .then((count) => {
        if (active) setSurveyCount(count);
      })
      .catch((error) => {
        if (active) setSurveyCountError(error.message);
      });

    return () => {
      active = false;
      unsubscribeMetrics();
      unsubscribeBatches();
    };
  }, []);

  useEffect(() => {
    if (!selectedImportId) return undefined;
    let active = true;
    getImportRecords(selectedImportId)
      .then((records) => {
        if (active) setRecordResult({ importId: selectedImportId, records, error: "" });
      })
      .catch((error) => {
        if (active) {
          setRecordResult({
            importId: selectedImportId,
            records: [],
            error: `No se pudieron cargar los registros importados: ${error.message}`,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [selectedImportId]);

  const validation = useMemo(() => {
    if (!parsedFile) return null;
    return validateImportRows(parsedFile.rows, mapping, metrics.length ? metrics : INITIAL_METRICS);
  }, [parsedFile, mapping, metrics]);

  const usedColumns = [
    mapping.dateColumn,
    mapping.departmentColumn,
    ...Object.values(mapping.metricColumns),
  ].filter(Boolean);

  async function handleFile(file) {
    setFileError("");
    setSuccessMessage("");
    setPageError("");
    setParsedFile(null);
    setPhase("select");
    setFileName(file?.name || "");
    try {
      const parsed = await readSpreadsheet(file, XLSX);
      setParsedFile(parsed);
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

  function updateMetricColumn(metricId, columnId) {
    setMapping((current) => ({
      ...current,
      metricColumns: { ...current.metricColumns, [metricId]: columnId },
    }));
  }

  async function handleImport() {
    if (!validation || validation.mappingErrors.length || validation.records.length === 0) return;
    setPageError("");
    setSuccessMessage("");
    setImporting(true);
    setImportProgress({ current: 0, total: validation.records.length });
    try {
      const importId = await saveDataImport({
        fileName,
        records: validation.records,
        rejectedRows: validation.issues.length,
        inputRows: validation.totalRows,
        smallCohortGroups: validation.smallCohortGroups,
        createdBy: user.uid,
        onProgress: (current, total) => setImportProgress({ current, total }),
      });
      setSuccessMessage(
        `Importación completada: ${validation.records.length} filas aceptadas y ${validation.issues.length} rechazadas.`
      );
      setSelectedImportId(importId);
      setParsedFile(null);
      setFileName("");
      setPhase("select");
    } catch (error) {
      setPageError(`No se pudo completar la importación. ${error.message}`);
    } finally {
      setImporting(false);
    }
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
          {parsedFile.columns.map((column) => (
            <option
              key={column.id}
              value={column.id}
              disabled={excluded.includes(column.id) && column.id !== value}
            >
              {column.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const selectedBatch = batches.find((batch) => batch.id === selectedImportId);
  const selectedRecords = recordResult.importId === selectedImportId ? recordResult.records : [];
  const recordsError = recordResult.importId === selectedImportId ? recordResult.error : "";
  const recordsLoading = Boolean(selectedImportId && recordResult.importId !== selectedImportId);
  const canReview = validation &&
    validation.mappingErrors.length === 0 &&
    validation.records.length > 0;

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-space-lg px-space-xl py-space-lg">
          <header className="animate-enter">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 text-label-md text-on-surface-variant">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
              Analítica de datos
            </span>
            <h1 className="mt-space-sm text-headline-xl text-on-surface">Data Hub</h1>
            <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">
              Importa datos estructurados y conserva su origen separado de las respuestas nativas de la organización.
            </p>
          </header>

          {pageError && (
            <p role="alert" className="rounded-2xl bg-error-container px-space-md py-space-sm text-body-md text-on-error-container">
              {pageError}
            </p>
          )}
          {successMessage && (
            <p role="status" className="rounded-2xl bg-primary-container px-space-md py-space-sm text-body-md text-on-primary-container">
              {successMessage}
            </p>
          )}

          <section aria-label="Resumen de fuentes de datos" className="grid gap-space-md md:grid-cols-2">
            <div className="motion-card keep-card-color rounded-2xl bg-surface-container-lowest p-space-lg">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">fact_check</span>
              <p className="mt-space-sm text-label-md text-on-surface-variant">Respuestas nativas de encuestas</p>
              <p className="text-headline-lg text-on-surface">{surveyCount ?? "—"}</p>
              {surveyCountError && <p role="status" className="mt-1 text-body-sm text-on-surface-variant">No se pudo consultar el conteo: {surveyCountError}</p>}
            </div>
            <div className="motion-card keep-card-color rounded-2xl bg-surface-container-lowest p-space-lg">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">table_view</span>
              <p className="mt-space-sm text-label-md text-on-surface-variant">Filas de importaciones completadas</p>
              <p className="text-headline-lg text-on-surface">
                {batches.filter((batch) => batch.status === "complete").reduce((total, batch) => total + (batch.acceptedRows || 0), 0)}
              </p>
              <p className="text-body-sm text-on-surface-variant">Almacenadas por separado; aún no se combinan en los KPIs del dashboard.</p>
            </div>
          </section>

          <section className="motion-card keep-card-color flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
            <div>
              <h2 className="text-headline-md text-on-surface">Catálogo inicial de métricas</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Definiciones maestras persistidas en Firestore para dar una estructura común a futuras fuentes.
              </p>
            </div>
            <div className="grid gap-space-sm lg:grid-cols-3">
              {metrics.map((metric) => (
                <article key={metric.id} className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-space-md">
                  <h3 className="text-label-lg text-on-surface">{metric.name}</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{metric.description}</p>
                  <dl className="mt-space-sm grid grid-cols-2 gap-x-space-sm gap-y-1 text-label-sm">
                    <dt className="text-on-surface-variant">Unidad</dt><dd className="text-on-surface">{metric.unit}</dd>
                    <dt className="text-on-surface-variant">Agregación</dt><dd className="text-on-surface">{metric.aggregation}</dd>
                    <dt className="text-on-surface-variant">Rango</dt><dd className="text-on-surface">{metric.minValue}–{metric.maxValue}</dd>
                    <dt className="text-on-surface-variant">Periodo</dt><dd className="text-on-surface">{metric.period}</dd>
                    <dt className="text-on-surface-variant">Fuentes</dt><dd className="text-on-surface">Encuestas e importaciones</dd>
                  </dl>
                </article>
              ))}
              {metrics.length === 0 && <p role="status" className="text-body-sm text-on-surface-variant">Cargando catálogo…</p>}
            </div>
          </section>

          <section className="motion-card keep-card-color flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
            <div>
              <h2 className="text-headline-md text-on-surface">Nueva importación</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                CSV o Excel (.xlsx), máximo 10 MB y {MAX_IMPORT_ROWS.toLocaleString("es")} filas. El archivo se procesa en este navegador y no se conserva.
              </p>
            </div>

            {phase === "select" && (
              <label
                className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-space-sm rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low p-space-lg text-center transition-colors hover:border-primary"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="material-symbols-outlined text-[36px] text-primary" aria-hidden="true">upload_file</span>
                <span className="text-label-lg text-on-surface">Suelta un archivo aquí o selecciónalo</span>
                <span className="text-body-sm text-on-surface-variant">Solo se guardarán fecha, departamento y métricas que mapees.</span>
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

            {fileError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{fileError}</p>}

            {phase === "map" && parsedFile && (
              <div className="flex flex-col gap-space-md">
                <div className="flex flex-wrap items-center justify-between gap-space-sm">
                  <p className="text-label-md text-on-surface">{fileName} · hoja «{parsedFile.sheetName}» · {parsedFile.rows.length} filas</p>
                  <button type="button" className="text-label-md text-primary underline" onClick={() => { setParsedFile(null); setPhase("select"); }}>
                    Elegir otro archivo
                  </button>
                </div>

                <div className="flex flex-wrap gap-space-md">
                  {renderColumnSelect("map-date", "Fecha", mapping.dateColumn, (dateColumn) => setMapping((current) => ({ ...current, dateColumn })), usedColumns.filter((column) => column !== mapping.dateColumn))}
                  {renderColumnSelect("map-department", "Departamento", mapping.departmentColumn, (departmentColumn) => setMapping((current) => ({ ...current, departmentColumn })), usedColumns.filter((column) => column !== mapping.departmentColumn))}
                  {METRIC_FIELDS.map((metric) => (
                    <div key={metric.id} className="flex min-w-52 flex-1">
                      {renderColumnSelect(
                        `map-${metric.id}`,
                        metric.label,
                        mapping.metricColumns[metric.id],
                        (columnId) => updateMetricColumn(metric.id, columnId),
                        usedColumns.filter((column) => column !== mapping.metricColumns[metric.id])
                      )}
                    </div>
                  ))}
                </div>

                {validation?.mappingErrors.length > 0 && (
                  <ul className="list-inside list-disc text-body-sm text-error" role="alert">
                    {validation.mappingErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                )}

                {validation && (
                  <div className="flex flex-wrap gap-space-md rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface">
                    <span>{validation.records.length} filas válidas</span>
                    <span>{validation.issues.length} filas con errores</span>
                    {validation.smallCohortGroups > 0 && (
                      <span className="text-warning">
                        Aviso: {validation.smallCohortGroups} grupos por fecha y departamento tienen menos de {SMALL_COHORT_THRESHOLD} filas.
                      </span>
                    )}
                  </div>
                )}

                {validation?.issues.length > 0 && (
                  <details className="rounded-xl border border-outline-variant/60 p-space-md">
                    <summary className="cursor-pointer text-label-md text-on-surface">Revisar anomalías ({validation.issues.length})</summary>
                    <ul className="mt-space-sm max-h-40 overflow-auto text-body-sm text-on-surface-variant">
                      {validation.issues.slice(0, 20).map((issue) => (
                        <li key={issue.rowNumber}>Fila {issue.rowNumber}: {issue.reasons.join("; ")}</li>
                      ))}
                      {validation.issues.length > 20 && <li>Se muestran los primeros 20 errores.</li>}
                    </ul>
                  </details>
                )}

                <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
                  <table className="min-w-full text-left text-body-sm">
                    <caption className="sr-only">Vista previa de las primeras ocho filas del archivo</caption>
                    <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                      <tr>{parsedFile.columns.map((column) => <th key={column.id} className="px-space-sm py-2">{column.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsedFile.rows.slice(0, 8).map((row) => (
                        <tr key={row.rowNumber} className="border-t border-outline-variant/40">
                          {parsedFile.columns.map((column) => (
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
                <button
                  type="button"
                  disabled={!canReview}
                  onClick={() => setPhase("review")}
                  className="self-start rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Revisar importación
                </button>
              </div>
            )}

            {phase === "review" && validation && (
              <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg">
                <div>
                  <h3 className="text-headline-sm text-on-surface">Confirma antes de guardar</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {fileName}: {validation.records.length} filas se guardarán; {validation.issues.length} filas con anomalías se excluirán.
                  </p>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Solo se conservarán los campos mapeados. Los grupos pequeños se permiten por decisión del administrador, pero pueden ser identificables; verifica que el archivo no incluya información personal en los campos seleccionados.
                </p>
                {validation.smallCohortGroups > 0 && (
                  <p className="rounded-xl bg-warning-container px-space-md py-space-sm text-body-sm text-on-warning-container">
                    Advertencia: hay {validation.smallCohortGroups} grupos por fecha y departamento con menos de {SMALL_COHORT_THRESHOLD} filas.
                  </p>
                )}
                <div className="flex flex-wrap gap-space-sm">
                  <button type="button" disabled={importing} onClick={() => setPhase("map")} className="rounded-full border border-outline-variant px-space-lg py-2.5 text-label-md text-on-surface disabled:opacity-50">
                    Volver al mapeo
                  </button>
                  <button type="button" disabled={importing} onClick={handleImport} className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50">
                    {importing ? `Guardando ${importProgress.current} de ${importProgress.total}…` : "Confirmar importación"}
                  </button>
                </div>
              </div>
            )}
            {importing && (
              <progress className="h-2 w-full accent-primary" max={importProgress.total} value={importProgress.current} aria-label="Progreso de importación" />
            )}
          </section>

          <section className="motion-card keep-card-color flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
            <div>
              <h2 className="text-headline-md text-on-surface">Fuentes en paralelo</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">Las respuestas nativas y los archivos importados permanecen separados.</p>
            </div>
            <label className="flex max-w-xl flex-col gap-space-xs text-label-md text-on-surface" htmlFor="import-batch">
              Conjunto importado
              <select
                id="import-batch"
                className={INPUT_CLASS}
                value={selectedImportId}
                onChange={(event) => setSelectedImportId(event.target.value)}
              >
                <option value="">Selecciona una importación completada</option>
                {batches.filter((batch) => batch.status === "complete").map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.sourceFileName} · {batch.acceptedRows} filas · {formatDate(batch.createdAt)}
                  </option>
                ))}
              </select>
            </label>
            {selectedBatch && (
              <div className="flex flex-wrap gap-x-space-lg gap-y-space-xs text-body-sm text-on-surface-variant">
                <span>{selectedBatch.acceptedRows} filas aceptadas</span>
                <span>{selectedBatch.rejectedRows} filas rechazadas</span>
                <span>{selectedBatch.smallCohortGroups || 0} grupos pequeños advertidos</span>
              </div>
            )}
            {selectedBatch && selectedBatch.smallCohortGroups > 0 && (
              <p role="status" className="rounded-xl bg-warning-container px-space-md py-space-sm text-body-sm text-on-warning-container">
                Esta importación contiene grupos por fecha y departamento con menos de {SMALL_COHORT_THRESHOLD} filas.
              </p>
            )}
            {recordsError && <p role="alert" className="text-body-sm text-error">{recordsError}</p>}
            {recordsLoading && <p role="status" className="text-body-sm text-on-surface-variant">Cargando registros importados…</p>}
            {!recordsLoading && selectedBatch && selectedRecords.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
                  <table className="min-w-full text-left text-body-sm">
                    <caption className="sr-only">Hasta 100 registros normalizados de la importación seleccionada</caption>
                    <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                      <tr>
                        <th className="px-space-sm py-2">Fecha</th>
                        <th className="px-space-sm py-2">Departamento</th>
                        {METRIC_FIELDS.map((metric) => <th key={metric.id} className="px-space-sm py-2">{metric.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecords.map((record) => (
                        <tr key={record.id} className="border-t border-outline-variant/40">
                          <td className="px-space-sm py-2 text-on-surface">{formatDate(record.date)}</td>
                          <td className="px-space-sm py-2 text-on-surface">{record.department}</td>
                          {METRIC_FIELDS.map((metric) => (
                            <td key={metric.id} className="px-space-sm py-2 text-on-surface">
                              {formatMetricValue(metric.id, record.metrics?.[metric.id], metrics)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedBatch.acceptedRows > selectedRecords.length && (
                  <p className="text-body-sm text-on-surface-variant">Se muestran las primeras {selectedRecords.length} de {selectedBatch.acceptedRows} filas aceptadas.</p>
                )}
              </>
            )}
            {!recordsLoading && selectedBatch && selectedRecords.length === 0 && !recordsError && (
              <p className="text-body-sm text-on-surface-variant">No hay filas disponibles para mostrar.</p>
            )}
            {batches.length === 0 && <p className="text-body-sm text-on-surface-variant">Aún no hay importaciones completadas.</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
