import { MIN_SAMPLE } from "../data/kpiThresholds.js";
import { CURRENT_INSTRUMENT_VERSION } from "../data/surveyTemplate.js";

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
  const fatigueValues = responses
    .map((response) => toFiniteNumber(response.psychosocialFactors?.shiftFatigue))
    .filter((value) => value !== null);
  const emotionalLaborValues = responses
    .map((response) => toFiniteNumber(response.psychosocialFactors?.emotionalLabor))
    .filter((value) => value !== null);
  if (fatigueValues.length < MIN_SAMPLE.responses || emotionalLaborValues.length < MIN_SAMPLE.responses) {
    return null;
  }

  const averageFactor = (
    averageNumeric(fatigueValues) + averageNumeric(emotionalLaborValues)
  ) / 2;
  return Math.round(Math.max(0, Math.min(100, ((averageFactor - 1) / 4) * 100)));
}

export function calculateWeeklyMetrics(responses, headcount) {
  const n = responses.length;
  if (n === 0) {
    return {
      enps: null,
      attritionRisk: null,
      activePulseRate: 0,
      psychSafety: null,
      psychosocialSampleSize: 0,
    };
  }

  const promoters = responses.filter((response) => (toFiniteNumber(response.enps) ?? -Infinity) >= 9).length;
  const detractors = responses.filter((response) => (toFiniteNumber(response.enps) ?? Infinity) <= 6).length;
  const measuredResponses = responses.filter(
    (response) => response.instrumentVersion === CURRENT_INSTRUMENT_VERSION
  );
  const hasPsychosocialSample = measuredResponses.length >= MIN_SAMPLE.responses;
  const psychSafetyValues = measuredResponses
    .map((response) => toFiniteNumber(response.psychosocialFactors?.psychSafety))
    .filter((value) => value !== null);
  const psychSafetyAverage = psychSafetyValues.length >= MIN_SAMPLE.responses
    ? averageNumeric(psychSafetyValues)
    : null;

  return {
    enps: Math.round(((promoters - detractors) / n) * 100),
    attritionRisk: hasPsychosocialSample ? workPressureIndex(measuredResponses) : null,
    activePulseRate: headcount > 0 ? Math.min(100, Math.round((n / headcount) * 100)) : 0,
    psychSafety: psychSafetyAverage === null ? null : Math.round(psychSafetyAverage * 10) / 10,
    psychosocialSampleSize: measuredResponses.length,
  };
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