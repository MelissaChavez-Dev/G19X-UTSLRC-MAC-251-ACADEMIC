import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebaseFirestore";
import { getKpiLevel, hasEnoughTasks, LEVELS } from "../data/kpiThresholds";

// Fecha de cierre de una tarea. Usa completedAt; para tareas anteriores a ese campo
// toma el último movimiento a «Hecho» del historial (activity).
function completionDate(task) {
  const direct = task.completedAt?.toDate?.();
  if (direct) return direct;

  const events = Array.isArray(task.activity) ? task.activity : [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event?.type === "status" && typeof event.message === "string" && event.message.includes("«Hecho»")) {
      return event.createdAt?.toDate?.() ?? null;
    }
  }
  return null;
}

export function filterTaskDocsByTeamIds(taskDocs, teamIds) {
  return taskDocs.filter((task) => teamIds.has(task.ref.parent.parent?.id));
}

/**
 * Desempeño operativo agregado desde el activity tracker (Kanban):
 * cuántas tareas se completan y cuántas quedan vencidas en todos los equipos.
 * Es una señal de ejecución, no una evaluación individual de desempeño.
 *
 * - onTimeRate ("tareas al corriente"): tareas con fecha límite que no están vencidas hoy.
 *   Una tarea terminada con retraso cuenta como al corriente (solo se vencen las abiertas).
 * - punctualityRate: de las tareas terminadas con fecha límite, % entregadas a más tardar
 *   el día límite (usa la fecha de cierre).
 */
export function useTeamPerformance(departmentId = null) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collectionGroup(db, "tasks"));
        let taskDocs = snapshot.docs;
        if (departmentId) {
          const teamsSnapshot = await getDocs(
            query(collection(db, "teams"), where("departmentId", "==", departmentId))
          );
          const teamIds = new Set(teamsSnapshot.docs.map((team) => team.id));
          taskDocs = filterTaskDocsByTeamIds(taskDocs, teamIds);
        }
        const tasks = taskDocs.map((d) => d.data());
        const today = new Date().toLocaleDateString("en-CA");

        const doneTasks = tasks.filter((t) => t.status === "done").length;
        const tasksWithDueDate = tasks.filter((t) => t.dueDate).length;
        const overdueTasks = tasks.filter(
          (t) => t.status !== "done" && t.dueDate && t.dueDate < today
        ).length;

        const completionRate = tasks.length > 0
          ? Math.round((doneTasks / tasks.length) * 100)
          : null;
        const onTimeRate = tasksWithDueDate > 0
          ? Math.round(((tasksWithDueDate - overdueTasks) / tasksWithDueDate) * 100)
          : null;

        // Puntualidad real: solo tareas terminadas, con fecha límite y fecha de cierre conocida.
        const measurableDone = tasks
          .filter((t) => t.status === "done" && t.dueDate)
          .map((t) => ({ dueDate: t.dueDate, closedAt: completionDate(t) }))
          .filter((t) => t.closedAt);
        const doneLateTasks = measurableDone.filter(
          (t) => t.closedAt.toLocaleDateString("en-CA") > t.dueDate
        ).length;
        const punctualityRate = measurableDone.length > 0
          ? Math.round(((measurableDone.length - doneLateTasks) / measurableDone.length) * 100)
          : null;

        // Con muestra insuficiente no se asigna nivel (la tarjeta debe mostrar "sin datos suficientes").
        const enoughSample = hasEnoughTasks(tasks.length, tasksWithDueDate);

        setMetrics({
          totalTasks: tasks.length,
          doneTasks,
          overdueTasks,
          tasksWithDueDate,
          completionRate,
          onTimeRate,
          doneLateTasks,
          punctualityRate,
          punctualitySample: measurableDone.length,
          enoughSample,
          levels: {
            onTrack: enoughSample ? getKpiLevel("taskOnTrack", onTimeRate) : LEVELS.noData,
            completion: enoughSample ? getKpiLevel("taskCompletion", completionRate) : LEVELS.noData,
          },
        });
      } catch (err) {
        console.error("No se pudo calcular el desempeño de equipos:", err);
        setError(err);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId]);

  return { metrics, loading, error };
}