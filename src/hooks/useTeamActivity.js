import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

const PER_TASK = 5; // eventos más recientes que se toman de cada tarea
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function eventMillis(event) {
  return event.createdAt?.toMillis?.() ?? 0;
}

/**
 * Actividad reciente del kanban de los equipos indicados, de la más nueva a la más antigua.
 * Se arma con el historial `activity` que cada tarea ya guarda en teams/{teamId}/tasks
 * (crear, mover, editar y comentar), así que no necesita colecciones ni reglas nuevas.
 * Las tareas eliminadas desaparecen junto con su historial.
 */
export function useTeamActivity(teamIds) {
  const key = (teamIds || []).filter(Boolean).slice().sort().join("|");
  const [state, setState] = useState({ key: "", byTeam: {}, error: "", now: 0 });

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    if (!ids.length) return undefined;

    const unsubscribers = ids.map((teamId) =>
      onSnapshot(
        collection(db, "teams", teamId, "tasks"),
        (snapshot) => {
          const items = snapshot.docs.flatMap((taskDoc) => {
            const task = taskDoc.data();
            const activity = task.activity || [];
            const start = Math.max(0, activity.length - PER_TASK);
            return activity.slice(start).map((event, offset) => ({
              ...event,
              id: `${taskDoc.id}-${start + offset}`,
              teamId,
              taskId: taskDoc.id,
              taskTitle: task.title || "",
            }));
          });
          setState((current) => ({
            key,
            byTeam: { ...(current.key === key ? current.byTeam : {}), [teamId]: items },
            error: "",
            now: Date.now(),
          }));
        },
        (error) => {
          console.error("No se pudo cargar la actividad del equipo:", error);
          setState((current) => ({
            key,
            byTeam: current.key === key ? current.byTeam : {},
            error: "No se pudo cargar la actividad del equipo.",
            now: Date.now(),
          }));
        }
      )
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [key]);

  const events = useMemo(() => {
    if (state.key !== key) return [];
    const oldest = state.now - MAX_AGE_MS;
    return Object.values(state.byTeam)
      .flat()
      .filter((event) => eventMillis(event) > oldest)
      .sort((a, b) => eventMillis(b) - eventMillis(a));
  }, [state, key]);

  return { events, error: state.key === key ? state.error : "" };
}
