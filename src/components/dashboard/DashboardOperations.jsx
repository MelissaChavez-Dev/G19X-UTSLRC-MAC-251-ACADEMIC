import { memo } from "react";
import { getKpiLevel, LEVELS, MIN_SAMPLE } from "../../data/kpiThresholds";
import teamIllustration from "../../assets/ilust 2.png";
import { LevelBadge, SectionHeading } from "./DashboardPulse";

/* Tarjeta sencilla para lo operativo (no abre modal). */
function OpsTile({ icon, label, period, value, hint, level }) {
  return (
    <div style={{ borderRadius: 32 }} className="flex flex-col gap-space-sm bg-surface-container-low p-space-lg">
      <div className="flex items-center justify-between gap-space-sm text-on-surface-variant">
        <span className="flex min-w-0 items-center gap-space-xs">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            {icon}
          </span>
          <span className="truncate text-label-md font-semibold text-on-surface">{label}</span>
        </span>
        {period && <span className="shrink-0 text-label-sm">{period}</span>}
      </div>
      <div className="flex items-baseline gap-space-sm">
        <span className="text-3xl font-bold leading-none text-on-surface">{value}</span>
        <LevelBadge level={level} />
      
      </div>
      <p className="text-label-sm text-on-surface-variant">{hint}</p>
    </div>
  );
}



const OperationStrip = memo(function OperationStrip({
  absence,
  absenceLoading,
  turnover,
  turnoverLoading,
  performance,
  performanceLoading,
}) {
  const showAbsence = Boolean(absence) || absenceLoading;
  const showTurnover = Boolean(turnover) || turnoverLoading;
  const showPerformance = Boolean(performance) || performanceLoading;
  if (!showAbsence && !showTurnover && !showPerformance) return null;

  const hasWorkdayRecords = Boolean(absence && absence.eligibleWorkDays > 0);
  const turnoverDiff =
    turnover && Number.isFinite(turnover.rate) && Number.isFinite(turnover.previousRate)
      ? Math.round((turnover.rate - turnover.previousRate) * 10) / 10
      : null;
  const punctualityHint = Number.isFinite(performance?.punctualityRate)
    ? `Puntualidad: ${performance.punctualityRate}% (${performance.punctualitySample} ${
      performance.punctualitySample === 1 ? "tarea terminada" : "tareas terminadas"
    } con fecha límite).`
    : "Puntualidad: sin tareas terminadas con fecha límite y fecha de cierre medible.";
  const performanceHint = performance?.totalTasks
    ? `${performance.doneTasks}/${performance.totalTasks} hechas, ${performance.overdueTasks} vencidas. ${punctualityHint}`
    : `Sin tareas registradas aún. ${punctualityHint}`;

  return (
    <section aria-labelledby="ops-heading" className="flex flex-col gap-space-sm">
      <SectionHeading id="ops-heading" title="Operación del equipo" />
      <div className="grid grid-cols-1 items-center gap-space-md xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
          {showAbsence && (
            <OpsTile
              icon="person_off"
              label="Ausentismo"
              level={absenceLoading ? undefined : hasWorkdayRecords ? getKpiLevel("digitalAbsence", absence?.rate) : LEVELS.noData} // KPI-LEVEL
              period="30 días"
              value={absenceLoading ? "…" : Number.isFinite(absence?.rate) ? `${absence.rate}%` : "—"}
              hint={
                absenceLoading
                  ? "Calculando..."
                  : hasWorkdayRecords
                    ? `${absence.unjustifiedDays} jornadas sin actividad digital no cubiertas por permiso; ${absence.justifiedDays} cubiertas.`
                    : absence?.workDays > 0
                      ? "Todas las jornadas sin actividad digital están cubiertas por permisos aprobados."
                      : "Sin registros aún, se calcula cada noche"
              }
            />
          )}
          {showTurnover && (
            <OpsTile
              icon="logout"
              label="Rotación real"
              level={turnoverLoading ? undefined : turnover?.headcount >= MIN_SAMPLE.headcount ? getKpiLevel("turnover90d", turnover?.rate) : LEVELS.noData} // KPI-LEVEL
              period="90 días"
              value={turnoverLoading ? "…" : Number.isFinite(turnover?.rate) ? `${turnover.rate}%` : "—"}
              diff={turnoverDiff}
              hint={
                turnoverLoading
                  ? "Calculando..."
                  : `${turnover?.departures ?? 0} bajas sobre ${turnover?.headcount ?? 0} activos`
              }
            />
          )}
          {showPerformance && (
            <OpsTile
              icon="task_alt"
              label="Tareas al corriente"
              level={performanceLoading ? undefined : performance?.levels?.onTrack} // KPI-LEVEL
              value={performanceLoading ? "…" : Number.isFinite(performance?.onTimeRate) ? `${performance.onTimeRate}%` : "—"}
              hint={
                performanceLoading
                  ? "Calculando..."
                  : performanceHint
              }
            />
          )}
        </div>
        <img
          src={teamIllustration}
          alt=""
          aria-hidden="true"
          className="mx-auto h-auto w-48 object-contain xl:mx-0 xl:ml-auto xl:w-80"
        />
      </div>
    </section>
  );
});

export default OperationStrip;
