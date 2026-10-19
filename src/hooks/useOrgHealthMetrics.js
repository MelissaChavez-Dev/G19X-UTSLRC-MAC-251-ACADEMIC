import { useEffect, useState } from "react";
import { useHeadcount } from "./useHeadcount";
import { calculateDashboardMetrics } from "../utils/metricUtils";
import { listDashboardResponses } from "../services/responseService";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
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
        const all = (await listDashboardResponses(60))
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
        setMetrics(calculateDashboardMetrics(useHistorical ? all : current, headcount));
        setPeriodLabel(useHistorical ? "Muestra disponible (60 días)" : "Últimos 30 días");
        setPreviousMetrics(
          current.length > 0 && previous.length > 0
            ? calculateDashboardMetrics(previous, headcount)
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