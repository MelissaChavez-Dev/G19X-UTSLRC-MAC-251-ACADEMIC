import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
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

/** Todos los equipos a los que pertenece el usuario autenticado. */
export function useMyTeams() {
  const { user, profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const userId = user?.uid ?? null;
  const profileTeamId = profile?.teamId ?? null;
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");
  const [previousKey, setPreviousKey] = useState(`${userId || ""}:${profileTeamId || ""}`);
  const currentKey = `${userId || ""}:${profileTeamId || ""}`;

  if (previousKey !== currentKey) {
    setPreviousKey(currentKey);
    setTeams([]);
    setLoading(Boolean(userId));
    setError("");
  }

  useEffect(() => {
    if (!userId) return undefined;
    let memberTeams = [];
    let profileTeam = null;
    let memberQueryLoaded = false;
    let profileTeamLoaded = !profileTeamId;

    function publishTeams() {
      const teamsById = new Map(memberTeams.map((team) => [team.id, team]));
      if (profileTeam) teamsById.set(profileTeam.id, profileTeam);
      setTeams([...teamsById.values()].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setLoading(!memberQueryLoaded || !profileTeamLoaded);
    }

    const teamsQuery = query(
      collection(db, "teams"),
      where("memberIds", "array-contains", userId)
    );
    const unsubscribeMembers = onSnapshot(
      teamsQuery,
      (snapshot) => {
        memberTeams = snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() }));
        memberQueryLoaded = true;
        setError("");
        publishTeams();
      },
      (snapshotError) => {
        memberQueryLoaded = true;
        setError(snapshotError.message || "No se pudieron cargar todos tus proyectos.");
        publishTeams();
      }
    );

    const unsubscribeProfileTeam = profileTeamId
      ? onSnapshot(
        doc(db, "teams", profileTeamId),
        (snapshot) => {
          profileTeam = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
          profileTeamLoaded = true;
          publishTeams();
        },
        (snapshotError) => {
          profileTeamLoaded = true;
          setError(snapshotError.message || "No se pudo cargar tu proyecto principal.");
          publishTeams();
        }
      )
      : () => {};

    return () => {
      unsubscribeMembers();
      unsubscribeProfileTeam();
    };
  }, [userId, profileTeamId]);

  return { teams, loading, error };
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
