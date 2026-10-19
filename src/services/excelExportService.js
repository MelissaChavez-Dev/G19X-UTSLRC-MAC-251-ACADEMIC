import * as XLSX from "xlsx";
import { dashboardKpiRows, departmentName } from "./dashboardExportUtils";
import { listRecentResponses } from "./responseService";

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
}) {
  const periodDays = periodLabel.includes("60 días") ? 60 : 30;
  const responses = (await listRecentResponses(periodDays))
    .filter((response) => !departmentId || response.departmentId === departmentId);

  const workbook = XLSX.utils.book_new();
  const rawRows = responses.map((response) => ({
    semana: response.weekId || "",
    fecha: response.submittedAt?.toDate?.().toISOString?.() || "",
    departamento: departmentName(response.departmentId, departments),
    eNPS: response.enps ?? "",
    balanceVidaTrabajo: response.workLifeBalance ?? "",
    estadoAnimo: response.mood ?? "",
    fatiga: response.psychosocialFactors?.shiftFatigue ?? "",
    cargaEmocional: response.psychosocialFactors?.emotionalLabor ?? "",
    seguridadPsicologica: response.psychosocialFactors?.psychSafety ?? "",
    comentario: response.openText || "",
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawRows), "Respuestas");

  const kpiRows = [
    { métrica: "Periodo", valor: periodLabel, nivel: "" },
    ...dashboardKpiRows({ metrics, absence, turnover, performance, headcount })
      .map((row) => ({ métrica: row.metric, valor: row.value, nivel: row.level })),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpiRows), "Resumen KPIs");

  const riskRows = deptRows.map((row) => ({
    departamento: row.name,
    eNPS: row.enps,
    balanceVidaTrabajo: row.workLifeBalance,
    indicePresionLaboral: row.attritionRisk,
    participación: row.activePulseRate,
    nivel: row.tier?.label || "",
    respuestas: row.sampleSize,
    respuestasPsicosocialesMedidas: row.psychosocialSampleSize,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows), "Riesgo por depto");

  XLSX.writeFile(workbook, `welfare-datos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
