import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { EmptyPulse, PulseSection, PulseSkeleton } from "../components/dashboard/DashboardPulse";
import OperationStrip from "../components/dashboard/DashboardOperations";
import ExportActions from "../components/dashboard/DashboardExportActions";
import DashboardInsights from "../components/dashboard/DashboardInsights";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import MetricDetailModal from "../components/MetricDetailModal";
import { useOrgHealthMetrics } from "../hooks/useOrgHealthMetrics";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useFrictionSources } from "../hooks/useFrictionSources";
import { useWeeklySentiment } from "../hooks/useWeeklySentiment";
import { useWeeklyTrends } from "../hooks/useWeeklyTrends";
import { useAbsenceMetrics } from "../hooks/usePresence";
import { useTurnoverMetrics } from "../hooks/useTurnoverMetrics";
import { useTeamPerformance } from "../hooks/useTeamPerformance";
import { useSidebarState } from "../hooks/useSidebarState";
import { useDepartments } from "../hooks/useDepartments";
import { buildDashboardAlerts } from "../utils/dashboardAlerts";
import { explainMetric } from "../services/aiService";

/* ------------------------------------------------------------------
   Versiones memoizadas de los componentes pesados.
   Al abrir/cerrar el modal cambia el estado de Dashboard; con memo,
   React no vuelve a dibujar el heatmap, el panel de IA, etc. mientras
   corre la animación.
------------------------------------------------------------------- */
const MemoSidebar = memo(Sidebar);
const MemoTopBar = memo(TopBar);

const RATE_LIMIT_MESSAGE =
  "Se alcanzó el límite diario de consultas automáticas. Vuelve a intentarlo mañana o activa una cuenta con límites más altos.";
const GENERIC_ERROR_MESSAGE = "No se pudo generar la explicación en este momento. Ábrela de nuevo para reintentar.";
const EXPORT_ERROR_MESSAGE = "No se pudo generar el archivo. Inténtalo de nuevo.";

const isRateLimit = (text) => /429|RESOURCE_EXHAUSTED/i.test(text);
export default function Dashboard() {
  const [departmentId, setDepartmentId] = useState(null);
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();
  const { metrics, previousMetrics, periodLabel, loading, headcount } = useOrgHealthMetrics(departmentId);
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk(departmentId);
  const {
    sources: frictionSources,
    loading: frictionSourcesLoading,
    error: frictionSourcesError,
  } = useFrictionSources(departmentId);
  const {
    trend,
    hotspots,
    comments,
    loading: sentimentLoading,
    error: sentimentError,
  } = useWeeklySentiment(departmentId);
  const { trends: weeklyTrends } = useWeeklyTrends(departmentId);
  const { absence, loading: absenceLoading } = useAbsenceMetrics(departmentId);
  const { metrics: turnover, loading: turnoverLoading } = useTurnoverMetrics(departmentId);
  const { metrics: performance, loading: performanceLoading } = useTeamPerformance(departmentId);
  const alerts = buildDashboardAlerts({
    metrics,
    previousMetrics,
    headcount,
    departmentRows: deptRows || [],
    absence,
    turnover,
    performance,
    departments,
  });

  const [expanded, setExpanded] = useState(null); // definición del KPI abierto
  const [explanations, setExplanations] = useState({}); // explicaciones guardadas (incluye límite 429)
  const [failedIds, setFailedIds] = useState({}); // errores pasajeros: NO se guardan, permiten reintentar
  const [loadingId, setLoadingId] = useState(null); // id del KPI que se está analizando
  const [aiMarkdown, setAiMarkdown] = useState("");
  const [aiSummaryMinimized, setAiSummaryMinimized] = useState(false);
  const [exporting, setExporting] = useState(null); // null | "pdf" | "excel"
  const [exportError, setExportError] = useState(null);

  // Siempre los datos más recientes, sin cambiar la identidad de handleExpand
  const latest = useRef({});
  useEffect(() => {
    latest.current = { metrics, previousMetrics, explanations };
  }, [metrics, previousMetrics, explanations]);

  async function handleExport(kind) {
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "pdf") {
        const { exportDashboardPdf } = await import("../services/pdfExportService");
        exportDashboardPdf({
          metrics, deptRows: deptRows || [], aiMarkdown, departmentId, departments,
          turnover, performance, absence, headcount, periodLabel,
        });
      } else {
        const { exportResponsesExcel } = await import("../services/excelExportService");
        await exportResponsesExcel({
          metrics, deptRows: deptRows || [], departments, turnover, performance,
          absence, headcount, departmentId, periodLabel,
        });
      }
    } catch {
      setExportError(EXPORT_ERROR_MESSAGE);
    } finally {
      setExporting(null);
    }
  }

  const handleExpand = useCallback(async (def) => {
    setExpanded(def);

    const { metrics: m, previousMetrics: prev, explanations: saved } = latest.current;
    if (saved[def.id] || !m) return;

    setFailedIds((f) => {
      if (!f[def.id]) return f;
      const rest = { ...f };
      delete rest[def.id];
      return rest;
    });
    setLoadingId(def.id);

    try {
      const text = await explainMetric({
        label: def.label,
        context: {
          valorActual: def.getValue(m),
          valorAnterior: prev ? def.getValue(prev) : null,
          muestra: ["attritionRisk", "psychSafety"].includes(def.dataKey)
            ? m.psychosocialSampleSize
            : m.sampleSize,
          interpretacion: def.dataKey === "attritionRisk"
            ? "Índice orientativo de 0 a 100 puntos calculado con preguntas directas de fatiga de turno y carga emocional. No es una probabilidad ni predice renuncias."
            : undefined,
        },
      });
      const explanation = isRateLimit(text) ? RATE_LIMIT_MESSAGE : text;
      setExplanations((e) => ({ ...e, [def.id]: explanation }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      if (isRateLimit(errorText)) {
        // El límite diario se guarda para no gastar más consultas al volver a abrir
        setExplanations((e) => ({ ...e, [def.id]: RATE_LIMIT_MESSAGE }));
      } else {
        setFailedIds((f) => ({ ...f, [def.id]: GENERIC_ERROR_MESSAGE }));
      }
    } finally {
      // Solo apaga la carga si sigue siendo la de este KPI (evita carreras entre KPIs)
      setLoadingId((current) => (current === def.id ? null : current));
    }
  }, []);

  const handleClose = useCallback(() => setExpanded(null), []);

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <MemoSidebar />
      <MemoTopBar
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
        periodLabel={periodLabel}
        alerts={alerts}
      />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-space-lg px-space-xl py-space-lg">
          {/* 1. Encabezado: título a la izquierda, exportar discreto a la derecha */}
          <header className="flex flex-wrap items-end justify-between gap-space-md">
            <div className="flex flex-col gap-space-sm">
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                {metrics ? metrics.sampleSize : "…"} respuestas · {periodLabel}
              </span>
              <h1 className="text-headline-xl text-on-surface">Diagnóstico Psicosocial y Salud Estratégica</h1>
            </div>
            <div className="flex flex-col items-end gap-space-xs">
              <ExportActions onExport={handleExport} exporting={exporting} disabled={!metrics} />
              {exportError && (
                <p role="alert" className="rounded-full bg-error-container px-3 py-1 text-label-md text-on-error-container">
                  {exportError}
                </p>
              )}
            </div>
          </header>

          {/* 2. Pulso: un protagonista + tres filas tranquilas */}
          {loading && !metrics && <PulseSkeleton />}
          {metrics &&
            (metrics.sampleSize > 0 ? (
              <PulseSection
                metrics={metrics}
                previousMetrics={previousMetrics}
                headcount={headcount}
                onExpand={handleExpand}
              />
            ) : (
              <EmptyPulse />
            ))}
          {!loading && !metrics && (
            <p role="status" className="text-body-md text-on-surface-variant">
              No se pudieron cargar los indicadores. Revisa tu conexión o los permisos de tu cuenta.
            </p>
          )}

          {/* 3. Operación: una sola franja de tres tarjetas simples */}
          {metrics && (
            <OperationStrip
              absence={absence}
              absenceLoading={absenceLoading}
              turnover={turnover}
              turnoverLoading={turnoverLoading}
              performance={performance}
              performanceLoading={performanceLoading}
            />
          )}

          <DashboardInsights
            deptRows={deptRows}
            metrics={metrics}
            comments={comments}
            aiMarkdown={aiMarkdown}
            aiSummaryMinimized={aiSummaryMinimized}
            setAiMarkdown={setAiMarkdown}
            setAiSummaryMinimized={setAiSummaryMinimized}
            deptLoading={deptLoading}
            trend={trend}
            hotspots={hotspots}
            frictionSources={frictionSources}
            frictionSourcesLoading={frictionSourcesLoading}
            frictionSourcesError={frictionSourcesError}
            sentimentLoading={sentimentLoading}
            sentimentError={sentimentError}
          />
        </div>
      </main>

      <AnimatePresence>
        {expanded && metrics && (
          <MetricDetailModal
            layoutId={expanded.id}
            title={expanded.label}
            value={expanded.getValue(metrics)}
            suffix={expanded.getSuffix(metrics)}
            explanation={explanations[expanded.id] ?? failedIds[expanded.id]}
            loadingExplanation={loadingId === expanded.id}
            trendData={weeklyTrends}
            departmentRows={deptRows}
            dataKey={expanded.dataKey}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}