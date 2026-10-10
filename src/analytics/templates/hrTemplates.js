/**
 * HR Analytics 14 Predefined Dashboard Templates.
 * Fully declarative JSON structures consumable by GenericWidgetRenderer & HrPageViewer.
 * Zero salary/financial fields.
 */

export const HR_TEMPLATES = [
  // ----------------------------------------------------
  // 0. Inicio: Employee Life Cycle
  // ----------------------------------------------------
  {
    id: "page-0",
    templateKey: "employee_lifecycle",
    title: "Inicio: Employee Life Cycle",
    description: "Navegador interactivo del ciclo de vida del talento organizacional.",
    slicers: [],
    widgets: [],
  },

  // ----------------------------------------------------
  // 1. HR at a Glance
  // ----------------------------------------------------
  {
    id: "page-1",
    templateKey: "hr_at_a_glance",
    title: "1. HR at a Glance",
    description: "Visión ejecutiva integral de colaboradores, diversidad, contratación y bajas.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      // Fila 1: Employees
      {
        id: "w1-1",
        type: "kpi",
        title: "Head Count",
        measure: "headCount",
        options: { comparisonMeasure: "yoyHeadcount", icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w1-2",
        type: "kpi",
        title: "Colaboradores Regulares",
        measure: "headCount",
        filters: { hireType: "Regular" },
        options: { icon: "badge", unit: "reg." },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w1-3",
        type: "kpi",
        title: "Antigüedad Promedio",
        measure: "avgTenure",
        options: { icon: "history", unit: "años" },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w1-4",
        type: "donut",
        title: "Tipo de Contratación",
        measure: "distribution",
        dimension: "hireType",
        options: { unit: "emp" },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },

      // Fila 2: Diversity
      {
        id: "w1-5",
        type: "kpi",
        title: "% Mujeres Líderes",
        measure: "femaleLeadersPct",
        options: { icon: "female", unit: "%" },
        layout: { x: 0, y: 2, w: 3, h: 2 },
      },
      {
        id: "w1-6",
        type: "kpi",
        title: "Edad Promedio",
        measure: "avgAge",
        options: { icon: "cake", unit: "años" },
        layout: { x: 3, y: 2, w: 3, h: 2 },
      },
      {
        id: "w1-7",
        type: "donut",
        title: "Distribución por Género",
        measure: "distribution",
        dimension: "gender",
        options: { unit: "colab." },
        layout: { x: 6, y: 2, w: 3, h: 2 },
      },
      {
        id: "w1-8",
        type: "bar",
        title: "Rango de Edad",
        measure: "distribution",
        dimension: "ageBand",
        options: { unit: "colab." },
        layout: { x: 9, y: 2, w: 3, h: 2 },
      },

      // Fila 3: Hiring
      {
        id: "w1-9",
        type: "kpi",
        title: "Nuevas Contrataciones",
        measure: "hires",
        options: { comparisonMeasure: "yoyHires", icon: "person_add", unit: "altas" },
        layout: { x: 0, y: 4, w: 3, h: 2 },
      },
      {
        id: "w1-10",
        type: "bar",
        title: "Contrataciones por Edad",
        measure: "distribution",
        dimension: "ageBand",
        options: { unit: "altas", population: "hires" },
        layout: { x: 3, y: 4, w: 3, h: 2 },
      },
      {
        id: "w1-11",
        type: "donut",
        title: "Contrataciones por Contrato",
        measure: "distribution",
        dimension: "hireType",
        options: { unit: "altas", population: "hires" },
        layout: { x: 6, y: 4, w: 3, h: 2 },
      },
      {
        id: "w1-12",
        type: "donut",
        title: "Contrataciones por Género",
        measure: "distribution",
        dimension: "gender",
        options: { unit: "altas", population: "hires" },
        layout: { x: 9, y: 4, w: 3, h: 2 },
      },

      // Fila 4: Terminations
      {
        id: "w1-13",
        type: "kpi",
        title: "Bajas del Ejercicio",
        measure: "terminations",
        options: { comparisonMeasure: "yoyTerminations", icon: "person_remove", unit: "bajas", invertDelta: true },
        layout: { x: 0, y: 6, w: 3, h: 2 },
      },
      {
        id: "w1-14",
        type: "kpi",
        title: "Tasa de Salida (Exit Rate)",
        measure: "exitRate",
        options: { icon: "logout", unit: "%", invertDelta: true },
        layout: { x: 3, y: 6, w: 3, h: 2 },
      },
      {
        id: "w1-15",
        type: "donut",
        title: "Categoría de Baja",
        measure: "distribution",
        dimension: "terminationCategory",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 6, y: 6, w: 3, h: 2 },
      },
      {
        id: "w1-16",
        type: "bar",
        title: "Bajas por Antigüedad",
        measure: "distribution",
        dimension: "tenureBand",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 9, y: 6, w: 3, h: 2 },
      },
    ],
  },

  // ----------------------------------------------------
  // 2. Demographic Analysis
  // ----------------------------------------------------
  {
    id: "page-2",
    templateKey: "demographic_analysis",
    title: "2. Demographic Analysis",
    description: "Análisis demográfico de la plantilla activa sin datos salariales.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w2-1",
        type: "kpi",
        title: "Head Count",
        measure: "headCount",
        options: { icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-2",
        type: "kpi",
        title: "Nuevos Ingresos (Joiners)",
        measure: "joiners",
        options: { icon: "person_add", unit: "altas" },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-3",
        type: "kpi",
        title: "Bajas (Terminations)",
        measure: "terminations",
        options: { icon: "person_remove", unit: "bajas", invertDelta: true },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-4",
        type: "kpi",
        title: "% Mujeres High-Level",
        measure: "femaleLeadersPct",
        options: { icon: "female", unit: "%" },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-5",
        type: "donut",
        title: "Contratación (Hire Type)",
        measure: "distribution",
        dimension: "hireType",
        options: { unit: "colab." },
        layout: { x: 0, y: 2, w: 4, h: 3 },
      },
      {
        id: "w2-6",
        type: "stackedBar",
        title: "Nivel Organizacional × Tipo Contrato",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", dimensionB: "hireType", seriesKeys: ["Regular", "Contract"] },
        layout: { x: 4, y: 2, w: 4, h: 3 },
      },
      {
        id: "w2-7",
        type: "bar",
        title: "Dotación por Región",
        measure: "distribution",
        dimension: "region",
        options: { unit: "colab." },
        layout: { x: 8, y: 2, w: 4, h: 3 },
      },
      {
        id: "w2-8",
        type: "bar",
        title: "Distribución por Antigüedad (Tenure)",
        measure: "distribution",
        dimension: "tenureBand",
        options: { unit: "colab." },
        layout: { x: 0, y: 5, w: 4, h: 3 },
      },
      {
        id: "w2-9",
        type: "line",
        title: "Evolución Mensual de Dotación (CY vs LY)",
        measure: "monthlyTrend",
        options: { currentKey: "headCount", currentLabel: "Año Actual", priorKey: "headCountLY", priorLabel: "Año Anterior (LY)", unit: "colab." },
        layout: { x: 4, y: 5, w: 8, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 3. Diversity Analysis
  // ----------------------------------------------------
  {
    id: "page-3",
    templateKey: "diversity_analysis",
    title: "3. Diversity Analysis",
    description: "Equidad de género, generaciones y perfiles educativos de la organización.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w3-1",
        type: "donut",
        title: "Nivel Educativo",
        measure: "distribution",
        dimension: "education",
        options: { unit: "colab." },
        layout: { x: 0, y: 0, w: 4, h: 3 },
      },
      {
        id: "w3-2",
        type: "stackedBar",
        title: "Generación × Género",
        measure: "crossMatrix",
        options: { dimensionA: "generation", dimensionB: "gender", seriesKeys: ["Female", "Male", "Other"] },
        layout: { x: 4, y: 0, w: 4, h: 3 },
      },
      {
        id: "w3-3",
        type: "area",
        title: "Tendencia Mensual % Mujeres Líderes",
        measure: "monthlyFemaleLeadersTrend",
        options: { valueKey: "value", unit: "%", color: "#4f8070" },
        layout: { x: 8, y: 0, w: 4, h: 3 },
      },
      {
        id: "w3-4",
        type: "butterfly",
        title: "Nivel Organizacional × Género",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", leftKey: "Female", rightKey: "Male", leftLabel: "Femenino", rightLabel: "Masculino" },
        layout: { x: 0, y: 3, w: 6, h: 3 },
      },
      {
        id: "w3-5",
        type: "butterfly",
        title: "Unidad de Negocio × Género",
        measure: "crossMatrix",
        options: { dimensionA: "businessUnit", leftKey: "Female", rightKey: "Male", leftLabel: "Femenino", rightLabel: "Masculino" },
        layout: { x: 6, y: 3, w: 6, h: 3 },
      },
      {
        id: "w3-6",
        type: "stackedBar",
        title: "Nivel Organizacional × Rango de Edad",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", dimensionB: "ageBand", seriesKeys: ["<30", "30-40", "40-50", ">50"] },
        layout: { x: 0, y: 6, w: 12, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 4. Employee Profile (Interactive dedicated profile viewer)
  // ----------------------------------------------------
  {
    id: "page-4",
    templateKey: "employee_profile",
    title: "4. Employee Profile",
    description: "Ficha del colaborador con datos personales, laborales, licencias y evaluación (sin salario).",
    slicers: [
      { type: "dropdown", filterKey: "department", label: "Departamento" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [],
  },

  // ----------------------------------------------------
  // 5. Historical & Trends
  // ----------------------------------------------------
  {
    id: "page-5",
    templateKey: "historical_trends",
    title: "5. Historical & Trends",
    description: "Evolución histórica multianual, cascada MoM y dinámicas de rotación.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w5-1",
        type: "kpi",
        title: "Head Count Activo",
        measure: "headCount",
        options: { comparisonMeasure: "yoyHeadcount", icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w5-2",
        type: "kpi",
        title: "Bajas del Año",
        measure: "terminations",
        options: { comparisonMeasure: "yoyTerminations", icon: "person_remove", unit: "bajas", invertDelta: true },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w5-3",
        type: "waterfall",
        title: "Cascada de Movimiento MoM (Flujo Neto)",
        measure: "waterfall",
        layout: { x: 6, y: 0, w: 6, h: 2 },
      },
      {
        id: "w5-4",
        type: "line",
        title: "Dotación Mensual (CY vs LY)",
        measure: "monthlyTrend",
        options: { currentKey: "headCount", currentLabel: "Actual", priorKey: "headCountLY", priorLabel: "Año Anterior", unit: "colab." },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w5-5",
        type: "line",
        title: "Bajas Mensuales (CY vs LY)",
        measure: "monthlyTrend",
        options: { currentKey: "terminations", currentLabel: "Bajas CY", priorKey: "terminationsLY", priorLabel: "Bajas LY", currentColor: "#355c4b", priorColor: "#9b9a91", unit: "bajas" },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w5-6",
        type: "stackedBar",
        title: "Nivel Organizacional × Rango de Edad",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", dimensionB: "ageBand", seriesKeys: ["<30", "30-40", "40-50", ">50"] },
        layout: { x: 0, y: 5, w: 6, h: 3 },
      },
      {
        id: "w5-7",
        type: "butterfly",
        title: "Bajas por Género",
        measure: "crossMatrix",
        options: { dimensionA: "businessUnit", leftKey: "Female", rightKey: "Male", leftLabel: "Femenino", rightLabel: "Masculino", population: "terminations" },
        layout: { x: 6, y: 5, w: 6, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 6. New Starters
  // ----------------------------------------------------
  {
    id: "page-6",
    templateKey: "new_starters",
    title: "6. New Starters",
    description: "Incorporaciones recientes, velocidad de contratación e inserción por área.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "monthButtons", filterKey: "month", label: "Mes" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w6-1",
        type: "kpi",
        title: "Nuevos Ingresos (Joiners)",
        measure: "joiners",
        options: { comparisonMeasure: "yoyHires", icon: "person_add", unit: "altas" },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-3",
        type: "gauge",
        title: "% Mujeres Líderes en Joiners",
        measure: "femaleLeadersJoinersPct",
        options: { target: 50, gaugeTitle: "Paridad en Liderazgo" },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-9",
        type: "kpi",
        title: "Joiners Promedio por Día Hábil",
        measure: "averageJoinersPerDay",
        options: { icon: "today", unit: "altas/día" },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-2",
        type: "kpi",
        title: "% Contratación Regular",
        measure: "regularJoinerRate",
        options: { icon: "badge", unit: "%" },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-4",
        type: "donut",
        title: "Joiners por Género",
        measure: "distribution",
        dimension: "gender",
        options: { unit: "altas", population: "hires" },
        layout: { x: 0, y: 2, w: 3, h: 3 },
      },
      {
        id: "w6-5",
        type: "line",
        title: "Ingresos en 12 Meses Móviles (Rolling 12M)",
        measure: "rolling12Joiners",
        options: { currentKey: "joiners", currentLabel: "Nuevos Ingresos", unit: "altas" },
        layout: { x: 3, y: 2, w: 5, h: 3 },
      },
      {
        id: "w6-6",
        type: "combo",
        title: "Balance Mensual: Altas vs Bajas",
        measure: "joinersVsLeavers",
        options: { barKey: "joiners", barLabel: "Altas", lineKey: "netChange", lineLabel: "Cambio Neto", lineUnit: "neto" },
        layout: { x: 8, y: 2, w: 4, h: 3 },
      },
      {
        id: "w6-7",
        type: "butterfly",
        title: "Joiners: Nivel Organizacional × Género",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", leftKey: "Female", rightKey: "Male", leftLabel: "Femenino", rightLabel: "Masculino", population: "hires" },
        layout: { x: 0, y: 5, w: 6, h: 3 },
      },
      {
        id: "w6-8",
        type: "bar",
        title: "Joiners por Región",
        measure: "distribution",
        dimension: "region",
        options: { unit: "altas", population: "hires" },
        layout: { x: 6, y: 5, w: 6, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 7. Expectation Rating
  // ----------------------------------------------------
  {
    id: "page-7",
    templateKey: "expectation_rating",
    title: "7. Expectation Rating",
    description: "Evaluación de desempeño organizacional y su correlación con la permanencia.",
    slicers: [
      {
        type: "buttonList",
        filterKey: "performanceRating",
        label: "Calificación de Desempeño",
        options: [
          { value: "Minimum Acceptable", label: "Minimum Acceptable" },
          { value: "Met", label: "Met" },
          { value: "Ideal", label: "Ideal" },
          { value: "Exceeded Expectation", label: "Exceeded Expectation" },
        ],
      },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w7-1",
        type: "kpi",
        title: "Head Count en Evaluación",
        measure: "headCount",
        options: { icon: "rate_review", unit: "colab." },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w7-2",
        type: "kpi",
        title: "Bajas Voluntarias",
        measure: "voluntaryRate",
        options: { icon: "volunteer_activism", unit: "%", invertDelta: true },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w7-3",
        type: "kpi",
        title: "Bajas Involuntarias",
        measure: "involuntaryRate",
        options: { icon: "gavel", unit: "%", invertDelta: true },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w7-4",
        type: "kpi",
        title: "% Nuevos Ingresos",
        measure: "hires",
        options: { icon: "person_add", unit: "altas" },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w7-5",
        type: "butterfly",
        title: "Nivel Organizacional × Género",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", leftKey: "Female", rightKey: "Male" },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w7-6",
        type: "stackedBar",
        title: "Distribución 100% por Rating y Género",
        measure: "crossMatrix",
        options: { dimensionA: "performanceRating", seriesKeys: ["Female", "Male", "Other"], isPercent: true },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w7-7",
        type: "matrix",
        title: "Matriz Desempeño × Rango de Edad / Experiencia",
        measure: "crossMatrix",
        options: {
          dimensionA: "performanceRating",
          dimensionB: "ageBand",
          rowLabel: "Desempeño",
          alternatorOptions: [
            { id: "age", label: "Por Edad" },
            { id: "tenure", label: "Por Experiencia" },
          ],
        },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 8. Absenteeism
  // ----------------------------------------------------
  {
    id: "page-8",
    templateKey: "absenteeism",
    title: "8. Absenteeism",
    description: "Monitoreo del ausentismo laboral por turnos, departamentos y niveles.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
      { type: "dropdown", filterKey: "region", label: "Región" },
      { type: "dropdown", filterKey: "location", label: "Ciudad" },
    ],
    widgets: [
      {
        id: "w8-1",
        type: "kpi",
        title: "Tasa de Ausentismo Global",
        measure: "absenteeismRate",
        options: { icon: "event_busy", unit: "%", invertDelta: true },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "w8-2",
        type: "kpi",
        title: "Dotación Activa Evaluada",
        measure: "headCount",
        options: { icon: "groups", unit: "colab." },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: "w8-3",
        type: "kpi",
        title: "Tasa de Salida (Exit Rate)",
        measure: "exitRate",
        options: { icon: "logout", unit: "%", invertDelta: true },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: "w8-4",
        type: "bar",
        title: "Días de Ausencia por Turno",
        measure: "absenceDistribution",
        dimension: "shift",
        options: { unit: "días" },
        layout: { x: 0, y: 2, w: 4, h: 3 },
      },
      {
        id: "w8-5",
        type: "donut",
        title: "Días de Ausencia por Antigüedad",
        measure: "absenceDistribution",
        dimension: "tenureBand",
        options: { unit: "días" },
        layout: { x: 4, y: 2, w: 4, h: 3 },
      },
      {
        id: "w8-6",
        type: "stackedBar",
        title: "Tipo Contrato × Rango de Edad",
        measure: "absenceCrossMatrix",
        options: { dimensionA: "hireType", dimensionB: "ageBand", seriesKeys: ["<30", "30-40", "40-50", ">50"] },
        layout: { x: 8, y: 2, w: 4, h: 3 },
      },
      {
        id: "w8-7",
        type: "combo",
        title: "Dotación vs Tasa de Rotación por Departamento",
        measure: "departmentSummary",
        options: { xKey: "department", barKey: "headcount", barLabel: "Dotación", lineKey: "attritionRate", lineLabel: "Tasa Salida (%)" },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 9. Department Leave Analysis
  // ----------------------------------------------------
  {
    id: "page-9",
    templateKey: "department_leave_analysis",
    title: "9. Department Leave Analysis",
    description: "Comportamiento de licencias anuales y por enfermedad (sin cobro monetario).",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "department", label: "Departamento" },
      { type: "dropdown", filterKey: "location", label: "Ubicación" },
    ],
    widgets: [
      {
        id: "w9-1",
        type: "kpi",
        title: "Días Promedio Totales",
        measure: "avgTotalLeaveDays",
        options: { icon: "beach_access", unit: "días" },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "w9-2",
        type: "kpi",
        title: "Días Licencia por Enfermedad",
        measure: "avgSickDays",
        options: { icon: "sick", unit: "días", invertDelta: true },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: "w9-3",
        type: "kpi",
        title: "Días Licencia Anual",
        measure: "avgAnnualDays",
        options: { icon: "flight_takeoff", unit: "días" },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: "w9-4",
        type: "bar",
        title: "Dotación por Nivel Organizacional",
        measure: "distribution",
        dimension: "orgLevel",
        options: { unit: "colab." },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w9-5",
        type: "donut",
        title: "Distribución por Género en Licencias",
        measure: "distribution",
        dimension: "gender",
        options: { unit: "colab." },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w9-6",
        type: "bar",
        title: "Dotación por Unidad de Negocio",
        measure: "distribution",
        dimension: "businessUnit",
        options: { unit: "colab." },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 10. Termination Profile
  // ----------------------------------------------------
  {
    id: "page-10",
    templateKey: "termination_profile",
    title: "10. Termination Profile",
    description: "Perfil de bajas, causales principales y flujo Sankey hacia motivos de salida.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "monthButtons", filterKey: "month", label: "Mes" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w10-1",
        type: "kpi",
        title: "Bajas del Periodo",
        measure: "terminations",
        options: { icon: "person_remove", unit: "bajas", invertDelta: true },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "w10-2",
        type: "kpi",
        title: "Tasa de Salida (Exit Rate)",
        measure: "exitRate",
        options: { icon: "logout", unit: "%", invertDelta: true },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: "w10-3",
        type: "kpi",
        title: "Tasa Bajas Regulares",
        measure: "regularEmployeesRate",
        options: { icon: "badge", unit: "%", invertDelta: true },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: "w10-4",
        type: "donut",
        title: "Bajas por Categoría",
        measure: "distribution",
        dimension: "terminationCategory",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 0, y: 2, w: 4, h: 3 },
      },
      {
        id: "w10-5",
        type: "bar",
        title: "Bajas por Antigüedad",
        measure: "distribution",
        dimension: "tenureBand",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 4, y: 2, w: 4, h: 3 },
      },
      {
        id: "w10-6",
        type: "bar",
        title: "Bajas por Nivel Org.",
        measure: "distribution",
        dimension: "orgLevel",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 8, y: 2, w: 4, h: 3 },
      },
      {
        id: "w10-7",
        type: "sankey",
        title: "Flujo Sankey: Unidad de Negocio → Categoría de Baja",
        measure: "sankeyData",
        options: {
          dimensionA: "businessUnit",
          dimensionB: "terminationCategory",
          population: "terminations",
          width: 780,
          height: 260,
        },
        layout: { x: 0, y: 5, w: 12, h: 4 },
      },
    ],
  },

  // ----------------------------------------------------
  // 11. Attrition Analysis
  // ----------------------------------------------------
  {
    id: "page-11",
    templateKey: "attrition_analysis",
    title: "11. Attrition Analysis",
    description: "Desglose pormenorizado de atrición voluntaria, involuntaria y tendencias.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "monthButtons", filterKey: "month", label: "Mes" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w11-1",
        type: "kpi",
        title: "Exit Rate",
        measure: "exitRate",
        options: { icon: "trending_down", unit: "%", invertDelta: true },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-2",
        type: "kpi",
        title: "Voluntary Rate",
        measure: "voluntaryRate",
        options: { icon: "volunteer_activism", unit: "%", invertDelta: true },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-3",
        type: "kpi",
        title: "Involuntary Rate",
        measure: "involuntaryRate",
        options: { icon: "gavel", unit: "%", invertDelta: true },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-4",
        type: "kpi",
        title: "Regular Employees Rate",
        measure: "regularEmployeesRate",
        options: { icon: "badge", unit: "%", invertDelta: true },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-5",
        type: "line",
        title: "Tendencia Mensual de Atrición (CY vs LY)",
        measure: "monthlyTrend",
        options: { currentKey: "attritionRate", currentLabel: "Atrición CY", priorKey: "attritionRateLY", priorLabel: "Atrición LY", currentColor: "#c77968", priorColor: "#9b9a91", unit: "%" },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w11-6",
        type: "combo",
        title: "Dotación y Tasa de Salida por Departamento",
        measure: "departmentSummary",
        options: { xKey: "department", barKey: "headcount", barLabel: "Dotación", lineKey: "attritionRate", lineLabel: "Tasa Salida (%)" },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w11-7",
        type: "bar",
        title: "Porcentaje de Bajas por Unidad de Negocio",
        measure: "distribution",
        dimension: "businessUnit",
        options: { unit: "bajas", population: "terminations" },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 12. Attrition Prediction (Interactive predictive table)
  // ----------------------------------------------------
  {
    id: "page-12",
    templateKey: "attrition_prediction",
    title: "12. Attrition Prediction",
    description: "Modelo predictivo de probabilidad de fuga de talento y alertas de riesgo.",
    slicers: [
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
      { type: "dropdown", filterKey: "region", label: "Región" },
      { type: "dropdown", filterKey: "location", label: "Ciudad" },
    ],
    widgets: [],
  },

  // ----------------------------------------------------
  // 13. Department Profile
  // ----------------------------------------------------
  {
    id: "page-13",
    templateKey: "department_profile",
    title: "13. Department Profile",
    description: "Radiografía profunda por departamento, flujo Sankey y Summary Board con IA.",
    slicers: [
      { type: "dropdown", filterKey: "department", label: "Departamento" },
      { type: "dropdown", filterKey: "location", label: "Ubicación" },
    ],
    widgets: [
      {
        id: "w13-1",
        type: "kpi",
        title: "Currently Employed",
        measure: "headCount",
        options: { icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "w13-2",
        type: "kpi",
        title: "Nuevos Ingresos (Joiners)",
        measure: "joiners",
        options: { icon: "person_add", unit: "altas" },
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: "w13-3",
        type: "kpi",
        title: "Tasa de Salida",
        measure: "exitRate",
        options: { icon: "logout", unit: "%", invertDelta: true },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        id: "w13-4",
        type: "combo",
        title: "Dotación y Bajas por Área",
        measure: "departmentSummary",
        options: { xKey: "department", barKey: "headcount", barLabel: "Dotación", lineKey: "terminations", lineLabel: "Bajas", lineUnit: "bajas" },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w13-5",
        type: "sankey",
        title: "Flujo Sankey: Generación → Categoría de Baja",
        measure: "sankeyData",
        options: {
          dimensionA: "generation",
          dimensionB: "terminationCategory",
          population: "terminations",
          width: 540,
          height: 250,
        },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w13-6",
        type: "textBoard",
        title: "Summary Board",
        measure: "summaryBoardNarrative",
        options: {
          note: "La atrición considera el comportamiento acumulado del ejercicio fiscal anterior. No contiene indicadores salariales.",
        },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },
];
