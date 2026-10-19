import { getKpiLevel, getKpiLevelForSample, LEVELS, MIN_SAMPLE } from "../data/kpiThresholds";

export function departmentName(id, departments = []) {
  return departments.find((department) => department.id === id)?.name || id || "Todos los departamentos";
}

export function todayLabel() {
  return new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function dashboardKpiRows({ metrics, absence, turnover, performance, headcount }) {
  const responseSample = metrics?.sampleSize ?? 0;
  const responseLevel = (key, value) =>
    responseSample > 0 && responseSample < MIN_SAMPLE.responses
      ? `Preliminar (${responseSample}/${MIN_SAMPLE.responses})`
      : getKpiLevelForSample(key, value, responseSample).label;
  const psychosocialSample = metrics?.psychosocialSampleSize ?? 0;
  const psychosocialLevel = (key, value) =>
    psychosocialSample > 0 && psychosocialSample < MIN_SAMPLE.responses
      ? `Preliminar (${psychosocialSample}/${MIN_SAMPLE.responses})`
      : getKpiLevelForSample(key, value, psychosocialSample).label;
  const participationLevel = headcount >= MIN_SAMPLE.headcount && responseSample >= MIN_SAMPLE.responses
    ? getKpiLevel("participation", metrics?.activePulseRate)
    : responseSample > 0
      ? `Preliminar (${responseSample}/${MIN_SAMPLE.responses})`
      : LEVELS.noData;

  return [
    { metric: "Salud neta del equipo (eNPS)", value: metrics?.enps ?? "—", level: responseLevel("enps", metrics?.enps) },
    { metric: "Índice de presión laboral", value: Number.isFinite(metrics?.attritionRisk) ? `${metrics.attritionRisk}/100` : "—", level: psychosocialLevel("workPressure", metrics?.attritionRisk) },
    {
      metric: "Balance vida-trabajo",
      value: Number.isFinite(metrics?.workLifeBalance) ? `${metrics.workLifeBalance}/10` : "—",
      level: responseSample > 0 && responseSample < MIN_SAMPLE.responses
        ? `Preliminar (${responseSample}/${MIN_SAMPLE.responses})`
        : "Sin umbral definido",
    },
    { metric: "Participación en pulsos", value: Number.isFinite(metrics?.activePulseRate) ? `${metrics.activePulseRate}%` : "—", level: participationLevel.label },
    { metric: "Seguridad psicológica", value: Number.isFinite(metrics?.psychSafety) ? `${metrics.psychSafety}/5` : "—", level: psychosocialLevel("psychSafety", metrics?.psychSafety) },
    {
      metric: "Actividad digital no registrada",
      value: Number.isFinite(absence?.rate) ? `${absence.rate}%` : "—",
      level: getKpiLevelForSample("digitalAbsence", absence?.rate, absence?.workDays, 1).label,
    },
    {
      metric: "Rotación real (90 días)",
      value: Number.isFinite(turnover?.rate) ? `${turnover.rate}%` : "—",
      level: getKpiLevelForSample("turnover90d", turnover?.rate, turnover?.headcount, MIN_SAMPLE.headcount).label,
    },
    { metric: "Tareas al corriente", value: Number.isFinite(performance?.onTimeRate) ? `${performance.onTimeRate}%` : "—", level: performance?.levels?.onTrack?.label ?? LEVELS.noData.label },
    { metric: "Cumplimiento de tareas", value: Number.isFinite(performance?.completionRate) ? `${performance.completionRate}%` : "—", level: performance?.levels?.completion?.label ?? LEVELS.noData.label },
    {
      metric: "Puntualidad de tareas",
      value: Number.isFinite(performance?.punctualityRate)
        ? `${performance.punctualityRate}% (${performance.punctualitySample} tareas)`
        : "—",
      level: "Sin umbral definido",
    },
    { metric: "Respuestas evaluadas", value: responseSample, level: "—" },
  ];
}
