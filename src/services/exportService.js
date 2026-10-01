import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

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

/**
 * Reporte ejecutivo en PDF: encabezado, KPIs, heatmap de riesgo
 * y el último análisis de Gemini (si existe en pantalla).
 */
export function exportDashboardPdf({ metrics, deptRows = [], aiMarkdown = "", departmentId = null, departments = [] }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(71, 87, 60); // primary-container (salvia oscuro)
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Bienestar organizacional — Reporte ejecutivo", 14, 11);
  doc.setFontSize(9);
  doc.text(`${departmentName(departmentId, departments)} · Últimos 30 días · Generado el ${todayLabel()}`, 14, 19);

  let cursorY = 34;

  // KPIs
  doc.setTextColor(29, 26, 36);
  doc.setFontSize(12);
  doc.text("Indicadores clave", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Métrica", "Valor"]],
    body: [
      ["Salud neta del equipo (eNPS)", `${metrics?.enps ?? "—"}`],
      ["Riesgo de rotación a 90 días (modelado)", `${metrics?.attritionRisk ?? "—"}%`],
      ["Participación en pulsos", `${metrics?.activePulseRate ?? "—"}%`],
      ["Índice de seguridad psicológica", `${metrics?.psychSafety ?? "—"} / 5.0`],
      ["Respuestas del periodo", `${metrics?.sampleSize ?? 0}`],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [110, 135, 99] },
    margin: { left: 14, right: 14 },
  });

  // Heatmap de riesgo
  cursorY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Riesgo por departamento", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Departamento", "eNPS", "Riesgo rotación", "Participación", "Nivel"]],
    body: deptRows.map((row) => [
      row.name,
      `${row.enps}`,
      `${row.attritionRisk}%`,
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

  doc.save(`bienestar-organizacional-reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Libro de Excel con 3 hojas: respuestas crudas (anonimizadas),
 * resumen de KPIs y riesgo por departamento.
 */
export async function exportResponsesExcel({ metrics, deptRows = [], departments = [] }) {
  const snapshot = await getDocs(collection(db, "responses"));
  const responses = snapshot.docs.map((d) => d.data());

  const workbook = XLSX.utils.book_new();

  // Hoja 1: respuestas crudas anonimizadas
  const rawRows = responses.map((r) => ({
    semana: r.weekId || "",
    fecha: r.submittedAt?.toDate?.().toISOString?.() || "",
    departamento: departmentName(r.departmentId, departments),
    eNPS: r.enps ?? "",
    balanceVidaTrabajo: r.workLifeBalance ?? "",
    fatiga: r.psychosocialFactors?.shiftFatigue ?? "",
    cargaEmocional: r.psychosocialFactors?.emotionalLabor ?? "",
    seguridadPsicologica: r.psychosocialFactors?.psychSafety ?? "",
    comentario: r.openText || "",
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawRows), "Respuestas");

  // Hoja 2: resumen de KPIs
  const kpiRows = [
    { métrica: "eNPS", valor: metrics?.enps ?? "" },
    { métrica: "Riesgo de rotación (%)", valor: metrics?.attritionRisk ?? "" },
    { métrica: "Participación en pulsos (%)", valor: metrics?.activePulseRate ?? "" },
    { métrica: "Seguridad psicológica (1-5)", valor: metrics?.psychSafety ?? "" },
    { métrica: "Respuestas (30 días)", valor: metrics?.sampleSize ?? 0 },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpiRows), "Resumen KPIs");

  // Hoja 3: riesgo por departamento
  const riskRows = deptRows.map((row) => ({
    departamento: row.name,
    eNPS: row.enps,
    riesgoRotación: row.attritionRisk,
    participación: row.activePulseRate,
    nivel: row.tier?.label || "",
    respuestas: row.sampleSize,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows), "Riesgo por depto");

  XLSX.writeFile(workbook, `bienestar-organizacional-datos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
