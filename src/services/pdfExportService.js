import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { dashboardKpiRows, departmentName, todayLabel } from "./dashboardExportUtils";

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
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(71, 87, 60);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Welfare — Reporte ejecutivo", 14, 11);
  doc.setFontSize(9);
  doc.text(`${departmentName(departmentId, departments)} · ${periodLabel} · Generado el ${todayLabel()}`, 14, 19);

  let cursorY = 34;
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

  cursorY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Presión laboral por departamento (índice / 100)", 14, cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Departamento", "eNPS", "Balance vida-trabajo / 10", "Presión laboral / 100", "Participación", "Nivel"]],
    body: deptRows.map((row) => [
      row.name,
      `${row.enps}`,
      Number.isFinite(row.workLifeBalance) ? `${row.workLifeBalance}/10` : "—",
      Number.isFinite(row.attritionRisk) ? `${row.attritionRisk}/100` : "—",
      `${row.activePulseRate}%`,
      row.tier?.label || "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [110, 135, 99] },
    margin: { left: 14, right: 14 },
  });

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
