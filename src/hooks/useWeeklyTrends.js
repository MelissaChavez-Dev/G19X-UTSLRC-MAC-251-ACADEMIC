import { useEffect, useState } from "react";
import { useHeadcount } from "./useHeadcount";
import { calculateWeeklyMetrics } from "../utils/metricUtils";
import { listDashboardResponses } from "../services/responseService";

export function useWeeklyTrends(departmentId = null) {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const { total: totalHeadcount, forDepartment } = useHeadcount();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
        const all = (await listDashboardResponses(365))
          .filter((r) => !departmentId || r.departmentId === departmentId);

        const byWeek = {};
        all.forEach((r) => {
          if (!byWeek[r.weekId]) byWeek[r.weekId] = [];
          byWeek[r.weekId].push(r);
        });

        const weekIds = Object.keys(byWeek).sort();

        const series = weekIds.map((weekId) => {
          const items = byWeek[weekId];
          return { weekId, ...calculateWeeklyMetrics(items, headcount) };
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