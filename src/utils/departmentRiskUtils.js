import { getKpiLevelForSample, MIN_SAMPLE } from "../data/kpiThresholds.js";
import {
  averageNumeric,
  calculateEnps,
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
const DEFAULT_WORK_LIFE_SCALE = { min: 1, max: 10 };

function workLifeBalanceScale(template) {
  const question = template?.questions?.find(
    (item) => item.mapsTo === "workLifeBalance"
  );
  if (!question) return DEFAULT_WORK_LIFE_SCALE;

  if (
    question.type === "scale"
    && Number.isFinite(question.min)
    && Number.isFinite(question.max)
    && question.max > question.min
  ) {
    return { min: question.min, max: question.max };
  }

  if (question.type === "choice") {
    const values = (question.options || [])
      .map((option) => toFiniteNumber(option.value))
      .filter((value) => value !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (values.length > 1 && max > min) return { min, max };
  }

  return DEFAULT_WORK_LIFE_SCALE;
}

function normalizeWorkLifeBalance(value, scale) {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) return null;

  const boundedValue = Math.min(scale.max, Math.max(scale.min, numericValue));
  const normalized = 1 + ((boundedValue - scale.min) / (scale.max - scale.min)) * 4;
  return Math.round(normalized * 10) / 10;
}

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

export function calculateDepartmentRisk(responses, headcount, templates = []) {
  const factors = {};
  const riskEquivalents = [];
  const measuredResponses = responses.filter(
    (response) => response.instrumentVersion === CURRENT_INSTRUMENT_VERSION
  );
  const enps = calculateEnps(responses);
  const scalesByTemplate = new Map(
    templates.map((template) => [template.id, workLifeBalanceScale(template)])
  );
  const averageWorkLifeBalance = averageNumeric(responses.map((response) => response.workLifeBalance));
  const averageWorkLifeBalanceFivePoint = averageNumeric(responses.map((response) => {
    const scale = scalesByTemplate.get(response.templateId) || DEFAULT_WORK_LIFE_SCALE;
    return normalizeWorkLifeBalance(response.workLifeBalance, scale);
  }));

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
    workLifeBalanceFivePoint: averageWorkLifeBalanceFivePoint === null
      ? null
      : Math.round(averageWorkLifeBalanceFivePoint * 10) / 10,
    tier: riskTier(avgRisk, measuredResponses.length),
    sampleSize: responses.length,
    psychosocialSampleSize: measuredResponses.length,
    minimumSampleSize: MIN_SAMPLE.responses,
  };
}
