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
import DashboardManagerModal from "../../analytics/components/editor/DashboardManagerModal";
import LifeCycleScreen from "./screens/LifeCycleScreen";
import EmployeeProfileScreen from "./screens/EmployeeProfileScreen";
import AttritionPredictionScreen from "./screens/AttritionPredictionScreen";
import {
  deleteHrDashboard,
  saveHrDashboard,
  subscribeHrDashboards,
} from "../../analytics/services/hrDataService";

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
        description: "Dashboard analítico personalizado de talento",
        pages: newPages,
      });

      setActiveDashboardId(newId);
      setDashboardSaveStatus("saved");
      setDashboardDraft({
        id: newId,
        ownerId: user.uid,
        name,
        description: "Dashboard analítico personalizado de talento",
        pages: newPages,
      });
      setCurrentScreenIndex(0);
      setManagerOpen(false);
      setNotice(`Dashboard "${name}" creado exitosamente.`);
    } catch (err) {
      alert(`Error al crear dashboard: ${err.message}`);
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
        name: updatedDash.name || activeCustomDashboard?.name || "HR Analytics",
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

  return (
    <HrFilterProvider key={employees.length ? `loaded-${employees.length}` : "empty"} employees={employees}>
      <div className="app-canvas zone-dashboard min-h-screen">
        <Sidebar />
        <TopBar />
        <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
          <div className="mx-auto flex max-w-[1880px] flex-col gap-space-md px-space-md py-space-md lg:px-space-lg">
            <header className="flex flex-wrap items-center justify-between gap-space-md rounded-3xl border border-outline-variant/50 bg-surface-container-lowest px-space-lg py-space-md shadow-xs">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant shadow-xs">
                  <span className="material-symbols-outlined text-[23px]" aria-hidden="true">query_stats</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      {activeCustomDashboard ? activeCustomDashboard.name : "HR Analytics"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      dataOrigin === "firestore"
                        ? "bg-primary-container text-on-primary-container"
                        : dataOrigin === "error"
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container-high text-on-surface-variant"
                    }`}>
                      {dataOrigin === "firestore"
                        ? "Fuente: Firestore"
                        : dataOrigin === "empty"
                          ? "Sin fuente conectada"
                          : dataOrigin === "error"
                            ? "Error de fuente"
                            : "Conectando fuente…"}
                    </span>
                    <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                      {employees.length.toLocaleString("es-MX")} empleados
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-on-surface-variant">
                    {extraDatasets.leaves.length.toLocaleString("es-MX")} licencias incluidas · ausencias no disponibles en el archivo
                  </p>
                  {employees.length > 0 && (
                    <p className="truncate text-[10px] text-on-surface-variant">
                      Origen de empleados: {employeeSourceCounts.import} importados · {employeeSourceCounts.seed} demo · {employeeSourceCounts.manual} manuales
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="hr-page-picker">Seleccionar pantalla HR Analytics</label>
                <select
                  id="hr-page-picker"
                  value={currentScreenIndex}
                  onChange={(event) => setCurrentScreenIndex(Number(event.target.value))}
                  className="max-w-[min(68vw,20rem)] rounded-xl border border-outline-variant bg-surface-container-low px-space-sm py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                >
                  {activePages.map((template, index) => (
                    <option key={template.id} value={index}>{template.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setManagerOpen(true)}
                  className="motion-press inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-2 text-label-sm text-on-surface hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[17px]">dashboard_customize</span>
                  Dashboards
                </button>
                <Link
                  to="/analytics/import"
                  className="motion-press inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-2 text-label-sm text-on-surface hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[17px]">upload_file</span>
                  Importar
                </Link>
              </div>
            </header>

            {/* Seed Progress / Notice Banner */}
            {notice && (
              <div className="flex items-center justify-between rounded-xl bg-primary-container px-space-md py-2 text-body-sm text-on-primary-container">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} className="text-label-sm font-semibold underline">
                  Cerrar
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 rounded-3xl bg-surface-container-lowest">
                <span className="material-symbols-outlined animate-spin text-[44px] text-primary">
                  progress_activity
                </span>
                <span className="text-label-lg font-medium text-on-surface">
                  Cargando suite de HR Analytics...
                </span>
              </div>
            ) : (
              <>
                {dataLoadError && (
                  <div role="alert" className="rounded-2xl border border-error/30 bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
                    No se pudieron leer los perfiles de empleados de users en Firestore: {dataLoadError}. No se sustituyeron con datos ficticios.
                  </div>
                )}
                {dataOrigin === "empty" && (
                  <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-space-md py-space-sm text-body-sm text-on-surface">
                    <span>No hay perfiles con ID de empleado en la colección users. Importa el archivo para llenar el directorio HR.</span>
                    <Link to="/analytics/import" className="font-semibold underline">Abrir importador</Link>
                  </div>
                )}
                {/* Screen 0: Life Cycle Interactive Navigator */}
                {!activeCustomDashboard && currentScreenIndex === 0 && (
                  <LifeCycleScreen onSelectScreen={(idx) => setCurrentScreenIndex(idx)} />
                )}

                {/* Screen 4: Interactive Employee Profile */}
                {!activeCustomDashboard && currentScreenIndex === 4 && (
                  <EmployeeProfileScreen
                    employees={employees}
                    leaves={extraDatasets.leaves}
                  />
                )}

                {/* Screen 12: Interactive Attrition Prediction */}
                {!activeCustomDashboard && currentScreenIndex === 12 && (
                  <AttritionPredictionScreen
                    employees={employees}
                    onNavigateToDepartmentProfile={() => setCurrentScreenIndex(13)}
                  />
                )}

                {/* Screens 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13: Rendered by Generic Declarative Engine */}
                {(activeCustomDashboard || (currentScreenIndex !== 0 && currentScreenIndex !== 4 && currentScreenIndex !== 12)) && (
                  <HrPageViewer
                    key={activeDashboardId || "reference-template"}
                    dashboard={{
                      id: activeDashboardId,
                      name: activeCustomDashboard ? activeCustomDashboard.name : "HR Analytics Suite",
                      pages: activePages,
                    }}
                    currentPageIndex={currentScreenIndex}
                    onSelectPage={(idx) => setCurrentScreenIndex(idx)}
                    onNavigateHome={() => setCurrentScreenIndex(0)}
                    onToggleEditMode={() => {
                      if (!activeDashboardId) {
                        setManagerOpen(true);
                        setNotice("Para editar, crea o abre un dashboard personalizado desde «Dashboards». La plantilla de referencia se conserva intacta.");
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
