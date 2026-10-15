import { useEffect, useState } from "react";
import { useHeadcount } from "./useHeadcount";
import { useDepartments } from "./useDepartments";
import { getKpiLevelForSample, MIN_SAMPLE } from "../data/kpiThresholds";
import { averageNumeric, computeWeeklyParticipation, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";
import { listRecentResponses } from "../services/responseService";
import { CURRENT_INSTRUMENT_VERSION } from "../data/surveyTemplate";

const FACTOR_KEYS = ["cognitiveLoad", "roleAmbiguity", "emotionalLabor", "shiftFatigue", "autonomy", "psychSafety"];
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
  const hasMinimumSample = responses.length >= MIN_SAMPLE.responses;
  const metricResponses = hasMinimumSample ? responses : [];
  const factors = {};
  const riskEquivalents = [];
  const promoters = metricResponses.filter((r) => (toFiniteNumber(r.enps) ?? -Infinity) >= 9).length;
  const detractors = metricResponses.filter((r) => (toFiniteNumber(r.enps) ?? Infinity) <= 6).length;
  const measuredResponses = metricResponses.filter(
    (response) => response.instrumentVersion === CURRENT_INSTRUMENT_VERSION
  );
  const hasMinimumPsychosocialSample = measuredResponses.length >= MIN_SAMPLE.responses;
  const factorResponses = hasMinimumPsychosocialSample ? measuredResponses : [];
  const enps = hasMinimumSample
    ? Math.round(((promoters - detractors) / metricResponses.length) * 100)
    : null;
  const averageWorkLifeBalance = averageNumeric(metricResponses.map((response) => response.workLifeBalance));

  FACTOR_KEYS.forEach((key) => {
    const values = factorResponses
      .map((response) => response.psychosocialFactors?.[key])
      .filter((value) => toFiniteNumber(value) !== null);
    const average = values.length >= MIN_SAMPLE.responses ? averageNumeric(values) : null;
    factors[key] = average === null ? null : Math.round(average * 10) / 10;
    if (average !== null) {
      riskEquivalents.push(PROTECTIVE_FACTORS.includes(key) ? 6 - average : average);
    }
  });

  const avgRisk = riskEquivalents.length > 0 ? averageNumeric(riskEquivalents) : null;
  const attritionRisk = hasMinimumPsychosocialSample ? workPressureIndex(measuredResponses) : null;
  const activePulseRate = hasMinimumSample
    ? computeWeeklyParticipation(metricResponses, headcount).rate
    : null;

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

export function useDepartmentRisk(departmentId = null) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { forDepartment } = useHeadcount();
  const { departments, loading: departmentsLoading } = useDepartments();

  useEffect(() => {
    if (departmentsLoading) return;

    async function load() {
      setLoading(true);
      try {
        const all = await listRecentResponses(30);
        const recent = filterRecentResponses(all);

        const result = departments.map((dept) => {
          const deptHeadcount = forDepartment(dept.id);
          const deptResponses = recent.filter((r) => r.departmentId === dept.id);
          return {
            id: dept.id,
            name: dept.name,
            headcount: deptHeadcount,
            ...calculateDepartmentRisk(deptResponses, deptHeadcount),
          };
        });

        result.sort((a, b) => (b.avgRisk ?? -1) - (a.avgRisk ?? -1));
        setRows(departmentId ? result.filter((row) => row.id === departmentId) : result);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, departments, departmentsLoading, forDepartment]);

  return { rows, loading, error };
}