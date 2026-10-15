import { useEffect, useState } from "react";
import { useHeadcount } from "./useHeadcount";
import { averageNumeric, computeWeeklyParticipation, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";
import { listRecentResponses } from "../services/responseService";
import { CURRENT_INSTRUMENT_VERSION } from "../data/surveyTemplate";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function computeMetrics(responses, headcount) {
  if (responses.length === 0) {
    return {
      enps: 0,
      attritionRisk: null,
      activePulseRate: 0,
      avgPerWeek: 0,
      psychSafety: null,
      workLifeBalance: null,
      sampleSize: 0,
      psychosocialSampleSize: 0,
    };
  }

  const promoters = responses.filter((r) => (toFiniteNumber(r.enps) ?? -Infinity) >= 9).length;
  const detractors = responses.filter((r) => (toFiniteNumber(r.enps) ?? Infinity) <= 6).length;
  const enps = Math.round(((promoters - detractors) / responses.length) * 100);

  const measuredResponses = responses.filter(
    (response) => response.instrumentVersion === CURRENT_INSTRUMENT_VERSION
  );
  const attritionRisk = workPressureIndex(measuredResponses);

  const { rate: activePulseRate, avgPerWeek } = computeWeeklyParticipation(responses, headcount);

  const psychSafetyValues = measuredResponses
    .map((response) => toFiniteNumber(response.psychosocialFactors?.psychSafety))
    .filter((value) => value !== null);
  const psychSafetyAvg = psychSafetyValues.length > 0
    ? averageNumeric(psychSafetyValues)
    : null;
  const psychSafety = psychSafetyAvg === null ? null : Math.round(psychSafetyAvg * 10) / 10;
  const workLifeBalance = averageNumeric(responses.map((response) => response.workLifeBalance));

  return {
    enps,
    attritionRisk,
    activePulseRate,
    avgPerWeek,
    psychSafety,
    workLifeBalance,
    sampleSize: responses.length,
    psychosocialSampleSize: measuredResponses.length,
  };
}

export function useOrgHealthMetrics(departmentId = null) {
  const [metrics, setMetrics] = useState(null);
  const [previousMetrics, setPreviousMetrics] = useState(null);
  const [periodLabel, setPeriodLabel] = useState("Últimos 30 días");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { total: totalHeadcount, forDepartment } = useHeadcount();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const all = (await listRecentResponses(60))
          .filter((r) => !departmentId || r.departmentId === departmentId);

        const headcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
        const cutoff30 = daysAgo(30);
        const cutoff60 = daysAgo(60);

        const current = all.filter((r) => r.submittedAt?.toDate() >= cutoff30);
        const previous = all.filter((r) => {
          const date = r.submittedAt?.toDate();
          return date >= cutoff60 && date < cutoff30;
        });

        const useHistorical = current.length === 0 && all.length > 0;
        setMetrics(computeMetrics(useHistorical ? all : current, headcount));
        setPeriodLabel(useHistorical ? "Muestra disponible (60 días)" : "Últimos 30 días");
        setPreviousMetrics(
          current.length > 0 && previous.length > 0
            ? computeMetrics(previous, headcount)
            : null
        );
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, totalHeadcount, forDepartment]);

  return {
    metrics,
    previousMetrics,
    periodLabel,
    loading,
    error,
    headcount: departmentId ? forDepartment(departmentId) : totalHeadcount,
  };
}