import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import KpiCard from "../components/KpiCard";
import { useOrgHealthMetrics } from "../hooks/useOrgHealthMetrics";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import RiskHeatmap from "../components/RiskHeatmap";
import RiskAlertBanner from "../components/RiskAlertBanner";
import AIStrategistPanel from "../components/AIStrategistPanel";
import { explainMetric } from "../services/aiService";
import { useWeeklySentiment } from "../hooks/useWeeklySentiment";
import WeeklySentimentTrend from "../components/WeeklySentimentTrend";
import FrictionHotspots from "../components/FrictionHotspots";

function delta(current, previous) {
  if (previous === undefined || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return null; // no mostrar badge si no hubo cambio real
  return diff;
}

export default function Dashboard() {
  const { metrics, previousMetrics, loading, error } = useOrgHealthMetrics();
  const { rows: deptRows, loading: deptLoading } = useDepartmentRisk();
  const { trend, hotspots, loading: sentimentLoading } = useWeeklySentiment();

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
          {error && <p className="text-error text-body-md">Ocurrió un error al cargar los datos.</p>}

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
              <KpiCard
                icon="sentiment_very_satisfied"
                label="Net Employee Health (eNPS)"
                value={metrics.enps}
                delta={previousMetrics ? delta(metrics.enps, previousMetrics.enps) : null}
                deltaDirection={
                  previousMetrics && delta(metrics.enps, previousMetrics.enps) < 0 ? "down" : "up"
                }
                footerLabel="Muestra del periodo"
                footerValue={`${metrics.sampleSize} respuestas`}
                onExplain={() => explainMetric({
                  label: "eNPS (Net Employee Health)",
                  context: {
                    valorActual: metrics.enps,
                    valorAnterior: previousMetrics?.enps,
                    muestra: metrics.sampleSize,
                  },
                })}
              />
              {(() => {
  const attritionDelta = previousMetrics
    ? delta(metrics.attritionRisk, previousMetrics.attritionRisk)
    : null;

  return (
    <KpiCard
      icon="trending_down"
      label="90-Day Attrition Risk (modelado)"
      value={`${metrics.attritionRisk}%`}
      delta={attritionDelta !== null ? `${attritionDelta}%` : null}
      deltaDirection={attritionDelta !== null && attritionDelta > 0 ? "up" : "down"}
      footerLabel="Basado en"
      footerValue="Fatiga + carga emocional reportada"
      onExplain={() => explainMetric({
        label: "90-Day Attrition Risk",
        context: {
          valorActual: metrics.attritionRisk,
          valorAnterior: previousMetrics?.attritionRisk,
          muestra: metrics.sampleSize,
        },
      })}
    />
  );
})()}
              <KpiCard
                icon="how_to_reg"
                label="Active Pulse Sample"
                value={`${metrics.activePulseRate}%`}
                suffix={`~${metrics.avgPerWeek} / 78 por semana`}
                footerLabel="Participación semanal promedio"
                footerValue={`${metrics.sampleSize} respuestas totales (30 días)`}
                onExplain={() => explainMetric({
                  label: "Active Pulse Sample",
                  context: {
                    valorActual: metrics.activePulseRate,
                    valorAnterior: previousMetrics?.activePulseRate,
                    promedioSemanal: metrics.avgPerWeek,
                    muestra: metrics.sampleSize,
                  },
                })}
              />
              <KpiCard
                icon="verified_user"
                label="Psychological Safety Index"
                value={metrics.psychSafety}
                suffix="/ 5.0"
                footerLabel="Promedio del periodo"
                footerValue={metrics.psychSafety >= 3.5 ? "Estable" : "Requiere atención"}
                onExplain={() => explainMetric({
                  label: "Psychological Safety Index",
                  context: {
                    valorActual: metrics.psychSafety,
                    valorAnterior: previousMetrics?.psychSafety,
                    escala: "1-5",
                    muestra: metrics.sampleSize,
                  },
                })}
              />
            </div>
          )}

          {deptRows && metrics && (
            <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-space-md items-stretch">
              <RiskHeatmap rows={deptRows} />
              <AIStrategistPanel orgMetrics={metrics} departmentRisk={deptRows} />
            </div>
          )}
          {deptRows && <RiskAlertBanner rows={deptRows} />}
          {trend && hotspots && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              <WeeklySentimentTrend rows={trend} />
              <FrictionHotspots items={hotspots} />
            </div>
          )}
          {sentimentLoading && <p className="text-body-md text-on-surface-variant">Analizando sentimiento de comentarios...</p>}
          {deptLoading && <p className="text-body-md text-on-surface-variant">Calculando matriz de riesgo...</p>}
        </div>
      </main>
    </div>
  );
}