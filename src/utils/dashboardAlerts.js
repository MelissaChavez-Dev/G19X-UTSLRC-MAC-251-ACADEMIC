import {
  ALERT_RULES,
  getKpiLevelForSample,
  LEVELS,
  MIN_SAMPLE,
} from "../data/kpiThresholds";

function isAlertLevel(level) {
  return level?.tone === "elevated" || level?.tone === "critical";
}

export function buildDashboardAlerts({
  metrics,
  previousMetrics,
  headcount = 0,
  departmentRows = [],
  absence,
  turnover,
  performance,
  departments = [],
}) {
  const alerts = [];
  const addLevelAlert = (id, label, value, level, detail = "") => {
    if (!isAlertLevel(level)) return;
    alerts.push({
      id,
      severity: level.tone,
      title: `${label}: ${level.label.toLowerCase()}`,
      detail: `${value}${detail ? ` · ${detail}` : ""}`,
    });
  };

  const enoughResponseData = metrics?.sampleSize >= MIN_SAMPLE.responses
    && headcount >= MIN_SAMPLE.headcount;

  if (enoughResponseData) {
    addLevelAlert(
      "org-enps",
      "Salud neta del equipo",
      `${metrics.enps} puntos`,
      getKpiLevelForSample("enps", metrics.enps, metrics.sampleSize)
    );
    addLevelAlert(
      "org-pressure",
      "Presión laboral",
      `${metrics.attritionRisk ?? "—"}/100`,
      getKpiLevelForSample("workPressure", metrics.attritionRisk, metrics.psychosocialSampleSize)
    );

    const participationLevel = getKpiLevelForSample(
      "participation",
      metrics.activePulseRate,
      headcount,
      MIN_SAMPLE.headcount
    );
    addLevelAlert(
      "org-participation",
      "Participación en pulsos",
      `${metrics.activePulseRate}%`,
      participationLevel,
      participationLevel.tone === "critical"
        ? "los demás indicadores tienen baja representatividad"
        : ""
    );

    addLevelAlert(
      "org-safety",
      "Seguridad psicológica",
      `${metrics.psychSafety ?? "—"}/5`,
      getKpiLevelForSample("psychSafety", metrics.psychSafety, metrics.psychosocialSampleSize)
    );

    if (
      previousMetrics?.sampleSize >= MIN_SAMPLE.responses
      && metrics.enps - previousMetrics.enps <= -ALERT_RULES.enpsDrop
    ) {
      alerts.push({
        id: "enps-drop",
        severity: "critical",
        title: "Caída brusca del eNPS",
        detail: `Disminuyó ${Math.abs(metrics.enps - previousMetrics.enps)} puntos frente al periodo anterior.`,
      });
    }
    if (
      previousMetrics?.psychosocialSampleSize >= MIN_SAMPLE.responses
      && Number.isFinite(metrics.attritionRisk)
      && Number.isFinite(previousMetrics.attritionRisk)
      && metrics.attritionRisk - previousMetrics.attritionRisk >= ALERT_RULES.workPressureRise
    ) {
      alerts.push({
        id: "pressure-rise",
        severity: "critical",
        title: "Aumento brusco de la presión laboral",
        detail: `Subió ${metrics.attritionRisk - previousMetrics.attritionRisk} puntos frente al periodo anterior.`,
      });
    }
  }

  departmentRows.forEach((row) => {
    if (row.sampleSize < MIN_SAMPLE.responses || row.headcount < MIN_SAMPLE.headcount) return;
    const departmentName = row.name || row.id;
    const riskLevel = getKpiLevelForSample("psychosocialRisk", row.avgRisk, row.psychosocialSampleSize);
    addLevelAlert(
      `department-risk-${row.id}`,
      `${departmentName} · Riesgo psicosocial`,
      Number.isFinite(row.avgRisk) ? `${row.avgRisk.toFixed(1)}/5` : "Sin datos",
      riskLevel
    );
    addLevelAlert(
      `department-enps-${row.id}`,
      `${departmentName} · Salud neta`,
      `${row.enps ?? "—"} puntos`,
      getKpiLevelForSample("enps", row.enps, row.sampleSize)
    );
    addLevelAlert(
      `department-pressure-${row.id}`,
      `${departmentName} · Presión laboral`,
      `${row.attritionRisk ?? "—"}/100`,
      getKpiLevelForSample("workPressure", row.attritionRisk, row.psychosocialSampleSize)
    );
    addLevelAlert(
      `department-participation-${row.id}`,
      `${departmentName} · Participación`,
      `${row.activePulseRate ?? "—"}%`,
      getKpiLevelForSample("participation", row.activePulseRate, row.headcount, MIN_SAMPLE.headcount)
    );
    addLevelAlert(
      `department-safety-${row.id}`,
      `${departmentName} · Seguridad psicológica`,
      `${row.factors?.psychSafety ?? "—"}/5`,
      getKpiLevelForSample("psychSafety", row.factors?.psychSafety, row.psychosocialSampleSize)
    );
  });

  if (absence?.workDays > 0 && headcount >= MIN_SAMPLE.headcount) {
    addLevelAlert(
      "digital-absence",
      "Actividad digital no registrada",
      `${absence.rate}%`,
      getKpiLevelForSample("digitalAbsence", absence.rate, absence.workDays, 1)
    );
  }

  if (turnover?.headcount >= MIN_SAMPLE.headcount) {
    addLevelAlert(
      "turnover",
      "Rotación real",
      `${turnover.rate ?? "—"}%`,
      getKpiLevelForSample("turnover90d", turnover.rate, turnover.headcount, MIN_SAMPLE.headcount)
    );
  }

  if (performance?.enoughSample) {
    addLevelAlert(
      "tasks-on-track",
      "Tareas al corriente",
      `${performance.onTimeRate}%`,
      performance.levels?.onTrack ?? LEVELS.noData
    );
    addLevelAlert(
      "tasks-completion",
      "Cumplimiento de tareas",
      `${performance.completionRate}%`,
      performance.levels?.completion ?? LEVELS.noData
    );
  }

  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));
  Object.entries(turnover?.departuresByDepartment || {}).forEach(([departmentId, departures]) => {
    const departmentHeadcount = departmentRows.find((row) => row.id === departmentId)?.headcount ?? 0;
    if (departures < ALERT_RULES.departuresPerDepartment90d || departmentHeadcount < MIN_SAMPLE.headcount) return;
    alerts.push({
      id: `department-turnover-${departmentId}`,
      severity: "critical",
      title: `${departmentNames.get(departmentId) || departmentId} · Bajas registradas`,
      detail: `${departures} bajas en los últimos 90 días.`,
    });
  });

  return alerts;
}
