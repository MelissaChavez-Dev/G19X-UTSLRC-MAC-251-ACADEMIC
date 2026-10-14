export function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function averageNumeric(values) {
  const validValues = values.map(toFiniteNumber).filter((value) => value !== null);
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function workPressureIndex(responses) {
  const factorAverages = [
    averageNumeric(responses.map((response) => response.psychosocialFactors?.shiftFatigue)),
    averageNumeric(responses.map((response) => response.psychosocialFactors?.emotionalLabor)),
  ].filter((value) => value !== null);

  if (factorAverages.length === 0) return null;

  const averageFactor = factorAverages.reduce((sum, value) => sum + value, 0) / factorAverages.length;
  return Math.round(Math.max(0, Math.min(100, ((averageFactor - 1) / 4) * 100)));
}

// Participación semanal promedio: cuántas respuestas llegan en una semana típica
// contra el headcount. Más representativo que dividir el total acumulado, que
// cuenta varias semanas de pulso recurrente. Compartida por el KPI global y el
// heatmap por departamento para que ambos usen la misma fórmula.
export function computeWeeklyParticipation(responses, headcount) {
  if (responses.length === 0 || headcount <= 0) return { rate: 0, avgPerWeek: 0 };

  const byWeek = {};
  responses.forEach((r) => {
    byWeek[r.weekId] = (byWeek[r.weekId] || 0) + 1;
  });

  const weekCounts = Object.values(byWeek);
  const avgPerWeek = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const rate = Math.min(100, Math.round((avgPerWeek / headcount) * 100));

  return { rate, avgPerWeek: Math.round(avgPerWeek) };
}