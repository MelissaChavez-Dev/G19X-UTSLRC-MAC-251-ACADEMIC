import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SMALL_COHORT_THRESHOLD } from "../data/metricsCatalog";
import {
  ensureMetricsCatalog,
  getAllImportRecords,
  subscribeImportBatches,
  subscribeMetricsCatalog,
} from "../services/dataHubService";
import { calculateSemanticMetrics } from "../utils/semanticMetrics";

const INPUT_CLASS =
  "w-full max-w-xl rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const EMPTY_RECORDS = [];

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

function formatValue(value, unit) {
  if (!Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);
  return unit === "%" ? `${formatted}%` : `${formatted} ${unit}`.trim();
}

export default function SemanticMetricsPanel({ departmentId, departments }) {
  const [metrics, setMetrics] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [recordResult, setRecordResult] = useState({ importId: "", records: [], error: "", loadedAt: null });
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;
    ensureMetricsCatalog().catch((error) => {
      if (active) setCatalogError(`No se pudo preparar el catálogo semántico: ${error.message}`);
    });
    const unsubscribeMetrics = subscribeMetricsCatalog(
      (items) => {
        if (active) setMetrics(items);
      },
      (error) => {
        if (active) setCatalogError(`No se pudo cargar el catálogo semántico: ${error.message}`);
      }
    );
    const unsubscribeBatches = subscribeImportBatches(
      (items) => {
        if (!active) return;
        const completed = items.filter((item) => item.status === "complete");
        setBatches(completed);
        setSelectedImportId((current) => current || completed[0]?.id || "");
      },
      (error) => {
        if (active) setCatalogError(`No se pudo cargar el origen de datos: ${error.message}`);
      }
    );
    return () => {
      active = false;
      unsubscribeMetrics();
      unsubscribeBatches();
    };
  }, []);

  useEffect(() => {
    if (!selectedImportId) return undefined;
    let active = true;
    getAllImportRecords(selectedImportId)
      .then((records) => {
        if (active) setRecordResult({ importId: selectedImportId, records, error: "", loadedAt: new Date() });
      })
      .catch((error) => {
        if (active) {
          setRecordResult({
            importId: selectedImportId,
            records: [],
            error: `No se pudieron cargar los datos semánticos: ${error.message}`,
            loadedAt: null,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [selectedImportId]);

  const selectedBatch = batches.find((batch) => batch.id === selectedImportId);
  const records = recordResult.importId === selectedImportId ? recordResult.records : EMPTY_RECORDS;
  const recordsError = recordResult.importId === selectedImportId ? recordResult.error : "";
  const recordsLoading = Boolean(selectedImportId && recordResult.importId !== selectedImportId);
  const departmentName = departments.find((department) => department.id === departmentId)?.name;
  const departmentFilters = useMemo(
    () => departmentId ? [departmentId, departmentName].filter(Boolean) : [],
    [departmentId, departmentName]
  );
  const loadedAt = recordResult.importId === selectedImportId ? recordResult.loadedAt : null;
  const { periodStart, periodEnd } = useMemo(() => {
    const end = loadedAt || new Date();
    return {
      periodEnd: end,
      periodStart: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
  }, [loadedAt]);
  const filteredRecords = useMemo(() => records.filter((record) => {
    const recordDate = record.date?.toDate?.();
    if (!recordDate || recordDate < periodStart || recordDate > periodEnd) return false;
    if (!departmentId) return true;
    return record.department === departmentId || record.department === departmentName;
  }), [records, periodStart, periodEnd, departmentId, departmentName]);
  const importedMetrics = useMemo(
    () => metrics.filter((metric) => metric.sources?.includes("externalDataImports")),
    [metrics]
  );
  const calculatedMetrics = useMemo(
    () => calculateSemanticMetrics(records, importedMetrics, {
      dateRange: { start: periodStart, end: periodEnd },
      departments: departmentFilters,
    }),
    [records, importedMetrics, periodStart, periodEnd, departmentFilters]
  );

  return (
    <section aria-labelledby="semantic-metrics-heading" className="flex flex-col gap-space-md rounded-[32px] bg-surface-container-low p-space-lg">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h2 id="semantic-metrics-heading" className="text-headline-sm text-on-surface">Métricas del modelo semántico</h2>
          <p className="mt-1 max-w-3xl text-body-sm text-on-surface-variant">
            Cálculos sobre un archivo importado, con filtros del catálogo. Esta fuente se muestra por separado y no se promedia con las respuestas de Firebase.
          </p>
        </div>
        <Link to="/admin/data-hub" className="text-label-md text-primary underline">
          Administrar fuentes
        </Link>
      </div>

      {catalogError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{catalogError}</p>}

      {batches.length > 0 && (
        <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="semantic-import-source">
          Fuente importada
          <select
            id="semantic-import-source"
            className={INPUT_CLASS}
            value={selectedImportId}
            onChange={(event) => setSelectedImportId(event.target.value)}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.sourceFileName} · {batch.acceptedRows} filas · {formatDate(batch.completedAt || batch.createdAt)}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedBatch && (
        <div className="flex flex-wrap gap-x-space-lg gap-y-space-xs text-label-sm text-on-surface-variant">
          <span>Fuente: {selectedBatch.sourceFileName}</span>
          <span>Actualizada: {formatDate(selectedBatch.completedAt || selectedBatch.createdAt)}</span>
          <span>Periodo analizado: últimos 30 días</span>
          <span>{departmentId ? `Departamento: ${departmentName || departmentId}` : "Todos los departamentos"}</span>
        </div>
      )}

      {selectedBatch?.smallCohortGroups > 0 && (
        <p role="status" className="rounded-xl bg-warning-container px-space-md py-space-sm text-body-sm text-on-warning-container">
          Esta fuente contiene {selectedBatch.smallCohortGroups} grupos con menos de {SMALL_COHORT_THRESHOLD} filas. Interpreta sus resultados con cuidado.
        </p>
      )}

      {recordsLoading && <p role="status" className="text-body-sm text-on-surface-variant">Calculando métricas aprobadas…</p>}
      {recordsError && <p role="alert" className="text-body-sm text-error">{recordsError}</p>}

      {selectedBatch && !recordsLoading && !recordsError && (
        <div className="grid gap-space-sm md:grid-cols-3">
          {calculatedMetrics.map(({ metric, value, count, error }) => (
            <article key={metric.id} className="rounded-2xl bg-surface-container-lowest p-space-md">
              <h3 className="text-label-md text-on-surface">{metric.name}</h3>
              <p className="mt-space-xs text-headline-lg text-on-surface">{formatValue(value, metric.unit)}</p>
              <p className="mt-1 text-label-sm text-on-surface-variant">
                {count} valores · {metric.aggregation} · {metric.period}
              </p>
              {error && <p role="status" className="mt-space-sm text-body-sm text-error">{error}</p>}
              {!error && count === 0 && <p className="mt-space-sm text-body-sm text-on-surface-variant">Sin valores válidos para este filtro.</p>}
              <p className="mt-space-sm border-t border-outline-variant/50 pt-space-sm text-label-sm text-on-surface-variant">
                Origen: {selectedBatch.sourceFileName}<br />
                Actualización: {formatDate(selectedBatch.completedAt || selectedBatch.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}

      {!selectedBatch && !catalogError && (
        <div className="rounded-2xl bg-surface-container-lowest p-space-md">
          <p className="text-body-md text-on-surface-variant">Aún no hay importaciones completadas para calcular estos KPIs.</p>
          <Link to="/admin/data-hub" className="mt-space-sm inline-flex text-label-md text-primary underline">Importar una fuente</Link>
        </div>
      )}

      {selectedBatch && !recordsLoading && filteredRecords.length === 0 && !recordsError && (
        <p role="status" className="text-body-sm text-on-surface-variant">
          No hay filas dentro del periodo y departamento seleccionados.
        </p>
      )}
    </section>
  );
}
