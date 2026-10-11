import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSidebarState } from "../../hooks/useSidebarState";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { listUsers } from "../../services/userService";
import { HrFilterProvider } from "../../analytics/context/HrFilterContext.jsx";
import { HR_TEMPLATES } from "../../analytics/templates/hrTemplates";
import HrPageViewer from "../../analytics/components/HrPageViewer";
import HrReportFrame from "./screens/HrReportFrame";
import DashboardManagerModal from "../../analytics/components/editor/DashboardManagerModal";
import LifeCycleScreen from "./screens/LifeCycleScreen";
import EmployeeProfileScreen from "./screens/EmployeeProfileScreen";
import AttritionPredictionScreen from "./screens/AttritionPredictionScreen";
import {
  deleteHrDashboard,
  saveHrDashboard,
  subscribeHrDashboards,
} from "../../analytics/services/hrDataService";

/* ------------------------------------------------------------------ */
/* Estilos compartidos (solo tokens que ya usa tu sistema de diseño)   */
/* ------------------------------------------------------------------ */
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const BTN_BASE = `motion-press inline-flex items-center gap-1.5 rounded-full px-space-md py-2 text-label-sm font-medium ${FOCUS}`;
const BTN_OUTLINE = `${BTN_BASE} border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low`;
const BTN_FILLED = `${BTN_BASE} bg-primary text-on-primary hover:opacity-90`;
const ICON_BTN = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high disabled:opacity-35 disabled:hover:bg-transparent ${FOCUS}`;

const SOURCE_STATUS = {
  firestore: {
    label: "Conectado a Firestore",
    chip: "bg-primary-container text-on-primary-container",
    dot: "bg-primary",
  },
  empty: {
    label: "Sin datos de empleados",
    chip: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-on-surface-variant/60",
  },
  error: {
    label: "Error al leer los datos",
    chip: "bg-error-container text-on-error-container",
    dot: "bg-error",
  },
  loading: {
    label: "Conectando…",
    chip: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-on-surface-variant/60 motion-safe:animate-pulse",
  },
};

/* ------------------------------------------------------------------ */
/* Piezas visuales                                                     */
/* ------------------------------------------------------------------ */
function SourceBadge({ origin }) {
  const status = SOURCE_STATUS[origin] || SOURCE_STATUS.loading;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-label-sm font-medium ${status.chip}`}
    >
      <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function SaveIndicator({ status }) {
  const states = {
    saving: { icon: "progress_activity", text: "Guardando…", spin: true, tone: "text-on-surface-variant" },
    saved: { icon: "cloud_done", text: "Cambios guardados", spin: false, tone: "text-on-surface-variant" },
    error: { icon: "error", text: "No se guardó", spin: false, tone: "text-error" },
  };
  const s = states[status] || states.saved;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-label-sm ${s.tone}`}>
      <span
        className={`material-symbols-outlined text-[18px] ${s.spin ? "motion-safe:animate-spin" : ""}`}
        aria-hidden="true"
      >
        {s.icon}
      </span>
      {s.text}
    </span>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <p className="text-body-sm text-on-surface-variant">
        <span className="font-semibold tabular-nums text-on-surface">{value}</span> {label}
      </p>
    </div>
  );
}

/** Riel de pantallas: anterior / siguiente, pestañas con scroll y contador. */
function PageRail({ pages, current, onChange }) {
  const railRef = useRef(null);
  const last = pages.length - 1;

  useEffect(() => {
    const box = railRef.current;
    const tab = document.getElementById(`hr-tab-${current}`);
    if (!box || !tab) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({
      left: tab.offsetLeft - box.clientWidth / 2 + tab.clientWidth / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [current, pages.length]);

  const step = (delta) => onChange(Math.min(last, Math.max(0, current + delta)));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={current <= 0}
        aria-label="Pantalla anterior"
        className={ICON_BTN}
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span>
      </button>

      <div
        ref={railRef}
        role="tablist"
        aria-label="Pantallas de analítica de Recursos Humanos"
        className="relative flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((page, index) => {
          const active = index === current;
          return (
            <button
              key={page.id}
              id={`hr-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(index)}
              className={`shrink-0 whitespace-nowrap rounded-full px-space-md py-1.5 text-label-sm font-medium transition-colors ${FOCUS} ${
                active
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              {page.title}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={current >= last}
        aria-label="Pantalla siguiente"
        className={ICON_BTN}
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span>
      </button>

      <span className="ml-1 hidden shrink-0 text-label-sm tabular-nums text-on-surface-variant sm:block">
        {Math.min(current + 1, pages.length)} de {pages.length}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  const block = "rounded-2xl bg-surface-container-high motion-safe:animate-pulse";
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-space-md">
      <span className="sr-only">Cargando analítica de Recursos Humanos…</span>
      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className="grid gap-space-md lg:grid-cols-3">
        <div className={`${block} h-80 lg:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
      <div className={`${block} h-64`} />
    </div>
  );
}

function Banner({ tone = "info", icon, children, action }) {
  const tones = {
    info: "bg-primary-container text-on-primary-container",
    neutral: "border border-outline-variant/60 bg-surface-container-lowest text-on-surface",
    error: "border border-error/30 bg-error-container text-on-error-container",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl px-space-md py-space-sm text-body-sm ${tones[tone]}`}
    >
      <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal (la lógica es idéntica a la versión original)  */
/* ------------------------------------------------------------------ */
export default function HrAnalyticsHub() {
  const { user } = useAuth();
  const { collapsed } = useSidebarState();

  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [extraDatasets, setExtraDatasets] = useState({ leaves: [], absences: [], snapshots: [] });
  const [loading, setLoading] = useState(true);
  const [dataOrigin, setDataOrigin] = useState("loading");
  const [dataLoadError, setDataLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Firestore Custom Dashboards
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [activeDashboardId, setActiveDashboardId] = useState(null); // null = Default Reference Suite
  const [dashboardDraft, setDashboardDraft] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [dashboardSaveStatus, setDashboardSaveStatus] = useState("saved");
  const saveTimer = useRef(null);
  const pendingDashboardSave = useRef(null);

  // Load custom dashboards for user
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeHrDashboards(
      user.uid,
      (dashboards) => setSavedDashboards(dashboards),
      (err) => console.warn("Error cargando dashboards:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingDashboardSave.current = null;
  }, [activeDashboardId]);

  // Load only existing user profiles; employee leave records are embedded in each profile.
  useEffect(() => {
    let active = true;

    async function initData() {
      try {
        const profiles = await listUsers();
        const employeeProfiles = profiles.filter((profile) => profile.employeeId);
        const leaves = employeeProfiles.flatMap((profile) =>
          (Array.isArray(profile.leaveRecords) ? profile.leaveRecords : []).map((leave) => ({
            ...leave,
            employeeId: profile.employeeId,
          }))
        );
        if (active) {
          setEmployees(employeeProfiles);
          setExtraDatasets({ leaves, absences: [], snapshots: [] });
          setDataOrigin(employeeProfiles.length ? "firestore" : "empty");
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          console.error("No se pudieron cargar perfiles HR desde users:", err);
          setEmployees([]);
          setExtraDatasets({ leaves: [], absences: [], snapshots: [] });
          setDataOrigin("error");
          setDataLoadError(err.message);
          setLoading(false);
        }
      }
    }

    initData();
    return () => {
      active = false;
    };
  }, []);

  // Active dashboard resolution
  const activeCustomDashboard = useMemo(() => {
    if (dashboardDraft?.id === activeDashboardId) return dashboardDraft;
    return savedDashboards.find((d) => d.id === activeDashboardId) || null;
  }, [savedDashboards, activeDashboardId, dashboardDraft]);

  const activePages = useMemo(() => {
    return activeCustomDashboard?.pages || HR_TEMPLATES;
  }, [activeCustomDashboard]);

  const employeeSourceCounts = useMemo(() => employees.reduce((counts, employee) => {
    const source = ["seed", "import", "manual"].includes(employee.source) ? employee.source : "other";
    counts[source] += 1;
    return counts;
  }, { seed: 0, import: 0, manual: 0, other: 0 }), [employees]);

  async function flushPendingDashboardSave() {
    const pending = pendingDashboardSave.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!pending) return true;
    pendingDashboardSave.current = null;
    setDashboardSaveStatus("saving");
    try {
      await saveHrDashboard(user.uid, pending.dashboardId, pending.dashboardData);
      setDashboardSaveStatus("saved");
      return true;
    } catch (error) {
      console.error("No se pudieron guardar los cambios del dashboard:", error);
      setDashboardSaveStatus("error");
      setNotice(`No se pudieron guardar los cambios: ${error.message}`);
      return false;
    }
  }

  // Dashboard CRUD handlers
  async function handleCreateDashboard({ name, fromTemplate }) {
    if (!user?.uid) return;
    if (!(await flushPendingDashboardSave())) return;
    try {
      const newPages = fromTemplate ? JSON.parse(JSON.stringify(HR_TEMPLATES)) : [
        {
          id: "page-1",
          title: "Página Principal",
          widgets: [],
          slicers: [{ type: "yearButtons", filterKey: "year", label: "Año" }],
        },
      ];

      const newId = await saveHrDashboard(user.uid, null, {
        name,
        description: "Tablero analítico personalizado de talento",
        pages: newPages,
      });

      setActiveDashboardId(newId);
      setDashboardSaveStatus("saved");
      setDashboardDraft({
        id: newId,
        ownerId: user.uid,
        name,
        description: "Tablero analítico personalizado de talento",
        pages: newPages,
      });
      setCurrentScreenIndex(0);
      setManagerOpen(false);
      setNotice(`Tablero "${name}" creado correctamente.`);
    } catch (err) {
      alert(`Error al crear el tablero: ${err.message}`);
    }
  }

  async function handleDuplicateDashboard(dash) {
    if (!user?.uid) return;
    if (!(await flushPendingDashboardSave())) return;
    try {
      const dupId = await saveHrDashboard(user.uid, null, {
        name: `${dash.name} (Copia)`,
        description: dash.description || "",
        pages: dash.pages || [],
      });
      setActiveDashboardId(dupId);
      setDashboardSaveStatus("saved");
      setDashboardDraft({
        ...dash,
        id: dupId,
        ownerId: user.uid,
        name: `${dash.name} (Copia)`,
      });
      setManagerOpen(false);
    } catch (err) {
      alert(`Error al duplicar: ${err.message}`);
    }
  }

  async function handleRenameDashboard(dashId, newName) {
    try {
      const dashboard = savedDashboards.find((item) => item.id === dashId);
      if (!dashboard) throw new Error("No se encontró el dashboard.");
      await saveHrDashboard(user.uid, dashId, {
        name: newName,
        description: dashboard.description || "",
        pages: dashboard.pages,
      });
      if (dashboardDraft?.id === dashId) {
        setDashboardDraft((current) => ({ ...current, name: newName }));
      }
    } catch (err) {
      alert(`Error al renombrar: ${err.message}`);
    }
  }

  async function handleDeleteDashboard(dashId) {
    if (dashId === activeDashboardId && !(await flushPendingDashboardSave())) return;
    try {
      await deleteHrDashboard(user.uid, dashId);
      if (activeDashboardId === dashId) {
        setActiveDashboardId(null);
        setDashboardSaveStatus("saved");
        setDashboardDraft(null);
        setCurrentScreenIndex(0);
      }
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

  function handleUpdateDashboardPages(updatedDash) {
    if (!activeDashboardId) return;
    setDashboardDraft({ ...updatedDash, id: activeDashboardId });
    pendingDashboardSave.current = {
      dashboardId: activeDashboardId,
      dashboardData: {
        name: updatedDash.name || activeCustomDashboard?.name || "Analítica de Recursos Humanos",
        pages: updatedDash.pages,
      },
    };
    setDashboardSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await flushPendingDashboardSave();
    }, 700);
  }

  async function handleSelectDashboard(dashboard) {
    if (!(await flushPendingDashboardSave())) return;
    setActiveDashboardId(dashboard.id);
    setDashboardSaveStatus("saved");
    setDashboardDraft(dashboard);
    setCurrentScreenIndex(0);
    setManagerOpen(false);
    setIsEditMode(false);
  }

  /* ---------------------------- Render ---------------------------- */
  const currentPage = activePages[currentScreenIndex];
  const compactReport = Boolean(activeCustomDashboard) || currentScreenIndex > 0;
  const denseDashboard = Boolean(currentPage?.grid);
  const dashboardLabel = activeCustomDashboard
    ? activeCustomDashboard.name
    : "Analítica de Recursos Humanos · conjunto de referencia";
  const fmt = (n) => n.toLocaleString("es-MX");

  return (
    <HrFilterProvider key={employees.length ? `loaded-${employees.length}` : "empty"} employees={employees}>
      <div className="app-canvas zone-dashboard min-h-screen">
        {!compactReport && <Sidebar />}
        {!compactReport && <TopBar />}
        <main className={`${compactReport ? "pl-0 pt-0" : `${collapsed ? "pl-20" : "pl-64"} pt-16`} transition-[padding] duration-300 ease-out`}>
          <div className={`mx-auto flex max-w-[1880px] flex-col ${
            compactReport
              ? denseDashboard
                ? "gap-2 px-space-sm py-space-sm"
                : "gap-space-md px-space-lg py-space-md"
              : "gap-space-md px-space-md py-space-md lg:px-space-lg"
          }`}>
            <header className={compactReport
              ? "hidden"
              : "rounded-3xl border border-outline-variant/50 bg-surface-container-lowest p-space-lg shadow-xs"}>
              <div className={`flex flex-wrap justify-between gap-space-md ${compactReport ? "items-center" : "items-start"}`}>
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`${compactReport ? "hidden" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-on-primary-fixed-variant"}`}>
                    <span className="material-symbols-outlined text-[26px]" aria-hidden="true">query_stats</span>
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-on-surface-variant ${compactReport ? "text-label-sm" : "text-body-sm"}`}>{dashboardLabel}</p>
                    <h1 className={`${compactReport ? "hidden" : "truncate text-2xl font-semibold leading-tight text-on-surface"}`}>
                      {currentPage?.title || "Analítica de Recursos Humanos"}
                    </h1>
                    <div className={`${compactReport ? "hidden" : "mt-2 flex flex-wrap items-center gap-x-5 gap-y-1"}`}>
                      <Stat icon="groups" value={fmt(employees.length)} label="empleados" />
                      <Stat icon="event_available" value={fmt(extraDatasets.leaves.length)} label="licencias" />
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">info</span>
                        Este archivo no incluye ausencias
                      </span>
                    </div>
                    {!compactReport && employees.length > 0 && (
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        {employeeSourceCounts.import} importados, {employeeSourceCounts.seed} de demostración, {employeeSourceCounts.manual} manuales
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                  <SourceBadge origin={dataOrigin} />
                  {activeCustomDashboard && <SaveIndicator status={dashboardSaveStatus} />}
                  <button type="button" onClick={() => setManagerOpen(true)} className={BTN_OUTLINE}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">dashboard_customize</span>
                    Tableros
                  </button>
                  <Link to="/analytics/import" className={BTN_FILLED}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
                    Importar datos
                  </Link>
                </div>
              </div>

              {!compactReport && (
                <div className="mt-space-md border-t border-outline-variant/40 pt-space-sm">
                  <PageRail pages={activePages} current={currentScreenIndex} onChange={setCurrentScreenIndex} />
                </div>
              )}
            </header>

            {notice && (
              <Banner
                icon="info"
                action={
                  <button
                    type="button"
                    onClick={() => setNotice("")}
                    aria-label="Cerrar aviso"
                    className={`${ICON_BTN} -my-1.5 h-8 w-8 text-on-primary-container hover:bg-on-primary-container/10`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                  </button>
                }
              >
                <p className="py-0.5">{notice}</p>
              </Banner>
            )}

            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                {dataLoadError && (
                  <Banner tone="error" icon="error">
                    <p className="font-semibold">No se pudieron leer los perfiles de la colección users</p>
                    <p className="mt-0.5">
                      {dataLoadError}. Revisa tu conexión y los permisos de Firestore, y vuelve a cargar la página.
                      No se mostraron datos ficticios en su lugar.
                    </p>
                  </Banner>
                )}
                {dataOrigin === "empty" && (
                  <Banner
                    tone="neutral"
                    icon="upload_file"
                    action={
                      <Link to="/analytics/import" className={`${BTN_FILLED} shrink-0`}>
                        Abrir importador
                      </Link>
                    }
                  >
                    <p className="font-semibold">Todavía no hay empleados en el directorio</p>
                    <p className="mt-0.5 text-on-surface-variant">
                      Importa un archivo CSV o Excel. Cada perfil necesita un ID de empleado para aparecer aquí.
                    </p>
                  </Banner>
                )}

                {/* Screen 0: Life Cycle Interactive Navigator */}
                {!activeCustomDashboard && currentScreenIndex === 0 && (
                  <LifeCycleScreen onSelectScreen={(idx) => setCurrentScreenIndex(idx)} />
                )}

                {/* Screen 4: Interactive Employee Profile */}
                {!activeCustomDashboard && currentScreenIndex === 4 && (
                  <HrReportFrame
                    title={currentPage?.title}
                    pages={activePages}
                    current={currentScreenIndex}
                    onChange={setCurrentScreenIndex}
                  >
                    <EmployeeProfileScreen
                      employees={employees}
                      leaves={extraDatasets.leaves}
                    />
                  </HrReportFrame>
                )}

                {/* Screen 12: Interactive Attrition Prediction */}
                {!activeCustomDashboard && currentScreenIndex === 12 && (
                  <HrReportFrame
                    title={currentPage?.title}
                    pages={activePages}
                    current={currentScreenIndex}
                    onChange={setCurrentScreenIndex}
                    actions={
                      <button type="button" onClick={() => setCurrentScreenIndex(13)} className={BTN_FILLED}>
                        Predicción por departamento
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                      </button>
                    }
                  >
                    <AttritionPredictionScreen employees={employees} />
                  </HrReportFrame>
                )}

                {/* Screens 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13: Rendered by Generic Declarative Engine */}
                {(activeCustomDashboard || (currentScreenIndex !== 0 && currentScreenIndex !== 4 && currentScreenIndex !== 12)) && (
                  <HrPageViewer
                    key={activeDashboardId || "reference-template"}
                    dashboard={{
                      id: activeDashboardId,
                      name: activeCustomDashboard ? activeCustomDashboard.name : "Suite de Analítica de Recursos Humanos",
                      pages: activePages,
                    }}
                    currentPageIndex={currentScreenIndex}
                    onSelectPage={(idx) => setCurrentScreenIndex(idx)}
                    onNavigateHome={() => setCurrentScreenIndex(0)}
                    onToggleEditMode={() => {
                      if (!activeDashboardId) {
                        setManagerOpen(true);
                        setNotice("Para editar, crea o abre un tablero personalizado desde «Tableros». La plantilla de referencia se conserva intacta.");
                        return;
                      }
                      setIsEditMode((current) => !current);
                    }}
                    isEditMode={isEditMode}
                    employees={employees}
                    extraDatasets={extraDatasets}
                    onUpdateDashboard={handleUpdateDashboardPages}
                    onOpenDashboardManager={() => setManagerOpen(true)}
                    activeDashboardId={activeDashboardId}
                    dashboardSaveStatus={dashboardSaveStatus}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Dashboard Manager Modal */}
      <DashboardManagerModal
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        dashboards={savedDashboards}
        activeDashboardId={activeDashboardId}
        onSelectDashboard={handleSelectDashboard}
        onCreateDashboard={handleCreateDashboard}
        onDuplicateDashboard={handleDuplicateDashboard}
        onRenameDashboard={handleRenameDashboard}
        onDeleteDashboard={handleDeleteDashboard}
      />
    </HrFilterProvider>
  );
}