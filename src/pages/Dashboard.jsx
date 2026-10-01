import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { useDepartments } from "../hooks/useDepartments";
import { explainMetric } from "../services/aiService";
import { exportDashboardPdf, exportResponsesExcel } from "../services/exportService";

/* ------------------------------------------------------------------
   Versiones memoizadas de los componentes pesados.
   Al abrir/cerrar el modal cambia el estado de Dashboard; con memo,
   React no vuelve a dibujar el heatmap, el panel de IA, etc. mientras
   corre la animación (esa era una causa probable del trabado al cerrar).
------------------------------------------------------------------- */
const MemoSidebar = memo(Sidebar);
const MemoTopBar = memo(TopBar);
const MemoRiskHeatmap = memo(RiskHeatmap);
const MemoRiskAlertBanner = memo(RiskAlertBanner);
const MemoAIStrategistPanel = memo(AIStrategistPanel);
const MemoWeeklySentimentTrend = memo(WeeklySentimentTrend);
const MemoFrictionHotspots = memo(FrictionHotspots);

const RATE_LIMIT_MESSAGE =
  "Se alcanzó el límite diario de consultas automáticas. Vuelve a intentarlo mañana o activa una cuenta con límites más altos.";
const GENERIC_ERROR_MESSAGE = "No se pudo generar la explicación en este momento. Ábrela de nuevo para reintentar.";
const EXPORT_ERROR_MESSAGE = "No se pudo generar el archivo. Inténtalo de nuevo.";

const isRateLimit = (text) => /429|RESOURCE_EXHAUSTED/i.test(text);

function change(current, previous) {
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
    getSuffix: (m) => `~${m.avgPerWeek}`,
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

/* Una tarjeta KPI con sus props ya calculadas. Solo se redibuja si cambian
   sus datos, no cuando se abre o cierra el modal. */
const KpiTile = memo(function KpiTile({ def, metrics, previousMetrics, headcount, onExpand }) {
  const diff = previousMetrics ? change(metrics[def.dataKey], previousMetrics[def.dataKey]) : null;
  const deltaLabel = diff === null ? null : def.dataKey === "attritionRisk" ? `${diff}%` : diff;

  const suffix =
    def.dataKey === "activePulseRate"
      ? headcount > 0
        ? `~${metrics.avgPerWeek} / ${headcount} por semana`
        : `~${metrics.avgPerWeek} por semana`
      : def.getSuffix(metrics);

  return (
    <KpiCard
      id={def.id}
      icon={def.icon}
      label={def.label}
      value={def.getValue(metrics)}
      suffix={suffix}
      delta={deltaLabel}
      deltaDirection={diff !== null && diff < 0 ? "down" : "up"}
      footerLabel={def.getFooterLabel(metrics)}
      footerValue={def.getFooterValue(metrics)}
      onExpand={() => onExpand(def)}
    />
  );
});

/* Ausentismo digital (Fase E): mismo aspecto que KpiCard para que el grupo sea coherente */
const AbsenceCard = memo(function AbsenceCard({ absence, loading }) {
  const hasWorkdayRecords = Boolean(absence && absence.workDays > 0);

  return (
    <KpiCard
      id="kpi-digital-absence"
      icon="person_off"
      label="Ausentismo digital (30 días)"
      value={loading ? "…" : `${absence?.rate ?? 0}%`}
      footerLabel="Días sin actividad en horario laboral"
      footerValue={loading
        ? "Calculando..."
        : hasWorkdayRecords
          ? `${absence.absentDays} de ${absence.workDays} días esperados`
          : "Sin registros aún (se calcula cada noche)"}
      showAction={false}
    />
  );
});

const DONUT_RADIUS = 42;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function DonutGauge({ label, value, scale, progress, color, available }) {
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const valueText = available ? value : "—";

  return (
    <div
      role="img"
      aria-label={`${label}: ${available ? `${value} ${scale}` : "sin datos"}`}
      className="flex min-w-0 flex-col items-center gap-2 py-2"
    >
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={DONUT_RADIUS}
            fill="none"
            stroke="var(--surface-container-high)"
            strokeWidth="9"
          />
          <circle
            cx="50"
            cy="50"
            r={DONUT_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={DONUT_CIRCUMFERENCE}
            strokeDashoffset={DONUT_CIRCUMFERENCE * (1 - normalizedProgress)}
            transform="rotate(-90 50 50)"
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold leading-none text-on-surface">{valueText}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-label-md font-semibold text-on-surface">{label}</p>
        <p className="text-label-sm text-on-surface-variant">
          {available ? scale : "Sin datos"}
        </p>
      </div>
    </div>
  );
}

const KpiDonutOverview = memo(function KpiDonutOverview({ metrics, absence }) {
  const hasResponses = metrics.sampleSize > 0;
  const hasAbsenceData = absence?.workDays > 0;
  const clampPercent = (value) => Math.max(0, Math.min(100, value)) / 100;
  const indicators = [
    {
      label: "Salud neta (eNPS)",
      value: hasResponses ? String(metrics.enps) : "—",
      scale: "escala −100 a +100",
      progress: hasResponses ? (metrics.enps + 100) / 200 : 0,
      color: "var(--primary)",
      available: hasResponses,
    },
    {
      label: "Riesgo de rotación",
      value: hasResponses ? `${metrics.attritionRisk}%` : "—",
      scale: "de 0 a 100%",
      progress: hasResponses ? clampPercent(metrics.attritionRisk) : 0,
      color: "var(--error)",
      available: hasResponses,
    },
    {
      label: "Participación",
      value: hasResponses ? `${metrics.activePulseRate}%` : "—",
      scale: "de 0 a 100%",
      progress: hasResponses ? clampPercent(metrics.activePulseRate) : 0,
      color: "var(--success)",
      available: hasResponses,
    },
    {
      label: "Seguridad psicológica",
      value: hasResponses ? metrics.psychSafety.toFixed(1) : "—",
      scale: "de 0 a 5",
      progress: hasResponses ? Math.max(0, Math.min(5, metrics.psychSafety)) / 5 : 0,
      color: "var(--secondary)",
      available: hasResponses,
    },
    {
      label: "Ausentismo digital",
      value: hasAbsenceData ? `${absence.rate}%` : "—",
      scale: "últimos 30 días",
      progress: hasAbsenceData ? clampPercent(absence.rate) : 0,
      color: "var(--warning)",
      available: hasAbsenceData,
    },
  ];

  return (
    <section aria-labelledby="kpi-donut-heading" className="flex flex-col gap-space-sm">
      <div className="flex flex-col gap-0.5">
        <h2 id="kpi-donut-heading" className="text-headline-sm text-on-surface">
          Indicadores en perspectiva
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Cada escala se normaliza para mostrar su avance de forma visual.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-space-sm">
        {indicators.map((indicator) => (
          <DonutGauge key={indicator.label} {...indicator} />
        ))}
      </div>
    </section>
  );
});

/* Marcadores de posición mientras cargan los KPIs (evita saltos de diseño) */
function KpiSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-space-md" role="status" aria-label="Calculando indicadores">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-shimmer min-h-[16rem]" style={{ borderRadius: 36 }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [departmentId, setDepartmentId] = useState(null);
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();
  const { metrics, previousMetrics, loading, headcount } = useOrgHealthMetrics(departmentId);
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk(departmentId);
  const { trend, hotspots, comments, loading: sentimentLoading } = useWeeklySentiment(departmentId);
  const { trends: weeklyTrends } = useWeeklyTrends(departmentId);
  const { absence, loading: absenceLoading } = useAbsenceMetrics(departmentId);

  const [expanded, setExpanded] = useState(null); // definición del KPI abierto
  const [explanations, setExplanations] = useState({}); // explicaciones guardadas (incluye límite 429)
  const [failedIds, setFailedIds] = useState({}); // errores pasajeros: NO se guardan, permiten reintentar
  const [loadingId, setLoadingId] = useState(null); // id del KPI que se está analizando
  const [aiMarkdown, setAiMarkdown] = useState("");
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
        exportDashboardPdf({ metrics, deptRows: deptRows || [], aiMarkdown, departmentId, departments });
      } else {
        await exportResponsesExcel({ metrics, deptRows: deptRows || [], departments });
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
          muestra: m.sampleSize,
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
      <MemoTopBar departmentId={departmentId} onDepartmentChange={setDepartmentId} />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="px-space-xl py-space-lg flex flex-col gap-space-md">
          <div className="flex flex-col gap-space-sm">
            <span className="self-start inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-secondary" />
              {metrics ? metrics.sampleSize : "…"} respuestas en los últimos 30 días
            </span>
            <h1 className="text-headline-xl text-on-surface">Diagnóstico Psicosocial y Salud Estratégica</h1>
            <div className="flex flex-wrap gap-space-sm">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={!metrics || exporting !== null}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-error text-on-error px-space-md py-2 text-label-md disabled:opacity-50"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                {exporting === "pdf" ? "Generando..." : "Exportar reporte PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleExport("excel")}
                disabled={!metrics || exporting !== null}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-success text-[var(--on-accent)] px-space-md py-2 text-label-md disabled:opacity-50"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">table</span>
                {exporting === "excel" ? "Generando..." : "Exportar a Excel"}
              </button>
            </div>
            {exportError && (
              <p role="alert" className="self-start rounded-full bg-error-container text-on-error-container px-3 py-1 text-label-md">
                {exportError}
              </p>
            )}
          </div>

          {loading && !metrics && <KpiSkeletons />}

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-space-md">
              {KPI_DEFS.map((def) => (
                <KpiTile
                  key={def.id}
                  def={def}
                  metrics={metrics}
                  previousMetrics={previousMetrics}
                  headcount={headcount}
                  onExpand={handleExpand}
                />
              ))}

              {(absence || absenceLoading) && <AbsenceCard absence={absence} loading={absenceLoading} />}
            </div>
          )}

          {!loading && !metrics && (
            <p role="status" className="text-body-md text-on-surface-variant">
              No se pudieron cargar los indicadores. Revisa tu conexión o los permisos de tu cuenta.
            </p>
          )}

          {deptRows && (
            <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-space-md items-stretch">
              <MemoRiskHeatmap rows={deptRows} />
              <MemoAIStrategistPanel
                orgMetrics={metrics}
                departmentRisk={deptRows}
                openComments={comments}
                onAnalysisChange={setAiMarkdown}
              />
            </div>
          )}
          {deptLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Calculando matriz de riesgo...
            </p>
          )}
          {deptRows && <MemoRiskAlertBanner rows={deptRows} />}

          {metrics && (
            <KpiDonutOverview metrics={metrics} absence={absence} />
          )}

          {trend && hotspots && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              <MemoWeeklySentimentTrend rows={trend} />
              <MemoFrictionHotspots items={hotspots} />
            </div>
          )}
          {sentimentLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Analizando sentimiento de comentarios...
            </p>
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