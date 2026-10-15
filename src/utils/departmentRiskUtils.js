import { getKpiLevelForSample, MIN_SAMPLE } from "../data/kpiThresholds.js";
import {
  averageNumeric,
  computeWeeklyParticipation,
  toFiniteNumber,
  workPressureIndex,
} from "./metricUtils.js";
import { CURRENT_INSTRUMENT_VERSION } from "../data/surveyTemplate.js";

const FACTOR_KEYS = [
  "cognitiveLoad",
  "roleAmbiguity",
  "emotionalLabor",
  "shiftFatigue",
  "autonomy",
  "psychSafety",
];
const PROTECTIVE_FACTORS = ["autonomy", "psychSafety"];

function riskTier(avgRisk, sampleSize) {
  return getKpiLevelForSample("psychosocialRisk", avgRisk, sampleSize);
}

export function filterRecentResponses(responses, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return responses.filter((response) => {
    const submittedAt = response.submittedAt?.toDate?.();
    return submittedAt instanceof Date && submittedAt >= cutoff;
  });
}

export function calculateDepartmentRisk(responses, headcount) {
  const factors = {};
  const riskEquivalents = [];
  const promoters = responses.filter((response) => (toFiniteNumber(response.enps) ?? -Infinity) >= 9).length;
  const detractors = responses.filter((response) => (toFiniteNumber(response.enps) ?? Infinity) <= 6).length;
  const measuredResponses = responses.filter(
    (response) => response.instrumentVersion === CURRENT_INSTRUMENT_VERSION
  );
  const enps = responses.length > 0
    ? Math.round(((promoters - detractors) / responses.length) * 100)
    : null;
  const averageWorkLifeBalance = averageNumeric(responses.map((response) => response.workLifeBalance));

  FACTOR_KEYS.forEach((key) => {
    const values = measuredResponses
      .map((response) => response.psychosocialFactors?.[key])
      .filter((value) => toFiniteNumber(value) !== null);
    const average = values.length > 0 ? averageNumeric(values) : null;
    factors[key] = average === null ? null : Math.round(average * 10) / 10;
    if (average !== null) {
      riskEquivalents.push(PROTECTIVE_FACTORS.includes(key) ? 6 - average : average);
    }
  });

  const avgRisk = riskEquivalents.length > 0 ? averageNumeric(riskEquivalents) : null;
  const attritionRisk = workPressureIndex(measuredResponses);
  const activePulseRate = computeWeeklyParticipation(responses, headcount).rate;

  return {
    factors,
    avgRisk,
    enps,
    attritionRisk,
    activePulseRate,
    workLifeBalance: averageWorkLifeBalance === null
      ? null
      : Math.round(averageWorkLifeBalance * 10) / 10,
    tier: riskTier(avgRisk, measuredResponses.length),
    sampleSize: responses.length,
    psychosocialSampleSize: measuredResponses.length,
    minimumSampleSize: MIN_SAMPLE.responses,
  };
}
