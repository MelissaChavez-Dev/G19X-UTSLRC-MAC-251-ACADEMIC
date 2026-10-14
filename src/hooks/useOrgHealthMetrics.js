import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useHeadcount } from "./useHeadcount";
import { averageNumeric, computeWeeklyParticipation, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";

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

export function useOrgHealthMetrics(departmentId = null) {
  const [metrics, setMetrics] = useState(null);
  const [previousMetrics, setPreviousMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { total: totalHeadcount, forDepartment } = useHeadcount();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs
          .map((d) => d.data())
          .filter((r) => !departmentId || r.departmentId === departmentId);

        const headcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
        const cutoff30 = daysAgo(30);
        const cutoff60 = daysAgo(60);

        const current = all.filter((r) => r.submittedAt?.toDate() >= cutoff30);
        const previous = all.filter((r) => {
          const date = r.submittedAt?.toDate();
          return date >= cutoff60 && date < cutoff30;
        });

        setMetrics(computeMetrics(current.length ? current : all, headcount));
        setPreviousMetrics(computeMetrics(previous.length ? previous : current, headcount));
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, totalHeadcount, forDepartment]);

  return { metrics, previousMetrics, loading, error, headcount: departmentId ? forDepartment(departmentId) : totalHeadcount };
}