import { useEffect, useState } from "react";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Desempeño operativo agregado desde el activity tracker (Kanban):
 * cuántas tareas se completan y cuántas quedan vencidas en todos los equipos.
 * Es una señal de ejecución, no una evaluación individual de desempeño.
 */
export function useTeamPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collectionGroup(db, "tasks"));
        const tasks = snapshot.docs.map((d) => d.data());
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

        setMetrics({
          totalTasks: tasks.length,
          doneTasks,
          overdueTasks,
          tasksWithDueDate,
          completionRate,
          onTimeRate,
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
  }, []);

  return { metrics, loading, error };
}
