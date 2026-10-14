// src/data/kpiThresholds.js
// Fuente única de umbrales de los KPIs: tarjetas, banner de alertas, PDF y Excel deben leer de aquí.
// Valores iniciales propuestos (ver Fichas_KPIs_Dashboard_Salud_Organizacional.md).
// No son estándares oficiales: calibrarlos con datos reales de la organización.

export const LEVELS = {
  low: { label: "BAJO RIESGO", tone: "low" },
  controlled: { label: "CONTROLADO", tone: "controlled" },
  elevated: { label: "ELEVADO", tone: "elevated" },
  critical: { label: "CRÍTICO", tone: "critical" },
  noData: { label: "SIN DATOS", tone: "no-data" },
};

// "from" = límite inferior (inclusive) de cada nivel.
// higher-is-worse:  mayor valor = peor  (from.controlled / elevated / critical)
// higher-is-better: mayor valor = mejor (from.low / controlled / elevated; por debajo de elevated = crítico)
export const KPI_THRESHOLDS = {
  // Ya implementados en el código (se centralizan aquí)
  psychosocialRisk: { direction: "higher-is-worse", from: { controlled: 2, elevated: 3, critical: 4 } },
  enps: { direction: "higher-is-better", from: { low: 40, controlled: 20, elevated: -10 } },

  // Propuestos
  workPressure: { direction: "higher-is-worse", from: { controlled: 25, elevated: 50, critical: 75 } },
  digitalAbsence: { direction: "higher-is-worse", from: { controlled: 5, elevated: 10, critical: 15 } },
  turnover90d: { direction: "higher-is-worse", from: { controlled: 3, elevated: 5, critical: 8 } },
  // La seguridad psicológica se guarda con 1 decimal: "mayor a 4.0" equivale a "4.1 o más".
  psychSafety: { direction: "higher-is-better", from: { low: 4.1, controlled: 3.1, elevated: 2.1 } },
  participation: { direction: "higher-is-better", from: { low: 70, controlled: 50, elevated: 30 } },
  taskOnTrack: { direction: "higher-is-better", from: { low: 90, controlled: 75, elevated: 50 } },
  taskCompletion: { direction: "higher-is-better", from: { low: 60, controlled: 40, elevated: 20 } },
};

// Muestras mínimas para mostrar un nivel o disparar una alerta.
export const MIN_SAMPLE = {
  responses: 5,
  headcount: 5,
  tasks: { total: 10, withDueDate: 5 },
};

// Reglas de alerta adicionales al cambio de nivel.
export const ALERT_RULES = {
  enpsDrop: 10, // caída de eNPS (puntos) frente al periodo anterior
  workPressureRise: 10, // subida de presión laboral (puntos) frente al periodo anterior
  departuresPerDepartment90d: 2, // bajas en un mismo departamento en 90 días
};

export function hasEnoughTasks(totalTasks, tasksWithDueDate) {
  return totalTasks >= MIN_SAMPLE.tasks.total && tasksWithDueDate >= MIN_SAMPLE.tasks.withDueDate;
}

export function getKpiLevel(key, value) {
  const rule = KPI_THRESHOLDS[key];
  if (!rule || value === null || value === undefined) return LEVELS.noData;
  const n = Number(value);
  if (!Number.isFinite(n)) return LEVELS.noData;

  const { from } = rule;
  if (rule.direction === "higher-is-worse") {
    if (n >= from.critical) return LEVELS.critical;
    if (n >= from.elevated) return LEVELS.elevated;
    if (n >= from.controlled) return LEVELS.controlled;
    return LEVELS.low;
  }
  if (n >= from.low) return LEVELS.low;
  if (n >= from.controlled) return LEVELS.controlled;
  if (n >= from.elevated) return LEVELS.elevated;
  return LEVELS.critical;
}

// Igual que getKpiLevel, pero devuelve "SIN DATOS" si la muestra es menor al mínimo.
export function getKpiLevelForSample(key, value, sampleSize, minSample = MIN_SAMPLE.responses) {
  if (!Number.isFinite(sampleSize) || sampleSize < minSample) return LEVELS.noData;
  return getKpiLevel(key, value);
}