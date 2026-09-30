import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  getCurrentCycleId,
  listMyCompletions,
  listPublishedTemplates,
} from "../services/templateService";
import { getISOWeek } from "../utils/dateUtils";

/**
 * Semanas ISO consecutivas con al menos una encuesta completada.
 * La semana en curso no rompe la racha si aún no se responde.
 */
function computeStreak(completions) {
  const weeks = new Set(
    completions
      .map((c) => c.cycleId)
      .filter((id) => /^\d{4}-W\d{2}$/.test(id || ""))
  );
  if (weeks.size === 0) return 0;

  // Convierte "2026-W40" a un índice ordenable aproximado
  const toIndex = (id) => {
    const [year, week] = id.split("-W").map(Number);
    return year * 54 + week;
  };
  const fromIndex = (index) => {
    const year = Math.floor(index / 54);
    const week = index % 54;
    return `${year}-W${String(week).padStart(2, "0")}`;
  };

  let cursor = toIndex(getISOWeek(new Date()));
  if (!weeks.has(fromIndex(cursor))) cursor -= 1; // la semana actual aún puede completarse

  let streak = 0;
  while (weeks.has(fromIndex(cursor))) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

/**
 * Encuestas publicadas dirigidas al departamento del colaborador
 * que aún no ha respondido en el ciclo vigente, más su racha de participación.
 */
export function usePendingSurveys() {
  const { user, profile } = useAuth();
  const [pending, setPending] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const departmentId = profile?.departmentId ?? null;

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const [templates, completions] = await Promise.all([
          listPublishedTemplates(),
          listMyCompletions(user.uid),
        ]);

        const targeted = templates.filter(
          (t) => !t.targetDepartments?.length || t.targetDepartments.includes(departmentId)
        );
        const doneKeys = new Set(completions.map((c) => `${c.templateId}_${c.cycleId}`));
        setPending(
          targeted.filter((t) => !doneKeys.has(`${t.id}_${getCurrentCycleId(t.cycle)}`))
        );
        setStreak(computeStreak(completions));
      } catch (err) {
        console.error("No se pudieron cargar las encuestas pendientes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, departmentId]);

  return { pending, streak, loading };
}
