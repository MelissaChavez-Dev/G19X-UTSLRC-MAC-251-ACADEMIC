import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import KpiCard from "../components/KpiCard";
import RiskHeatmap from "../components/RiskHeatmap";
import RiskAlertBanner from "../components/RiskAlertBanner";
import WeeklySentimentTrend from "../components/WeeklySentimentTrend";
import FrictionHotspots from "../components/FrictionHotspots";
import MetricDetailModal from "../components/MetricDetailModal";
import { useOrgHealthMetrics } from "../hooks/useOrgHealthMetrics";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useWeeklySentiment } from "../hooks/useWeeklySentiment";
import { useWeeklyTrends } from "../hooks/useWeeklyTrends";
import { explainMetric } from "../services/aiService";

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
    label: "Net Employee Health (eNPS)",
    dataKey: "enps",
    getValue: (m) => m.enps,
    getSuffix: () => null,
    getFooterLabel: () => "Muestra del periodo",
    getFooterValue: (m) => `${m.sampleSize} respuestas`,
  },
  {
    id: "kpi-attrition",
    icon: "trending_down",
    label: "90-Day Attrition Risk (modelado)",
    dataKey: "attritionRisk",
    getValue: (m) => `${m.attritionRisk}%`,
    getSuffix: () => null,
    getFooterLabel: () => "Basado en",
    getFooterValue: () => "Fatiga + carga emocional reportada",
  },
  {
    id: "kpi-pulse",
    icon: "how_to_reg",
    label: "Active Pulse Sample",
    dataKey: "activePulseRate",
    getValue: (m) => `${m.activePulseRate}%`,
    getSuffix: (m) => `~${m.avgPerWeek} / 78 por semana`,
    getFooterLabel: () => "Participación semanal promedio",
    getFooterValue: (m) => `${m.sampleSize} respuestas totales (30 días)`,
  },
  {
    id: "kpi-safety",
    icon: "verified_user",
    label: "Psychological Safety Index",
    dataKey: "psychSafety",
    getValue: (m) => m.psychSafety,
    getSuffix: () => "/ 5.0",
    getFooterLabel: () => "Promedio del periodo",
    getFooterValue: (m) => (m.psychSafety >= 3.5 ? "Estable" : "Requiere atención"),
  },
];

export default function Dashboard() {
  const { metrics, previousMetrics, loading } = useOrgHealthMetrics();
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk();
  const { trend, hotspots, loading: sentimentLoading } = useWeeklySentiment();
  const { trends: weeklyTrends } = useWeeklyTrends();

  const [expanded, setExpanded] = useState(null); // { id, def }
  const [explanations, setExplanations] = useState({});
  const [loadingExplanation, setLoadingExplanation] = useState(false);

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
        ? "Se alcanzó el límite diario de consultas a la IA en el nivel gratuito. Vuelve a intentar mañana, o activa facturación en Google AI Studio para límites más altos."
        : text;
      setExplanations((prev) => ({ ...prev, [def.id]: explanation }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      const explanation = /429|RESOURCE_EXHAUSTED/i.test(errorText)
        ? "Se alcanzó el límite diario de consultas a la IA en el nivel gratuito. Vuelve a intentar mañana, o activa facturación en Google AI Studio para límites más altos."
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
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-16">
        <div className="px-space-xl py-space-lg flex flex-col gap-space-md">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs mb-1">
              <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
                Executive Intelligence
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="text-label-sm text-on-surface-variant font-medium">
                Cohorte: {metrics ? metrics.sampleSize : "..."} respuestas (30 días)
              </span>
            </div>
            <h1 className="text-headline-xl text-on-surface tracking-tight">
              Diagnóstico Psicosocial y Salud Estratégica
            </h1>
          </div>

          {loading && <p className="text-body-md text-on-surface-variant">Calculando indicadores...</p>}

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
              {KPI_DEFS.map((def) => (
                <KpiCard
                  key={def.id}
                  id={def.id}
                  icon={def.icon}
                  label={def.label}
                  value={def.getValue(metrics)}
                  suffix={def.getSuffix(metrics)}
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
            </div>
          )}

          {deptRows && (
            <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-space-md items-stretch">
              <RiskHeatmap rows={deptRows} />
              <div className="bg-primary-container rounded-xl shadow-sm p-space-lg flex flex-col h-full">
                <div className="flex items-center gap-space-sm mb-1">
                  <span className="material-symbols-outlined text-secondary-container text-[22px]">
                    auto_awesome
                  </span>
                  <h2 className="text-headline-sm text-on-primary">Gemini AI Strategist</h2>
                </div>
                <p className="text-body-sm text-inverse-on-surface opacity-80">
                  Usa el panel de estrategia general más abajo, o expande cualquier tarjeta KPI
                  para un análisis puntual.
                </p>
              </div>
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
            dataKey={expanded.dataKey}
            onClose={() => setExpanded(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}