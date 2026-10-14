import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getKpiLevel, getKpiLevelForSample, LEVELS, MIN_SAMPLE } from "../data/kpiThresholds";
import { filterResponsesBySource, responseSourceLabel } from "../utils/responseSources";

function departmentName(id, departments = []) {
  return departments.find((department) => department.id === id)?.name || id || "Todos los departamentos";
}

function todayLabel() {
  return new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dashboardKpiRows({ metrics, absence, turnover, performance, headcount }) {
  const responseSample = metrics?.sampleSize ?? 0;
  const responseLevel = (key, value) =>
    getKpiLevelForSample(key, value, responseSample).label;
  const participationLevel = headcount >= MIN_SAMPLE.headcount && responseSample >= MIN_SAMPLE.responses
    ? getKpiLevel("participation", metrics?.activePulseRate)
    : LEVELS.noData;

  return [
    { metric: "Salud neta del equipo (eNPS)", value: metrics?.enps ?? "—", level: responseLevel("enps", metrics?.enps) },
    { metric: "Índice de presión laboral", value: Number.isFinite(metrics?.attritionRisk) ? `${metrics.attritionRisk}/100` : "—", level: responseLevel("workPressure", metrics?.attritionRisk) },
    { metric: "Participación en pulsos", value: Number.isFinite(metrics?.activePulseRate) ? `${metrics.activePulseRate}%` : "—", level: participationLevel.label },
    { metric: "Seguridad psicológica", value: Number.isFinite(metrics?.psychSafety) ? `${metrics.psychSafety}/5` : "—", level: responseLevel("psychSafety", metrics?.psychSafety) },
    {
      metric: "Ausentismo digital",
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

/**
 * Reporte ejecutivo en PDF: encabezado, KPIs, heatmap de riesgo
 * y el último análisis de Gemini (si existe en pantalla).
 */
export function exportDashboardPdf({
  metrics,
  deptRows = [],
  aiMarkdown = "",
  departmentId = null,
  departments = [],
  turnover = null,
  performance = null,
  absence = null,
  headcount = 0,
  periodLabel = "Últimos 30 días",
  sourceMode = "all",
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(71, 87, 60); // primary-container (salvia oscuro)
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Welfare — Reporte ejecutivo", 14, 11);
  doc.setFontSize(9);
  doc.text(`${departmentName(departmentId, departments)} · ${periodLabel} · ${responseSourceLabel(sourceMode)} · Generado el ${todayLabel()}`, 14, 19);

  let cursorY = 34;

  // KPIs
  doc.setTextColor(29, 26, 36);
  doc.setFontSize(12);
  doc.text("Indicadores clave", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Métrica", "Valor", "Nivel"]],
    body: dashboardKpiRows({ metrics, absence, turnover, performance, headcount })
      .map((row) => [row.metric, row.value, row.level]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [110, 135, 99] },
    margin: { left: 14, right: 14 },
  });

  // Heatmap de riesgo
  cursorY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Presión laboral por departamento (índice / 100)", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Departamento", "eNPS", "Presión laboral / 100", "Participación", "Nivel"]],
    body: deptRows.map((row) => [
      row.name,
      `${row.enps}`,
      Number.isFinite(row.attritionRisk) ? `${row.attritionRisk}/100` : "—",
      `${row.activePulseRate}%`,
      row.tier?.label || "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [110, 135, 99] },
    margin: { left: 14, right: 14 },
  });

  // Último análisis de Gemini
  if (aiMarkdown) {
    cursorY = doc.lastAutoTable.finalY + 10;
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFontSize(12);
    doc.text("Análisis del asesor IA", 14, cursorY);
    doc.setFontSize(9);
    doc.setTextColor(74, 68, 84);
    const plain = aiMarkdown.replace(/[*#_`>-]/g, "").trim();
    doc.text(doc.splitTextToSize(plain, pageWidth - 28), 14, cursorY + 6);
  }

  doc.save(`welfare-reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Libro de Excel con 3 hojas: respuestas crudas (anonimizadas),
 * resumen de KPIs y riesgo por departamento.
 */
export async function exportResponsesExcel({
  metrics,
  deptRows = [],
  departments = [],
  turnover = null,
  performance = null,
  absence = null,
  headcount = 0,
  departmentId = null,
  periodLabel = "Últimos 30 días",
  sourceMode = "all",
}) {
  const snapshot = await getDocs(collection(db, "responses"));
  const responses = filterResponsesBySource(
    snapshot.docs
      .map((d) => d.data())
      .filter((response) => !departmentId || response.departmentId === departmentId),
    sourceMode
  );

  const workbook = XLSX.utils.book_new();

  // Hoja 1: respuestas crudas anonimizadas
  const rawRows = responses.map((r) => ({
    semana: r.weekId || "",
    fecha: r.submittedAt?.toDate?.().toISOString?.() || "",
    departamento: departmentName(r.departmentId, departments),
    eNPS: r.enps ?? "",
    balanceVidaTrabajo: r.workLifeBalance ?? "",
    estadoAnimo: r.mood ?? "",
    fatiga: r.psychosocialFactors?.shiftFatigue ?? "",
    cargaEmocional: r.psychosocialFactors?.emotionalLabor ?? "",
    seguridadPsicologica: r.psychosocialFactors?.psychSafety ?? "",
    comentario: r.openText || "",
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawRows), "Respuestas");

  // Hoja 2: resumen de KPIs
  const kpiRows = [
    { métrica: "Periodo", valor: periodLabel, nivel: "" },
    { métrica: "Origen", valor: responseSourceLabel(sourceMode), nivel: "" },
    ...dashboardKpiRows({ metrics, absence, turnover, performance, headcount })
      .map((row) => ({ métrica: row.metric, valor: row.value, nivel: row.level })),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpiRows), "Resumen KPIs");

  // Hoja 3: riesgo por departamento
  const riskRows = deptRows.map((row) => ({
    departamento: row.name,
    eNPS: row.enps,
    indicePresionLaboral: row.attritionRisk,
    participación: row.activePulseRate,
    nivel: row.tier?.label || "",
    respuestas: row.sampleSize,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows), "Riesgo por depto");

  XLSX.writeFile(workbook, `welfare-datos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
