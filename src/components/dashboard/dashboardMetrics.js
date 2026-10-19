import { getKpiLevel, getKpiLevelForSample, LEVELS, MIN_SAMPLE } from "../../data/kpiThresholds";

const clamp01 = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

/* Definiciones de los KPIs que abren el modal con análisis de IA.
   (El modal usa getValue, getSuffix, label y dataKey.) */
const KPI_DEFS = [
  {
    id: "kpi-enps",
    icon: "sentiment_very_satisfied",
    label: "Salud neta del equipo (eNPS)",
    dataKey: "enps",
    getValue: (m) => m.enps,
    getSuffix: () => null,
  },
  {
    id: "kpi-attrition",
    icon: "trending_down",
    label: "Índice de presión laboral",
    dataKey: "attritionRisk",
    getValue: (m) => (Number.isFinite(m.attritionRisk) ? m.attritionRisk : "—"),
    getSuffix: () => "/ 100 puntos",
  },
  {
    id: "kpi-work-life",
    icon: "balance",
    label: "Balance vida-trabajo",
    dataKey: "workLifeBalance",
    getValue: (m) => (Number.isFinite(m.workLifeBalance) ? m.workLifeBalance : "—"),
    getSuffix: (m) => (Number.isFinite(m.workLifeBalance) ? "/ 10" : null),
  },
  {
    id: "kpi-pulse",
    icon: "how_to_reg",
    label: "Participación en pulsos",
    dataKey: "activePulseRate",
    getValue: (m) => `${m.activePulseRate}%`,
    getSuffix: (m) => `~${m.avgPerWeek}`,
  },
  {
    id: "kpi-safety",
    icon: "verified_user",
    label: "Índice de seguridad psicológica",
    dataKey: "psychSafety",
    getValue: (m) => (Number.isFinite(m.psychSafety) ? m.psychSafety : "—"),
    getSuffix: (m) => (Number.isFinite(m.psychSafety) ? "/ 5,0" : null),
  },
];

const DEF_BY_ID = Object.fromEntries(KPI_DEFS.map((def) => [def.id, def]));

/* Filas secundarias del pulso: cada una explica su escala en una línea. */
const PULSE_ROWS = [
  {
    id: "kpi-attrition",
    progress: (m) => clamp01(m.attritionRisk / 100),
    color: "var(--error)",
    unit: "/ 100",
    deltaUnit: " pts",
    hint: (m) => m.psychosocialSampleSize < MIN_SAMPLE.responses
      ? `Valor preliminar · ${m.psychosocialSampleSize}/${MIN_SAMPLE.responses} respuestas`
      : "Escala orientativa, no es una probabilidad",
    level: (m) => getKpiLevelForSample("workPressure", m.attritionRisk, m.psychosocialSampleSize), // KPI-LEVEL
  },
  {
    id: "kpi-work-life",
    progress: (m) => clamp01(m.workLifeBalance / 10),
    color: "var(--primary)",
    unit: "/ 10",
    deltaUnit: " pts",
    hint: (m) => m.sampleSize < MIN_SAMPLE.responses
      ? `Promedio preliminar · ${m.sampleSize}/${MIN_SAMPLE.responses} respuestas`
      : `Promedio sobre ${m.sampleSize} respuestas`,
  },
  {
    id: "kpi-pulse",
    progress: (m) => clamp01(m.activePulseRate / 100),
    level: (m, headcount) => headcount >= MIN_SAMPLE.headcount
      ? getKpiLevelForSample("participation", m.activePulseRate, m.sampleSize)
      : LEVELS.noData, // KPI-LEVEL
    color: "var(--success)",
    unit: null,
    deltaUnit: "",
    hint: (m, headcount) => {
      const participation = headcount > 0
        ? `~${m.avgPerWeek} de ${headcount} por semana`
        : `~${m.avgPerWeek} por semana`;
      return m.sampleSize < MIN_SAMPLE.responses
        ? `Preliminar · ${m.sampleSize}/${MIN_SAMPLE.responses} respuestas · ${participation}`
        : participation;
    },
  },
  {
    id: "kpi-safety",
    progress: (m) => clamp01(m.psychSafety / 5),
    level: (m) => getKpiLevelForSample("psychSafety", m.psychSafety, m.psychosocialSampleSize), // KPI-LEVEL
    color: "var(--secondary)",
    unit: "/ 5,0",
    deltaUnit: "",
    hint: (m) => {
      if (!Number.isFinite(m.psychSafety)) return "Sin datos aún";
      if (m.psychosocialSampleSize < MIN_SAMPLE.responses) {
        return `Promedio preliminar · ${m.psychosocialSampleSize}/${MIN_SAMPLE.responses} respuestas`;
      }
      return ["low", "controlled"].includes(getKpiLevel("psychSafety", m.psychSafety).tone) // KPI-LEVEL: mismo criterio que el chip
        ? "Estable"
        : "Requiere atención";
    },
  },
];

/* ---------- Piezas pequeñas ---------- */

export { clamp01, KPI_DEFS, DEF_BY_ID, PULSE_ROWS, MIN_SAMPLE };
