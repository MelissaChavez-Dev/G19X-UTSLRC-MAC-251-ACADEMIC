import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useDepartments } from "./useDepartments";
import { useAbsenceMetrics } from "./usePresence";
import { useTurnoverMetrics } from "./useTurnoverMetrics";
import { compositionOf, filterBySource, runQualityChecks } from "../data/dataQualityRules";

/**
 * Carga las respuestas una vez y evalúa su calidad. Solo lee: no modifica ni borra datos.
 * sourceMode: "all" | "live" | "simulated" (solo cambia lo que se evalúa en esta página).
 */
export function useDataQuality() {
  const [responses, setResponses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceMode, setSourceMode] = useState("all");
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
        const snapshot = await getDocs(collection(db, "responses"));
        if (!cancelled) setResponses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
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

  const composition = useMemo(() => (responses ? compositionOf(responses) : null), [responses]);

  const result = useMemo(() => {
    if (!responses || departmentsLoading) return null;
    const sources = absenceLoading || turnoverLoading
      ? null
      : { absenceWorkDays: absence?.workDays ?? 0, turnoverHeadcount: turnover?.headcount ?? 0 };
    return runQualityChecks(filterBySource(responses, sourceMode), {
      departments,
      knownDepartments: allDepartments,
      sources,
    });
  }, [responses, sourceMode, departments, allDepartments, departmentsLoading, absence, absenceLoading, turnover, turnoverLoading]);

  const onReload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    result,
    composition,
    sourceMode,
    onSourceModeChange: setSourceMode,
    loading: loading || departmentsLoading,
    error,
    onReload,
  };
}
