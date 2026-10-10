import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import SortableCanvasWidget from "../../components/SortableCanvasWidget";
import TopBar from "../../components/TopBar";
import CustomMetricBuilder from "../../components/CustomMetricBuilder";
import DataImportWizard from "../../components/DataImportWizard";
import { useAuth } from "../../hooks/useAuth";
import { useDepartments } from "../../hooks/useDepartments";
import { useHeadcount } from "../../hooks/useHeadcount";
import { useSidebarState } from "../../hooks/useSidebarState";
import {
  filterCanvasRecordsByDepartment,
  getNativeDashboardRecords,
} from "../../services/canvasDataService";
import {
  ensureMetricsCatalog,
  getAllImportRecords,
  subscribeImportBatches,
  subscribeMetricsCatalog,
} from "../../services/dataHubService";
import {
  removeCanvasDashboard,
  saveCanvasDashboard,
  subscribeCanvasDashboards,
} from "../../services/canvasDashboardService";

const MAX_WIDGETS = 20;
const VISUALIZATIONS = [
  { id: "kpi", label: "Tarjeta KPI" },
  { id: "line", label: "Línea" },
  { id: "bar", label: "Barras" },
  { id: "table", label: "Tabla" },
];
const INPUT_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function nextId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  return date
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

export default function CanvasStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaceView, setWorkspaceView] = useState(
    searchParams.get("view") === "sources" ? "sources" : "canvas"
  );
  const { user } = useAuth();
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();
  const { total: totalHeadcount, forDepartment } = useHeadcount();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [departmentId, setDepartmentId] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [importBatches, setImportBatches] = useState([]);
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [activeDashboardId, setActiveDashboardId] = useState("");
  const [name, setName] = useState("Mi tablero");
  const [sourceType, setSourceType] = useState("responses");
  const [sourceImportId, setSourceImportId] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [selectedVisualization, setSelectedVisualization] = useState("kpi");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [dataState, setDataState] = useState({ key: "", records: [], error: "", updatedAt: null });
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showMetricBuilder, setShowMetricBuilder] = useState(false);

  useEffect(() => {
    let active = true;
    ensureMetricsCatalog().catch((error) => {
      if (active) setCatalogError(`No se pudo preparar el catálogo de métricas: ${error.message}`);
    });
    const unsubscribeMetrics = subscribeMetricsCatalog(
      (items) => {
        if (active) setMetrics(items);
      },
      (error) => {
        if (active) setCatalogError(`No se pudo cargar el catálogo de métricas: ${error.message}`);
      }
    );
    const unsubscribeImports = subscribeImportBatches(
      (items) => {
        if (active) setImportBatches(items.filter((item) => item.status === "complete"));
      },
      (error) => {
        if (active) setCatalogError(`No se pudieron cargar las importaciones: ${error.message}`);
      }
    );
    const unsubscribeDashboards = user?.uid
      ? subscribeCanvasDashboards(
        user.uid,
        (items) => {
          if (active) setSavedDashboards(items);
        },
        (error) => {
          if (active) setCatalogError(`No se pudieron cargar tus tableros: ${error.message}`);
        }
      )
      : () => {};

    return () => {
      active = false;
      unsubscribeMetrics();
      unsubscribeImports();
      unsubscribeDashboards();
    };
  }, [user?.uid]);

  const departmentName = departments.find((department) => department.id === departmentId)?.name || "";
  const selectedHeadcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
  const sourceKey = sourceType === "responses"
    ? `responses:${departmentId || "all"}:${departmentName}:${selectedHeadcount}:${totalHeadcount}`
    : `externalDataImports:${sourceImportId}:${departmentId || "all"}:${departmentName}`;

  useEffect(() => {
    if (sourceType === "externalDataImports" && !sourceImportId) return undefined;
    let active = true;

    async function loadSource() {
      try {
        if (sourceType === "responses") {
          const result = await getNativeDashboardRecords({
            departmentId,
            headcount: { total: totalHeadcount, department: selectedHeadcount },
          });
          if (active) setDataState({ key: sourceKey, ...result, error: "" });
        } else {
          const allRecords = await getAllImportRecords(sourceImportId);
          const now = new Date();
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const recentRecords = allRecords.filter((record) => {
            const date = record.date?.toDate?.();
            return date && date >= cutoff && date <= now;
          });
          const records = filterCanvasRecordsByDepartment(recentRecords, departmentId, departmentName);
          if (active) setDataState({ key: sourceKey, records, error: "", updatedAt: null });
        }
      } catch (error) {
        if (active) {
          setDataState({
            key: sourceKey,
            records: [],
            error: `No se pudo cargar la fuente seleccionada: ${error.message}`,
            updatedAt: null,
          });
        }
      }
    }

    loadSource();
    return () => {
      active = false;
    };
  }, [
    sourceKey,
    sourceType,
    sourceImportId,
    departmentId,
    departmentName,
    totalHeadcount,
    selectedHeadcount,
  ]);

  const sourceMetricKey = sourceType === "responses" ? "responses" : "externalDataImports";
  const availableMetrics = useMemo(
    () => metrics.filter((metric) => metric.sources?.includes(sourceMetricKey)),
    [metrics, sourceMetricKey]
  );
  const effectiveMetricId = availableMetrics.some((metric) => metric.id === selectedMetricId)
    ? selectedMetricId
    : availableMetrics[0]?.id || "";
  const selectedMetric = availableMetrics.find((metric) => metric.id === effectiveMetricId);
  const selectedBatch = importBatches.find((batch) => batch.id === sourceImportId);
  const records = dataState.key === sourceKey ? dataState.records : [];
  const dataError = dataState.key === sourceKey ? dataState.error : "";
  const dataLoading = (sourceType === "responses" || Boolean(sourceImportId)) && dataState.key !== sourceKey;
  const sourceUpdatedAt = sourceType === "responses"
    ? dataState.updatedAt
    : selectedBatch?.completedAt || selectedBatch?.createdAt;

  function markDirty() {
    setDirty(true);
    setNotice("");
  }

  function handleNewDashboard() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos y crear un tablero nuevo?")) return;
    setActiveDashboardId("");
    setName("Mi tablero");
    setSourceType("responses");
    setSourceImportId("");
    setWidgets([]);
    setDirty(false);
    setPageError("");
    setNotice("");
  }

  function resetEditor() {
    setActiveDashboardId("");
    setName("Mi tablero");
    setSourceType("responses");
    setSourceImportId("");
    setWidgets([]);
    setDirty(false);
  }

  function handleSelectDashboard(dashboardId) {
    const dashboard = savedDashboards.find((item) => item.id === dashboardId);
    if (!dashboard) return;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos y abrir el tablero seleccionado?")) return;
    setActiveDashboardId(dashboard.id);
    setName(dashboard.name);
    setSourceType(dashboard.sourceType);
    setSourceImportId(dashboard.sourceImportId || "");
    setWidgets(Array.isArray(dashboard.widgets) ? dashboard.widgets : []);
    setDirty(false);
    setPageError("");
    setNotice("");
  }

  function addWidget() {
    if (!selectedMetric || (sourceType === "externalDataImports" && !sourceImportId)) return;
    if (widgets.length >= MAX_WIDGETS) {
      setPageError(`El lienzo admite hasta ${MAX_WIDGETS} widgets.`);
      return;
    }
    setWidgets((current) => [
      ...current,
      {
        id: nextId(),
        title: selectedMetric.name,
        metricId: selectedMetric.id,
        visualization: selectedVisualization,
        width: selectedVisualization === "kpi" ? 3 : 6,
        height: "regular",
        dateRangeDays: 30,
        threshold: null,
        thresholdOperator: "above",
        palette: "sage",
      },
    ]);
    markDirty();
  }

  function addCustomMetric(definition) {
    if (widgets.length >= MAX_WIDGETS) {
      setPageError(`El lienzo admite hasta ${MAX_WIDGETS} widgets.`);
      return;
    }
    const metricId = definition.metricId || definition.numeratorMetricId;
    setWidgets((current) => [
      ...current,
      {
        id: nextId(),
        title: definition.name,
        metricId,
        metricDefinition: definition,
        visualization: definition.groupBy === "department" ? "bar" : "kpi",
        width: definition.groupBy === "department" ? 6 : 3,
        height: "regular",
        dateRangeDays: 30,
        threshold: null,
        thresholdOperator: "above",
        palette: "sage",
      },
    ]);
    setShowMetricBuilder(false);
    markDirty();
    setNotice(`KPI «${definition.name}» añadido al lienzo. Guarda el tablero para conservarlo.`);
  }

  function updateWidget(updatedWidget) {
    setWidgets((current) => current.map((widget) => widget.id === updatedWidget.id ? updatedWidget : widget));
    markDirty();
  }

  function removeWidget(widgetId) {
    setWidgets((current) => current.filter((widget) => widget.id !== widgetId));
    markDirty();
  }

  function reorderWidgets(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgets((current) => {
      const oldIndex = current.findIndex((widget) => widget.id === active.id);
      const newIndex = current.findIndex((widget) => widget.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
    markDirty();
  }

  async function handleSave() {
    setPageError("");
    setNotice("");
    if (!user?.uid) {
      setPageError("No se pudo identificar tu cuenta. Vuelve a iniciar sesión.");
      return;
    }
    setSaving(true);
    try {
      const dashboardId = await saveCanvasDashboard(user.uid, activeDashboardId, {
        name,
        sourceType,
        sourceImportId,
        widgets,
      });
      setActiveDashboardId(dashboardId);
      setDirty(false);
      setNotice("Tablero guardado en tu espacio privado.");
    } catch (error) {
      setPageError(error.message || "No se pudo guardar el tablero.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeDashboardId || !window.confirm(`¿Eliminar «${name}» de tu espacio? Esta acción no se puede deshacer.`)) return;
    setPageError("");
    setDeleting(true);
    try {
      await removeCanvasDashboard(activeDashboardId);
      resetEditor();
      setNotice("Tablero eliminado.");
    } catch (error) {
      setPageError(`No se pudo eliminar el tablero: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  }

  const canAddWidget = Boolean(
    selectedMetric &&
    (sourceType === "responses" || sourceImportId) &&
    widgets.length < MAX_WIDGETS
  );

  function selectWorkspaceView(view) {
    setWorkspaceView(view);
    const nextParams = new URLSearchParams(searchParams);
    if (view === "sources") nextParams.set("view", "sources");
    else nextParams.delete("view");
    setSearchParams(nextParams, { replace: true });
  }

  function handleImported(importId, result) {
    setShowImportWizard(false);
    setSourceType("externalDataImports");
    setSourceImportId(importId);
    markDirty();
    setNotice(`Fuente conectada al lienzo: ${result.acceptedRows} filas aceptadas y ${result.rejectedRows} rechazadas.`);
    selectWorkspaceView("canvas");
  }

  function selectImportForCanvas(importId) {
    if (!importId) return;
    setSourceType("externalDataImports");
    setSourceImportId(importId);
    markDirty();
    selectWorkspaceView("canvas");
  }

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar departmentId={departmentId} onDepartmentChange={setDepartmentId} />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex max-w-[1600px] flex-col gap-space-lg px-space-xl py-space-lg">
          <header className="flex flex-wrap items-end justify-between gap-space-md">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                BI Studio · Fuentes y visualización
              </span>
              <h1 className="mt-space-sm text-headline-xl text-on-surface">Espacio de analítica</h1>
              <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">
                Conecta fuentes y construye tableros en un solo espacio. Tu vista ejecutiva predeterminada permanece intacta y tus tableros son privados para tu cuenta.
              </p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-space-md py-2.5 text-label-md text-on-surface hover:bg-surface-container-low">
              <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
              Volver al dashboard predeterminado
            </Link>
          </header>

          <nav className="flex w-fit gap-1 rounded-full bg-surface-container-low p-1" aria-label="Secciones del espacio de analítica">
            {[
              { id: "canvas", label: "Lienzo", icon: "dashboard_customize" },
              { id: "sources", label: "Fuentes", icon: "database" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={workspaceView === item.id ? "page" : undefined}
                onClick={() => selectWorkspaceView(item.id)}
                className={`rounded-full px-space-md py-2.5 text-label-md transition-colors ${
                  workspaceView === item.id
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined mr-1 align-middle text-[18px]" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {catalogError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{catalogError}</p>}
          {pageError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{pageError}</p>}
          {notice && <p role="status" className="rounded-xl bg-primary-container px-space-md py-space-sm text-body-sm text-on-primary-container">{notice}</p>}

          {workspaceView === "sources" && (
            <>
              <section aria-label="Resumen de fuentes" className="grid gap-space-md md:grid-cols-2">
                <article className="rounded-2xl bg-surface-container-lowest p-space-lg">
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">fact_check</span>
                  <p className="mt-space-sm text-label-md text-on-surface-variant">Fuente nativa</p>
                  <h2 className="text-headline-md text-on-surface">Encuestas de Firebase</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">Permanece aislada de los archivos importados y puede seleccionarse desde el lienzo.</p>
                </article>
                <article className="rounded-2xl bg-surface-container-lowest p-space-lg">
                  <span className="material-symbols-outlined text-secondary" aria-hidden="true">table_view</span>
                  <p className="mt-space-sm text-label-md text-on-surface-variant">Archivos conectados</p>
                  <p className="text-headline-lg text-on-surface">{importBatches.length}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {importBatches.reduce((total, batch) => total + (batch.acceptedRows || 0), 0)} filas válidas en importaciones completadas.
                  </p>
                </article>
              </section>

              <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
                <div className="flex flex-wrap items-center justify-between gap-space-md">
                  <div>
                    <h2 className="text-headline-md text-on-surface">Fuentes de datos</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      Las importaciones se almacenan por separado de las respuestas de Firebase. El archivo original no se conserva.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImportWizard(true)}
                    className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary"
                  >
                    <span className="material-symbols-outlined mr-1 align-middle" aria-hidden="true">add</span>
                    Conectar CSV o Excel
                  </button>
                </div>

                {importBatches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant p-space-lg text-center">
                    <p className="text-label-md text-on-surface">Aún no hay archivos conectados</p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">Importa un CSV o Excel para usar sus métricas en un tablero.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
                    <table className="min-w-full text-left text-body-sm">
                      <caption className="sr-only">Fuentes importadas disponibles para los tableros</caption>
                      <thead className="bg-surface-container-low text-label-sm text-on-surface-variant">
                        <tr>
                          <th className="px-space-md py-3">Archivo</th>
                          <th className="px-space-md py-3">Filas aceptadas</th>
                          <th className="px-space-md py-3">Anomalías</th>
                          <th className="px-space-md py-3">Importado</th>
                          <th className="px-space-md py-3"><span className="sr-only">Acción</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {importBatches.map((batch) => (
                          <tr key={batch.id} className="border-t border-outline-variant/40">
                            <td className="px-space-md py-3 text-label-md text-on-surface">{batch.sourceFileName}</td>
                            <td className="px-space-md py-3 text-on-surface-variant">{batch.acceptedRows || 0}</td>
                            <td className="px-space-md py-3 text-on-surface-variant">{batch.rejectedRows || 0}</td>
                            <td className="px-space-md py-3 text-on-surface-variant">{formatDate(batch.completedAt || batch.createdAt)}</td>
                            <td className="px-space-md py-3 text-right">
                              <button
                                type="button"
                                onClick={() => selectImportForCanvas(batch.id)}
                                className="whitespace-nowrap rounded-full border border-outline-variant px-space-md py-2 text-label-md text-primary hover:bg-surface-container-low"
                              >
                                Usar en lienzo
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
                <div>
                  <h2 className="text-headline-md text-on-surface">Catálogo de métricas</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Definiciones aprobadas disponibles para construir visualizaciones por fuente.
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
                      </dl>
                    </article>
                  ))}
                  {metrics.length === 0 && <p role="status" className="text-body-sm text-on-surface-variant">Cargando catálogo…</p>}
                </div>
              </section>
            </>
          )}

          {workspaceView === "canvas" && (
          <>
          <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
            <div className="flex flex-wrap items-end gap-space-md">
              <label className="flex min-w-60 flex-1 flex-col gap-space-xs text-label-md text-on-surface" htmlFor="saved-canvas">
                Mis tableros
                <select
                  id="saved-canvas"
                  className={INPUT_CLASS}
                  value={activeDashboardId}
                  onChange={(event) => handleSelectDashboard(event.target.value)}
                >
                  <option value="">Tablero nuevo sin guardar</option>
                  {savedDashboards.map((dashboard) => (
                    <option key={dashboard.id} value={dashboard.id}>
                      {dashboard.name} · {dashboard.widgets?.length || 0} widgets
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={handleNewDashboard} className="rounded-full border border-outline-variant px-space-md py-2.5 text-label-md text-on-surface hover:bg-surface-container-low">
                <span className="material-symbols-outlined mr-1 align-middle" aria-hidden="true">add</span>
                Nuevo tablero
              </button>
              <div className="flex gap-space-xs">
                {activeDashboardId && (
                  <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-full px-space-md py-2.5 text-label-md text-error hover:bg-error-container disabled:opacity-50">
                    {deleting ? "Eliminando…" : "Eliminar"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
                >
                  {saving ? "Guardando…" : activeDashboardId ? "Guardar cambios" : "Guardar tablero"}
                </button>
              </div>
            </div>

            <div className="grid gap-space-md md:grid-cols-2">
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="canvas-name">
                Nombre del tablero
                <input
                  id="canvas-name"
                  className={INPUT_CLASS}
                  value={name}
                  maxLength={80}
                  onChange={(event) => { setName(event.target.value); markDirty(); }}
                  placeholder="Ej. Pulso de bienestar"
                />
              </label>
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="canvas-source">
                Fuente del tablero
                <select
                  id="canvas-source"
                  className={INPUT_CLASS}
                  value={sourceType}
                  onChange={(event) => { setSourceType(event.target.value); markDirty(); }}
                >
                  <option value="responses">Encuestas nativas de Firebase</option>
                  <option value="externalDataImports">Archivo importado</option>
                </select>
              </label>
              {sourceType === "externalDataImports" && (
                <label className="flex flex-col gap-space-xs text-label-md text-on-surface md:col-span-2" htmlFor="canvas-import">
                  Archivo importado
                  <select
                    id="canvas-import"
                    className={INPUT_CLASS}
                    value={sourceImportId}
                    onChange={(event) => { setSourceImportId(event.target.value); markDirty(); }}
                  >
                    <option value="">Selecciona una importación completada</option>
                    {importBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.sourceFileName} · {batch.acceptedRows} filas · {formatDate(batch.completedAt || batch.createdAt)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
              <span>{dirty ? "Cambios sin guardar" : activeDashboardId ? "Cambios guardados" : "Borrador nuevo"}</span>
              <span aria-hidden="true">·</span>
              <span>Últimos 30 días</span>
              <span aria-hidden="true">·</span>
              <span>{departmentId ? `Departamento: ${departmentName || departmentId}` : "Todos los departamentos"}</span>
              {sourceUpdatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{sourceType === "responses" ? "Consultado" : "Fuente actualizada"}: {formatDate(sourceUpdatedAt)}</span>
                </>
              )}
              {selectedBatch?.smallCohortGroups > 0 && (
                <span className="rounded-full bg-warning-container px-2 py-1 text-label-sm text-on-warning-container">
                  {selectedBatch.smallCohortGroups} grupos pequeños: interpretar con cuidado
                </span>
              )}
            </div>
          </section>

          <div className="grid items-start gap-space-md lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md lg:sticky lg:top-20">
              <div>
                <h2 className="text-headline-sm text-on-surface">Biblioteca de widgets</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Elige una métrica y una visualización para añadirla al lienzo.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMetricBuilder(true)}
                disabled={widgets.length >= MAX_WIDGETS || availableMetrics.length === 0}
                className="rounded-2xl border border-secondary/40 bg-secondary-container/50 px-space-md py-space-sm text-left text-label-md text-on-surface hover:bg-secondary-container disabled:opacity-50"
              >
                <span className="material-symbols-outlined mr-1 align-middle text-secondary" aria-hidden="true">auto_awesome</span>
                Generar KPI personalizado
              </button>
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="new-widget-metric">
                Métrica
                <select
                  id="new-widget-metric"
                  className={INPUT_CLASS}
                  value={effectiveMetricId}
                  onChange={(event) => setSelectedMetricId(event.target.value)}
                >
                  {availableMetrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface" htmlFor="new-widget-visualization">
                Visualización
                <select
                  id="new-widget-visualization"
                  className={INPUT_CLASS}
                  value={selectedVisualization}
                  onChange={(event) => setSelectedVisualization(event.target.value)}
                >
                  {VISUALIZATIONS.map((visualization) => <option key={visualization.id} value={visualization.id}>{visualization.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={addWidget}
                disabled={!canAddWidget}
                className="rounded-full bg-primary px-space-md py-2.5 text-label-md font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined mr-1 align-middle" aria-hidden="true">add_chart</span>
                Añadir widget
              </button>
              {widgets.length >= MAX_WIDGETS && <p role="status" className="text-body-sm text-on-surface-variant">Máximo {MAX_WIDGETS} widgets por tablero.</p>}
              {sourceType === "externalDataImports" && !sourceImportId && (
                <p className="text-body-sm text-on-surface-variant">Selecciona una importación antes de añadir widgets.</p>
              )}
              {availableMetrics.length === 0 && <p role="status" className="text-body-sm text-on-surface-variant">No hay métricas aprobadas para esta fuente.</p>}
              <div className="rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
                Arrastra los widgets para reordenarlos. Ajusta ancho y altura desde cada bloque; guarda para conservar el diseño.
              </div>
            </aside>

            <section aria-label="Lienzo de widgets" className="min-w-0 rounded-2xl bg-surface-container-low p-space-md">
              <div className="mb-space-md flex items-center justify-between gap-space-sm">
                <h2 className="text-headline-sm text-on-surface">{name || "Tablero sin título"}</h2>
                <span className="text-label-sm text-on-surface-variant">{widgets.length} / {MAX_WIDGETS} widgets</span>
              </div>
              {dataError && <p role="alert" className="mb-space-md rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{dataError}</p>}
              {dataLoading && <p role="status" className="mb-space-md text-body-sm text-on-surface-variant">Cargando fuente y calculando indicadores…</p>}
              {sourceType === "externalDataImports" && !sourceImportId && (
                <p role="status" className="mb-space-md rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant">
                  Selecciona una importación para previsualizar sus datos.
                </p>
              )}
              {!dataLoading && records.length === 0 && sourceKey === dataState.key && !dataError && sourceType === "responses" && (
                <p role="status" className="mb-space-md rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant">
                  No hay datos en los últimos 30 días para esta fuente y filtro.
                </p>
              )}
              {widgets.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-space-lg text-center">
                  <span className="material-symbols-outlined text-[40px] text-primary" aria-hidden="true">dashboard_customize</span>
                  <h3 className="mt-space-sm text-headline-sm text-on-surface">Tu lienzo está listo</h3>
                  <p className="mt-1 max-w-md text-body-sm text-on-surface-variant">
                    Añade una tarjeta, una línea, barras o una tabla. Puedes mover y redimensionar cada bloque.
                  </p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderWidgets}>
                  <SortableContext items={widgets.map((widget) => widget.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 items-start gap-space-md md:grid-cols-2 xl:grid-cols-12">
                      {widgets.map((widget) => {
                        const metricId = widget.metricDefinition
                      ? widget.metricDefinition.metricId || widget.metricDefinition.numeratorMetricId
                      : widget.metricId;
                        const sourceMetric = availableMetrics.find((item) => item.id === metricId);
                        const metric = widget.metricDefinition && sourceMetric
                      ? {
                        ...sourceMetric,
                        name: widget.metricDefinition.name,
                        unit: widget.metricDefinition.unit,
                        aggregation: widget.metricDefinition.aggregation,
                      }
                      : sourceMetric;
                        if (!metric) return null;
                        return (
                          <SortableCanvasWidget
                            key={widget.id}
                            widget={widget}
                            metric={metric}
                            availableMetrics={availableMetrics}
                            metricCatalog={metrics}
                            records={records}
                            onChange={updateWidget}
                            onRemove={() => removeWidget(widget.id)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          </div>
          </>
          )}
        </div>
      </main>
      {showImportWizard && (
        <DataImportWizard
          metrics={metrics}
          onClose={() => setShowImportWizard(false)}
          onImported={handleImported}
        />
      )}
      {showMetricBuilder && (
        <CustomMetricBuilder
          metrics={availableMetrics}
          onClose={() => setShowMetricBuilder(false)}
          onCreate={addCustomMetric}
        />
      )}
    </div>
  );
}
