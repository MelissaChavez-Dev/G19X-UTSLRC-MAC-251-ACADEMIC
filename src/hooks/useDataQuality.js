import { useCallback, useEffect, useMemo, useState } from "react";
import { useDepartments } from "./useDepartments";
import { useAbsenceMetrics } from "./usePresence";
import { useTurnoverMetrics } from "./useTurnoverMetrics";
import { runQualityChecks } from "../data/dataQualityRules";
import { listRecentResponses } from "../services/responseService";

/**
 * Evalúa hasta 5,000 respuestas del último año. Solo lee: no modifica ni borra datos.
 */
export function useDataQuality() {
  const [responses, setResponses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { departments, allDepartments, loading: departmentsLoading } = useDepartments();
  const { absence, loading: absenceLoading } = useAbsenceMetrics(null, reloadKey);
  const { metrics: turnover, loading: turnoverLoading } = useTurnoverMetrics(null, reloadKey);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const recentResponses = await listRecentResponses(365);
        if (!cancelled) setResponses(recentResponses);
      } catch (err) {
        console.error("No se pudieron cargar las respuestas para evaluar su calidad:", err);
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const result = useMemo(() => {
    if (!responses || departmentsLoading) return null;
    const sources = absenceLoading || turnoverLoading
      ? null
      : { absenceWorkDays: absence?.workDays ?? 0, turnoverHeadcount: turnover?.headcount ?? 0 };
    return runQualityChecks(responses, {
      departments,
      knownDepartments: allDepartments,
      sources,
    });
  }, [responses, departments, allDepartments, departmentsLoading, absence, absenceLoading, turnover, turnoverLoading]);

  const onReload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    result,
    loading: loading || departmentsLoading,
    error,
    onReload,
  };
}
