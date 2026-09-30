import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import KpiCard from "../components/KpiCard";
import RiskHeatmap from "../components/RiskHeatmap";
import RiskAlertBanner from "../components/RiskAlertBanner";
import AIStrategistPanel from "../components/AIStrategistPanel";
import WeeklySentimentTrend from "../components/WeeklySentimentTrend";
import FrictionHotspots from "../components/FrictionHotspots";
import MetricDetailModal from "../components/MetricDetailModal";
import { useOrgHealthMetrics } from "../hooks/useOrgHealthMetrics";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useWeeklySentiment } from "../hooks/useWeeklySentiment";
import { useWeeklyTrends } from "../hooks/useWeeklyTrends";
import { useAbsenceMetrics } from "../hooks/usePresence";
import { useSidebarState } from "../hooks/useSidebarState";
import { explainMetric } from "../services/aiService";
import { exportDashboardPdf, exportResponsesExcel } from "../services/exportService";

function delta(current, previous) {
  if (previous === undefined || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return null;
  return diff;
}

const KPI_DEFS = [
  {
    id: "kpi-enps",
    icon: "sentiment_very_satisfied",
    label: "Salud neta del equipo (eNPS)",
    dataKey: "enps",
    getValue: (m) => m.enps,
    getSuffix: () => null,
    getFooterLabel: () => "Muestra del periodo",
    getFooterValue: (m) => `${m.sampleSize} respuestas`,
  },
  {
    id: "kpi-attrition",
    icon: "trending_down",
    label: "Riesgo de rotación a 90 días (modelado)",
    dataKey: "attritionRisk",
    getValue: (m) => `${m.attritionRisk}%`,
    getSuffix: () => null,
    getFooterLabel: () => "Basado en",
    getFooterValue: () => "Fatiga + carga emocional reportada",
  },
  {
    id: "kpi-pulse",
    icon: "how_to_reg",
    label: "Participación en pulsos",
    dataKey: "activePulseRate",
    getValue: (m) => `${m.activePulseRate}%`,
    getSuffix: (m) => `~${m.avgPerWeek} / 78 por semana`,
    getFooterLabel: () => "Participación semanal promedio",
    getFooterValue: (m) => `${m.sampleSize} respuestas totales (30 días)`,
  },
  {
    id: "kpi-safety",
    icon: "verified_user",
    label: "Índice de seguridad psicológica",
    dataKey: "psychSafety",
    getValue: (m) => m.psychSafety,
    getSuffix: () => "/ 5,0",
    getFooterLabel: () => "Promedio del periodo",
    getFooterValue: (m) => (m.psychSafety >= 3.5 ? "Estable" : "Requiere atención"),
  },
];

export default function Dashboard() {
  const [departmentId, setDepartmentId] = useState(null);
  const { collapsed } = useSidebarState();
  const { metrics, previousMetrics, loading, headcount } = useOrgHealthMetrics(departmentId);
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk(departmentId);
  const { trend, hotspots, comments, loading: sentimentLoading } = useWeeklySentiment(departmentId);
  const { trends: weeklyTrends } = useWeeklyTrends(departmentId);
  const { absence, loading: absenceLoading } = useAbsenceMetrics(departmentId);

  const [expanded, setExpanded] = useState(null); // { id, def }
  const [explanations, setExplanations] = useState({});
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [aiMarkdown, setAiMarkdown] = useState("");
  const [exporting, setExporting] = useState(null); // null | "pdf" | "excel"

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      exportDashboardPdf({ metrics, deptRows: deptRows || [], aiMarkdown, departmentId });
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    setExporting("excel");
    try {
      await exportResponsesExcel({ metrics, deptRows: deptRows || [] });
    } finally {
      setExporting(null);
    }
  }

  async function handleExpand(def) {
    setExpanded(def);
    if (explanations[def.id]) return;

    setLoadingExplanation(true);
    try {
      const text = await explainMetric({
        label: def.label,
        context: {
          valorActual: def.getValue(metrics),
          valorAnterior: previousMetrics ? def.getValue(previousMetrics) : null,
          muestra: metrics.sampleSize,
        },
      });
      const explanation = /429|RESOURCE_EXHAUSTED/i.test(text)
        ? "Se alcanzó el límite diario de consultas automáticas. Vuelve a intentarlo mañana o activa una cuenta con límites más altos."
        : text;
      setExplanations((prev) => ({ ...prev, [def.id]: explanation }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      const explanation = /429|RESOURCE_EXHAUSTED/i.test(errorText)
        ? "Se alcanzó el límite diario de consultas automáticas. Vuelve a intentarlo mañana o activa una cuenta con límites más altos."
        : "No se pudo generar la explicación en este momento.";
      setExplanations((prev) => ({
        ...prev,
        [def.id]: explanation,
      }));
    } finally {
      setLoadingExplanation(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface app-canvas">
      <Sidebar />
      <TopBar departmentId={departmentId} onDepartmentChange={setDepartmentId} />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="px-space-xl py-space-lg flex flex-col gap-space-md">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs mb-1">
              <span className="text-label-sm uppercase tracking-widest text-on-surface font-bold">
                Inteligencia ejecutiva
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="text-label-sm text-on-surface-variant font-medium">
                Cohorte: {metrics ? metrics.sampleSize : "..."} respuestas (30 días)
              </span>
            </div>
            <h1 className="text-headline-xl text-on-surface tracking-tight">
              Diagnóstico Psicosocial y Salud Estratégica
            </h1>
            <div className="flex gap-space-sm mt-space-sm">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!metrics || exporting !== null}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary text-on-primary px-space-md py-2 text-label-md disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                {exporting === "pdf" ? "Generando..." : "Exportar reporte PDF"}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!metrics || exporting !== null}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-secondary text-on-secondary px-space-md py-2 text-label-md disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">table</span>
                {exporting === "excel" ? "Generando..." : "Exportar a Excel"}
              </button>
            </div>
          </div>

          {loading && <p className="text-body-md text-on-surface-variant">Calculando indicadores...</p>}

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-space-md">
              {KPI_DEFS.map((def) => (
                <KpiCard
                  key={def.id}
                  id={def.id}
                  icon={def.icon}
                  label={def.label}
                  value={def.getValue(metrics)}
                  suffix={
                    def.dataKey === "activePulseRate"
                      ? headcount > 0
                        ? `~${metrics.avgPerWeek} / ${headcount} por semana`
                        : `~${metrics.avgPerWeek} por semana`
                      : def.getSuffix(metrics)
                  }
                  delta={
                    previousMetrics
                      ? def.dataKey === "attritionRisk"
                        ? (() => {
                            const d = delta(metrics.attritionRisk, previousMetrics.attritionRisk);
                            return d !== null ? `${d}%` : null;
                          })()
                        : delta(metrics[def.dataKey], previousMetrics[def.dataKey])
                      : null
                  }
                  deltaDirection={
                    previousMetrics && delta(metrics[def.dataKey], previousMetrics[def.dataKey]) < 0
                      ? "down"
                      : "up"
                  }
                  footerLabel={def.getFooterLabel(metrics)}
                  footerValue={def.getFooterValue(metrics)}
                  onExpand={() => handleExpand(def)}
                />
              ))}

              {/* Ausentismo digital (Fase E) */}
              {(absence || absenceLoading) && (
                <div className="motion-card bg-surface-container-lowest p-space-lg flex flex-col justify-between animate-enter">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                        Ausentismo digital (30 días)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-display-lg text-on-surface leading-none">
                          {absenceLoading ? "…" : `${absence?.rate ?? 0}%`}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container flex-shrink-0">
                      <span className="material-symbols-outlined text-[22px]">person_off</span>
                    </div>
                  </div>
                  <div className="mt-space-md flex flex-col">
                    <span className="text-body-sm text-on-surface-variant">
                      Días sin actividad en horario laboral
                    </span>
                    <span className="text-label-sm text-on-surface font-semibold">
                      {absenceLoading
                        ? "Calculando..."
                        : absence && absence.workDays > 0
                          ? `${absence.absentDays} de ${absence.workDays} días esperados`
                          : "Sin registros aún (se calcula cada noche)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !metrics && (
            <p className="text-body-md text-on-surface-variant">
              No se pudieron cargar los indicadores. Revisa tu conexión o los permisos de tu cuenta.
            </p>
          )}

          {deptRows && (
            <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-space-md items-stretch">
              <RiskHeatmap rows={deptRows} />
              <AIStrategistPanel
                orgMetrics={metrics}
                departmentRisk={deptRows}
                openComments={comments}
                onAnalysisChange={setAiMarkdown}
              />
            </div>
          )}
          {deptLoading && <p className="text-body-md text-on-surface-variant">Calculando matriz de riesgo...</p>}
          {deptRows && <RiskAlertBanner rows={deptRows} />}

          {trend && hotspots && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              <WeeklySentimentTrend rows={trend} />
              <FrictionHotspots items={hotspots} />
            </div>
          )}
          {sentimentLoading && (
            <p className="text-body-md text-on-surface-variant">Analizando sentimiento de comentarios...</p>
          )}
        </div>
      </main>

      <AnimatePresence>
        {expanded && metrics && (
          <MetricDetailModal
            layoutId={expanded.id}
            title={expanded.label}
            value={expanded.getValue(metrics)}
            suffix={expanded.getSuffix(metrics)}
            explanation={explanations[expanded.id]}
            loadingExplanation={loadingExplanation}
            trendData={weeklyTrends}
            departmentRows={deptRows}
            dataKey={expanded.dataKey}
            onClose={() => setExpanded(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}