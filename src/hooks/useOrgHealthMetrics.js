import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useHeadcount } from "./useHeadcount";
import { averageNumeric, computeWeeklyParticipation, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";
import { filterResponsesBySource } from "../utils/responseSources";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function computeMetrics(responses, headcount) {
  if (responses.length === 0) {
    return { enps: 0, attritionRisk: null, activePulseRate: 0, avgPerWeek: 0, psychSafety: null, sampleSize: 0 };
  }

  const promoters = responses.filter((r) => (toFiniteNumber(r.enps) ?? -Infinity) >= 9).length;
  const detractors = responses.filter((r) => (toFiniteNumber(r.enps) ?? Infinity) <= 6).length;
  const enps = Math.round(((promoters - detractors) / responses.length) * 100);

  const attritionRisk = workPressureIndex(responses);

  const { rate: activePulseRate, avgPerWeek } = computeWeeklyParticipation(responses, headcount);

  const psychSafetyAvg = averageNumeric(responses.map((r) => r.psychosocialFactors?.psychSafety));
  const psychSafety = psychSafetyAvg === null ? null : Math.round(psychSafetyAvg * 10) / 10;

  return { enps, attritionRisk, activePulseRate, avgPerWeek, psychSafety, sampleSize: responses.length };
}

export function useOrgHealthMetrics(departmentId = null, sourceMode = "all") {
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
        const snapshot = await getDocs(collection(db, "responses"));
        const all = filterResponsesBySource(snapshot.docs.map((d) => d.data()), sourceMode)
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
        setPeriodLabel(useHistorical ? "Histórico" : "Últimos 30 días");
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
  }, [departmentId, sourceMode, totalHeadcount, forDepartment]);

  return {
    metrics,
    previousMetrics,
    periodLabel,
    loading,
    error,
    headcount: departmentId ? forDepartment(departmentId) : totalHeadcount,
  };
}