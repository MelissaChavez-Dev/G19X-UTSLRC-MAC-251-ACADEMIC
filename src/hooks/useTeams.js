import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

/** Directorio completo de equipos (vista admin). */
export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(query(collection(db, "teams"), orderBy("name")), (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return { teams, loading };
}

/** Equipo del usuario autenticado (vista empleado). */
export function useMyTeam() {
  const { profile } = useAuth();
  const teamId = profile?.teamId ?? null;
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(Boolean(teamId));

  // Reset de estado derivado al cambiar de equipo (patrón oficial de React)
  const [prevTeamId, setPrevTeamId] = useState(teamId);
  if (prevTeamId !== teamId) {
    setPrevTeamId(teamId);
    setTeam(null);
    setLoading(Boolean(teamId));
  }

  useEffect(() => {
    if (!teamId) return;
    return onSnapshot(doc(db, "teams", teamId), (snap) => {
      setTeam(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [teamId]);

  return { team: teamId ? team : null, loading: teamId ? loading : false };
}

/** Detalle en tiempo real de un equipo por id. */
export function useTeam(teamId) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    return onSnapshot(doc(db, "teams", teamId), (snap) => {
      setTeam(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [teamId]);

  return { team, loading };
}
