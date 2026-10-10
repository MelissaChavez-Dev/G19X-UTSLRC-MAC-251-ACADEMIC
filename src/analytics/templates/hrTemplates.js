/**
 * HR Analytics 14 Predefined Dashboard Templates.
 * Fully declarative JSON structures consumable by GenericWidgetRenderer & HrPageViewer.
 * Zero salary/financial fields.
 */

/**
 * Tema visual compartido (estilo "HR at a Glance": amarillo + grises neutros).
 * Las páginas lo heredan; cada widget puede sobrescribir colores con options.color.
 */
export const HR_THEME = {
  name: "hr-glance-yellow",
  font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  colors: {
    primary: "#F0C419",      // barras, dona (segmento principal), línea de sparkline
    primaryFill: "#FAE6A0",  // relleno del área bajo el sparkline
    secondary: "#A6A6A6",    // segundo segmento de dona / series secundarias
    sectionLabel: "#E8B90E", // texto de la etiqueta de sección
    text: "#252423",
    textMuted: "#605E5C",
    positive: "#2E9E44",
    negative: "#D13438",
    surface: "#FFFFFF",
    canvas: "#F3F2F1",
    headerGradient: ["#F7F7F7", "#E4E4E4"],
  },
  band: { radius: 2, shadow: "0 2px 6px rgba(0,0,0,.18)" },
  kpi: { bigNumberSize: 40, plainNumberColor: "#F0C419", deltaPositive: "▲", deltaNegative: "▼" },
  yearButtons: { activeBg: "#F0C419", border: "#C8C6C4" },
};

export const HR_TEMPLATES = [
  // ----------------------------------------------------
  // 0. Inicio: Ciclo de vida del empleado
  // ----------------------------------------------------
  {
    id: "page-0",
    templateKey: "employee_lifecycle",
    title: "Inicio: Ciclo de vida del empleado",
    description: "Navegador interactivo del ciclo de vida del talento organizacional.",
    slicers: [],
    widgets: [],
  },

  // ----------------------------------------------------
  // 1. Recursos Humanos de un vistazo
  // ----------------------------------------------------
  {
    id: "page-1",
    templateKey: "hr_at_a_glance",
    title: "1. Recursos Humanos de un vistazo",
    description: "Visión ejecutiva integral de colaboradores, diversidad, contratación y bajas.",

    // Cabecera estilo Power BI: logo + título, filtros a la derecha y navegación.
    header: {
      title: "Recursos Humanos de un vistazo",
      logo: "hr-monogram",
      navigation: { home: true, next: true },
    },

    // Esta página usa una cuadrícula de 24 columnas (el resto de páginas sigue en 12).
    grid: { columns: 24, rowHeight: 40, gap: 8 },

    // Una banda blanca con sombra por sección (Colaboradores / Diversidad / Contratación / Bajas).
    bands: [
      { y: 0, h: 3 },
      { y: 3, h: 3 },
      { y: 6, h: 3 },
      { y: 9, h: 3 },
    ],

    slicers: [
      {
        type: "yearButtons",
        filterKey: "year",
        label: "Año",
        layoutConfig: { columns: 4, years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], defaultValue: "latest" },
      },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio", layoutConfig: { allLabel: "Todas" } },
    ],

    widgets: [
      // ───────────── Banda 1: Colaboradores ─────────────
      {
        id: "w1-s1",
        type: "sectionLabel",
        title: "Colaboradores",
        options: { icon: "groups", iconStyle: "silhouette" },
        layout: { x: 0, y: 0, w: 3, h: 3 },
      },
      {
        id: "w1-1",
        type: "kpi",
        title: "Total de colaboradores",
        measure: "headCount",
        options: {
          variant: "sparkline",
          sparkline: { measure: "monthlyTrend", key: "headCount", style: "area" },
          comparisonMeasure: "yoyHeadcount",
          unit: "colab.",
        },
        layout: { x: 3, y: 0, w: 5, h: 3 },
      },
      {
        id: "w1-4",
        type: "donut",
        title: "Tipo de contratación",
        measure: "distribution",
        dimension: "hireType",
        options: {
          unit: "colab.",
          labelMode: "legend",
          showValues: true,
          labelMap: { Contract: "Contrato", Regular: "Regular" },
        },
        layout: { x: 8, y: 0, w: 5, h: 3 },
      },
      {
        id: "w1-17",
        type: "bar",
        title: "Plantilla por nivel",
        measure: "distribution",
        dimension: "orgLevel",
        options: { unit: "colab.", orientation: "vertical", showValues: "top", sort: "valueDesc", hideAxis: true },
        layout: { x: 13, y: 0, w: 4, h: 3 },
      },
      {
        id: "w1-2",
        type: "kpi",
        title: "Plantilla regular",
        measure: "headCount",
        filters: { hireType: "Regular" },
        options: { variant: "plain", unit: "reg." },
        layout: { x: 17, y: 0, w: 3, h: 3 },
      },
      {
        id: "w1-3",
        type: "kpi",
        title: "Antigüedad promedio (años)",
        measure: "avgTenure",
        options: { variant: "plain", decimals: 2 },
        layout: { x: 20, y: 0, w: 4, h: 3 },
      },

      // ───────────── Banda 2: Diversidad ─────────────
      {
        id: "w1-s2",
        type: "sectionLabel",
        title: "Diversidad",
        options: { icon: "diversity_3", iconStyle: "badge" },
        layout: { x: 0, y: 3, w: 3, h: 3 },
      },
      {
        id: "w1-5",
        type: "kpi",
        title: "% Mujeres líderes",
        measure: "femaleLeadersPct",
        options: {
          variant: "sparkline",
          sparkline: { measure: "monthlyFemaleLeadersTrend", key: "value", style: "area" },
          unit: "%",
          decimals: 2,
        },
        layout: { x: 3, y: 3, w: 5, h: 3 },
      },
      {
        id: "w1-7",
        type: "donut",
        title: "Colaboradores por género",
        measure: "distribution",
        dimension: "gender",
        options: {
          unit: "colab.",
          labelMode: "legend",
          showValues: true,
          labelMap: { Female: "Mujer", Male: "Hombre", Other: "Otro" },
        },
        layout: { x: 8, y: 3, w: 5, h: 3 },
      },
      {
        id: "w1-8",
        type: "bar",
        title: "Colaboradores por rango de edad",
        measure: "distribution",
        dimension: "ageBand",
        options: { unit: "colab.", orientation: "vertical", showValues: "top", sort: "valueDesc", hideAxis: true },
        layout: { x: 13, y: 3, w: 5, h: 3 },
      },
      {
        id: "w1-6",
        type: "kpi",
        title: "Edad promedio de colaboradores",
        measure: "avgAge",
        options: { variant: "plain", unit: "años", decimals: 2 },
        layout: { x: 18, y: 3, w: 6, h: 3 },
      },

      // ───────────── Banda 3: Contratación ─────────────
      {
        id: "w1-s3",
        type: "sectionLabel",
        title: "Contratación",
        options: { icon: "person_search", iconStyle: "silhouette" },
        layout: { x: 0, y: 6, w: 3, h: 3 },
      },
      {
        id: "w1-9",
        type: "kpi",
        title: "Nuevas contrataciones",
        measure: "hires",
        options: {
          variant: "sparkline",
          sparkline: { measure: "monthlyTrend", key: "hires", style: "area" },
          comparisonMeasure: "yoyHires",
          unit: "altas",
        },
        layout: { x: 3, y: 6, w: 5, h: 3 },
      },
      {
        id: "w1-11",
        type: "donut",
        title: "Contrataciones por tipo de contrato",
        measure: "distribution",
        dimension: "hireType",
        options: {
          unit: "altas",
          population: "hires",
          labelMode: "legend",
          showValues: true,
          labelMap: { Contract: "Contrato", Regular: "Regular" },
        },
        layout: { x: 8, y: 6, w: 5, h: 3 },
      },
      {
        id: "w1-10",
        type: "bar",
        title: "Contrataciones por rango de edad",
        measure: "distribution",
        dimension: "ageBand",
        options: { unit: "altas", population: "hires", orientation: "vertical", showValues: "top", sort: "valueDesc", hideAxis: true },
        layout: { x: 13, y: 6, w: 6, h: 3 },
      },
      {
        id: "w1-12",
        type: "donut",
        title: "Contrataciones por género",
        measure: "distribution",
        dimension: "gender",
        options: {
          unit: "altas",
          population: "hires",
          labelMode: "legend",
          showValues: true,
          labelMap: { Female: "Mujer", Male: "Hombre", Other: "Otro" },
        },
        layout: { x: 19, y: 6, w: 5, h: 3 },
      },

      // ───────────── Banda 4: Bajas ─────────────
      {
        id: "w1-s4",
        type: "sectionLabel",
        title: "Bajas",
        options: { icon: "person_remove", iconStyle: "silhouette" },
        layout: { x: 0, y: 9, w: 3, h: 3 },
      },
      {
        id: "w1-13",
        type: "kpi",
        title: "Bajas del ejercicio",
        measure: "terminations",
        options: {
          variant: "sparkline",
          sparkline: { measure: "monthlyTrend", key: "terminations", style: "area" },
          comparisonMeasure: "yoyTerminations",
          unit: "bajas",
          invertDelta: true,
        },
        layout: { x: 3, y: 9, w: 5, h: 3 },
      },
      {
        id: "w1-15",
        type: "donut",
        title: "Bajas por categoría",
        measure: "distribution",
        dimension: "terminationCategory",
        options: {
          unit: "bajas",
          population: "terminations",
          labelMode: "legend",
          showValues: true,
          labelMap: { Involuntary: "Involuntaria", Voluntary: "Voluntaria", Death: "Defunción" },
        },
        layout: { x: 8, y: 9, w: 5, h: 3 },
      },
      {
        id: "w1-18",
        type: "bar",
        title: "Tasa de baja por nivel organizacional",
        measure: "terminationRate", // medida nueva: bajas del grupo / plantilla del grupo
        dimension: "orgLevel",
        options: { unit: "%", decimals: 2, orientation: "vertical", showValues: "top", sort: "valueDesc", hideAxis: true },
        layout: { x: 13, y: 9, w: 5, h: 3 },
      },
      {
        id: "w1-16",
        type: "bar",
        title: "Tasa de baja por antigüedad",
        measure: "terminationRate",
        dimension: "tenureBand",
        options: { unit: "%", decimals: 2, orientation: "vertical", showValues: "top", sort: "natural", hideAxis: true },
        layout: { x: 18, y: 9, w: 6, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 2. Análisis demográfico
  // ----------------------------------------------------
  {
    id: "page-2",
    templateKey: "demographic_analysis",
    title: "2. Análisis demográfico",
    description: "Análisis demográfico de la plantilla activa sin datos salariales.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w2-1",
        type: "kpi",
        title: "Total de colaboradores",
        measure: "headCount",
        options: { icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-2",
        type: "kpi",
        title: "Nuevos ingresos",
        measure: "joiners",
        options: { icon: "person_add", unit: "altas" },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-3",
        type: "kpi",
        title: "Bajas",
        measure: "terminations",
        options: { icon: "person_remove", unit: "bajas", invertDelta: true },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-4",
        type: "kpi",
        title: "% de mujeres en puestos directivos",
        measure: "femaleLeadersPct",
        options: { icon: "female", unit: "%" },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w2-5",
        type: "donut",
        title: "Tipo de contratación",
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
        title: "Distribución por antigüedad",
        measure: "distribution",
        dimension: "tenureBand",
        options: { unit: "colab." },
        layout: { x: 0, y: 5, w: 4, h: 3 },
      },
      {
        id: "w2-9",
        type: "line",
        title: "Evolución mensual de la plantilla (año actual vs. anterior)",
        measure: "monthlyTrend",
        options: { currentKey: "headCount", currentLabel: "Año Actual", priorKey: "headCountLY", priorLabel: "Año Anterior (LY)", unit: "colab." },
        layout: { x: 4, y: 5, w: 8, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 3. Análisis de diversidad
  // ----------------------------------------------------
  {
    id: "page-3",
    templateKey: "diversity_analysis",
    title: "3. Análisis de diversidad",
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
  // 4. Perfil del empleado (vista interactiva)
  // ----------------------------------------------------
  {
    id: "page-4",
    templateKey: "employee_profile",
    title: "4. Perfil del empleado",
    description: "Ficha del colaborador con datos personales, laborales, licencias y evaluación (sin salario).",
    slicers: [
      { type: "dropdown", filterKey: "department", label: "Departamento" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [],
  },

  // ----------------------------------------------------
  // 5. Historial y tendencias
  // ----------------------------------------------------
  {
    id: "page-5",
    templateKey: "historical_trends",
    title: "5. Historial y tendencias",
    description: "Evolución histórica multianual, cascada MoM y dinámicas de rotación.",
    slicers: [
      { type: "yearButtons", filterKey: "year", label: "Año" },
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
    ],
    widgets: [
      {
        id: "w5-1",
        type: "kpi",
        title: "Plantilla activa",
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
        title: "Movimiento mensual de la plantilla (flujo neto)",
        measure: "waterfall",
        layout: { x: 6, y: 0, w: 6, h: 2 },
      },
      {
        id: "w5-4",
        type: "line",
        title: "Plantilla mensual (año actual vs. anterior)",
        measure: "monthlyTrend",
        options: { currentKey: "headCount", currentLabel: "Actual", priorKey: "headCountLY", priorLabel: "Año Anterior", unit: "colab." },
        layout: { x: 0, y: 2, w: 6, h: 3 },
      },
      {
        id: "w5-5",
        type: "line",
        title: "Bajas mensuales (año actual vs. anterior)",
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
  // 6. Nuevas contrataciones
  // ----------------------------------------------------
  {
    id: "page-6",
    templateKey: "new_starters",
    title: "6. Nuevas contrataciones",
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
        title: "Nuevos ingresos",
        measure: "joiners",
        options: { comparisonMeasure: "yoyHires", icon: "person_add", unit: "altas" },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-3",
        type: "gauge",
        title: "% de mujeres entre nuevos ingresos",
        measure: "femaleLeadersJoinersPct",
        options: { target: 50, gaugeTitle: "Paridad en Liderazgo" },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w6-9",
        type: "kpi",
        title: "Promedio de nuevos ingresos por día hábil",
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
        title: "Nuevos ingresos por género",
        measure: "distribution",
        dimension: "gender",
        options: { unit: "altas", population: "hires" },
        layout: { x: 0, y: 2, w: 3, h: 3 },
      },
      {
        id: "w6-5",
        type: "line",
        title: "Ingresos en 12 meses móviles",
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
        title: "Nuevos ingresos: nivel organizacional × género",
        measure: "crossMatrix",
        options: { dimensionA: "orgLevel", leftKey: "Female", rightKey: "Male", leftLabel: "Femenino", rightLabel: "Masculino", population: "hires" },
        layout: { x: 0, y: 5, w: 6, h: 3 },
      },
      {
        id: "w6-8",
        type: "bar",
        title: "Nuevos ingresos por región",
        measure: "distribution",
        dimension: "region",
        options: { unit: "altas", population: "hires" },
        layout: { x: 6, y: 5, w: 6, h: 3 },
      },
    ],
  },

  // ----------------------------------------------------
  // 7. Evaluación del desempeño
  // ----------------------------------------------------
  {
    id: "page-7",
    templateKey: "expectation_rating",
    title: "7. Evaluación del desempeño",
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
        title: "Colaboradores evaluados",
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
        title: "Distribución porcentual por evaluación y género",
        measure: "crossMatrix",
        options: { dimensionA: "performanceRating", seriesKeys: ["Female", "Male", "Other"], isPercent: true },
        layout: { x: 6, y: 2, w: 6, h: 3 },
      },
      {
        id: "w7-7",
        type: "matrix",
        title: "Matriz de desempeño por edad y antigüedad",
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
  // 8. Ausentismo
  // ----------------------------------------------------
  {
    id: "page-8",
    templateKey: "absenteeism",
    title: "8. Ausentismo",
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
        title: "Tasa de salida",
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
  // 9. Análisis de licencias por departamento
  // ----------------------------------------------------
  {
    id: "page-9",
    templateKey: "department_leave_analysis",
    title: "9. Análisis de licencias por departamento",
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
  // 10. Perfil de bajas
  // ----------------------------------------------------
  {
    id: "page-10",
    templateKey: "termination_profile",
    title: "10. Perfil de bajas",
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
        title: "Tasa de salida",
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
        title: "Flujo: unidad de negocio → categoría de baja",
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
  // 11. Análisis de rotación
  // ----------------------------------------------------
  {
    id: "page-11",
    templateKey: "attrition_analysis",
    title: "11. Análisis de rotación",
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
        title: "Tasa de salida",
        measure: "exitRate",
        options: { icon: "trending_down", unit: "%", invertDelta: true },
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-2",
        type: "kpi",
        title: "Tasa de bajas voluntarias",
        measure: "voluntaryRate",
        options: { icon: "volunteer_activism", unit: "%", invertDelta: true },
        layout: { x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-3",
        type: "kpi",
        title: "Tasa de bajas involuntarias",
        measure: "involuntaryRate",
        options: { icon: "gavel", unit: "%", invertDelta: true },
        layout: { x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-4",
        type: "kpi",
        title: "Tasa de colaboradores regulares",
        measure: "regularEmployeesRate",
        options: { icon: "badge", unit: "%", invertDelta: true },
        layout: { x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "w11-5",
        type: "line",
        title: "Tendencia mensual de rotación (año actual vs. anterior)",
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
  // 12. Predicción de rotación (tabla interactiva)
  // ----------------------------------------------------
  {
    id: "page-12",
    templateKey: "attrition_prediction",
    title: "12. Predicción de rotación",
    description: "Modelo predictivo de probabilidad de fuga de talento y alertas de riesgo.",
    slicers: [
      { type: "dropdown", filterKey: "businessUnit", label: "Unidad de Negocio" },
      { type: "dropdown", filterKey: "region", label: "Región" },
      { type: "dropdown", filterKey: "location", label: "Ciudad" },
    ],
    widgets: [],
  },

  // ----------------------------------------------------
  // 13. Perfil del departamento
  // ----------------------------------------------------
  {
    id: "page-13",
    templateKey: "department_profile",
    title: "13. Perfil del departamento",
    description: "Radiografía detallada por departamento, flujo entre áreas y resumen ejecutivo con IA.",
    slicers: [
      { type: "dropdown", filterKey: "department", label: "Departamento" },
      { type: "dropdown", filterKey: "location", label: "Ubicación" },
    ],
    widgets: [
      {
        id: "w13-1",
        type: "kpi",
        title: "Colaboradores activos",
        measure: "headCount",
        options: { icon: "groups", unit: "colab." },
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "w13-2",
        type: "kpi",
        title: "Nuevos ingresos",
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
        title: "Flujo: generación → categoría de baja",
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
        title: "Resumen ejecutivo",
        measure: "summaryBoardNarrative",
        options: {
          note: "La atrición considera el comportamiento acumulado del ejercicio fiscal anterior. No contiene indicadores salariales.",
        },
        layout: { x: 0, y: 5, w: 12, h: 3 },
      },
    ],
  },
];