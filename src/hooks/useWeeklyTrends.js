import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useHeadcount } from "./useHeadcount";
import { averageNumeric, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";

export function useWeeklyTrends(departmentId = null) {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const { total: totalHeadcount, forDepartment } = useHeadcount();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs
          .map((d) => d.data())
          .filter((r) => !departmentId || r.departmentId === departmentId);

        const byWeek = {};
        all.forEach((r) => {
          if (!byWeek[r.weekId]) byWeek[r.weekId] = [];
          byWeek[r.weekId].push(r);
        });

        const weekIds = Object.keys(byWeek).sort();

        const series = weekIds.map((weekId) => {
          const items = byWeek[weekId];
          const n = items.length || 1;

          const promoters = items.filter((r) => (toFiniteNumber(r.enps) ?? -Infinity) >= 9).length;
          const detractors = items.filter((r) => (toFiniteNumber(r.enps) ?? Infinity) <= 6).length;
          const enps = Math.round(((promoters - detractors) / n) * 100);

          const attritionRisk = workPressureIndex(items);

          const activePulseRate = Math.min(100, Math.round((items.length / headcount) * 100));

          const psychSafety = Math.round(
            (averageNumeric(items.map((response) => response.psychosocialFactors?.psychSafety)) ?? 0) * 10
          ) / 10;

          return { weekId, enps, attritionRisk, activePulseRate, psychSafety };
        });

        setTrends(series);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, totalHeadcount, forDepartment]);

  return { trends, loading };
}