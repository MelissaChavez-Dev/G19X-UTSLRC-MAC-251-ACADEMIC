import { memo } from "react";
import RiskHeatmap from "../RiskHeatmap";
import AIStrategistPanel from "../AIStrategistPanel";
import DepartmentSentimentTrend from "../DepartmentSentimentTrend";
import FrictionHotspots from "../FrictionHotspots";
import FrictionSourceChart from "../FrictionSourceChart";
import riskIllustration from "../../assets/ilust4.png";

const MemoRiskHeatmap = memo(RiskHeatmap);
const MemoAIStrategistPanel = memo(AIStrategistPanel);
const MemoDepartmentSentimentTrend = memo(DepartmentSentimentTrend);
const MemoFrictionHotspots = memo(FrictionHotspots);

export default function DashboardInsights({
  deptRows, metrics, comments, aiMarkdown, aiSummaryMinimized,
  setAiMarkdown, setAiSummaryMinimized, deptLoading, trend, hotspots,
  frictionSources, frictionSourcesLoading, frictionSourcesError,
  sentimentLoading, sentimentError,
}) {
  return (
    <>
          {/* 4. Dónde está el riesgo */}
          {deptRows && (
            <div className="grid grid-cols-1 items-start gap-space-md xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
              <div className="flex min-w-0 self-stretch flex-col">
                <MemoRiskHeatmap rows={deptRows} />
                {aiMarkdown && !aiSummaryMinimized && (
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                    <img
                      src={riskIllustration}
                      alt=""
                      aria-hidden="true"
                      className="h-full min-h-0 w-full object-contain"
                    />
                  </div>
                )}
              </div>
              <MemoAIStrategistPanel
                orgMetrics={metrics}
                departmentRisk={deptRows}
                openComments={comments}
                onAnalysisChange={setAiMarkdown}
                minimized={aiSummaryMinimized}
                onMinimizedChange={setAiSummaryMinimized}
              />
            </div>
          )}
          {deptLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Calculando matriz de riesgo...
            </p>
          )}

          {/* 5. Qué dicen los comentarios */}
          {trend && hotspots && (
            <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
              <MemoDepartmentSentimentTrend rows={trend} />
              <MemoFrictionHotspots items={hotspots} />
            </div>
          )}
          <FrictionSourceChart
            items={frictionSources}
            loading={frictionSourcesLoading}
            error={frictionSourcesError}
          />
          {sentimentLoading && (
            <p role="status" className="text-body-md text-on-surface-variant">
              Analizando sentimiento de comentarios...
            </p>
          )}
          {sentimentError && (
            <p role="alert" className="rounded-2xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
              No se pudo analizar el sentimiento de los comentarios. Revisa la conexión y los permisos para volver a intentarlo.
            </p>
          )}

    </>
  );
}
