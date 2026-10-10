export const INITIAL_METRICS = [
  {
    id: "participationRate",
    name: "Participación en pulsos",
    description: "Porcentaje de participación en encuestas o pulsos de la organización.",
    unit: "%",
    period: "Últimos 30 días",
    validFilters: ["dateRange", "departmentId"],
    sources: ["responses", "externalDataImports"],
    aggregation: "PERCENTAGE",
    minValue: 0,
    maxValue: 100,
    sortOrder: 1,
  },
  {
    id: "psychSafety",
    name: "Seguridad psicológica",
    description: "Promedio de seguridad psicológica en la escala de 1 a 5.",
    unit: "/ 5,0",
    period: "Últimos 30 días",
    validFilters: ["dateRange", "departmentId"],
    sources: ["responses", "externalDataImports"],
    aggregation: "AVG",
    minValue: 1,
    maxValue: 5,
    sortOrder: 2,
  },
  {
    id: "attritionRisk",
    name: "Índice de presión laboral",
    description: "Índice orientativo de presión laboral; no es una probabilidad ni una predicción individual.",
    unit: "/ 100 puntos",
    period: "Últimos 30 días",
    validFilters: ["dateRange", "departmentId"],
    sources: ["responses", "externalDataImports"],
    aggregation: "AVG",
    minValue: 0,
    maxValue: 100,
    sortOrder: 3,
  },
];

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
export const SMALL_COHORT_THRESHOLD = 5;
