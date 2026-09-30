import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

/** Tareas del kanban de un equipo, en tiempo real. */
export function useTeamTasks(teamId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(Boolean(teamId));

  // Reset de estado derivado al cambiar de equipo (patrón oficial de React)
  const [prevTeamId, setPrevTeamId] = useState(teamId);
  if (prevTeamId !== teamId) {
    setPrevTeamId(teamId);
    setTasks([]);
    setLoading(Boolean(teamId));
  }

  useEffect(() => {
    if (!teamId) return;
    const q = query(collection(db, "teams", teamId, "tasks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [teamId]);

  return { tasks: teamId ? tasks : [], loading: teamId ? loading : false };
}
