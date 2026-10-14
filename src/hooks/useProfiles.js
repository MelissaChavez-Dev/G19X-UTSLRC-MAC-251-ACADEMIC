import { useEffect, useMemo, useState } from "react";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

const PROFILE_QUERY_LIMIT = 30;

export function useProfiles(userIds = null) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid ?? null;
  const idsKey = userIds
    ? [...new Set(userIds.filter(Boolean))].sort().join(",")
    : "*";
  const ids = useMemo(() => (idsKey === "*" ? null : idsKey ? idsKey.split(",") : []), [idsKey]);
  const key = `${userId || ""}:${idsKey}`;
  const [state, setState] = useState({ key: "", profiles: {}, loading: true, error: null });

  useEffect(() => {
    if (authLoading || !userId) return undefined;
    const groups = ids
      ? Array.from({ length: Math.ceil(ids.length / PROFILE_QUERY_LIMIT) }, (_, index) =>
        ids.slice(index * PROFILE_QUERY_LIMIT, (index + 1) * PROFILE_QUERY_LIMIT))
      : null;

    if (groups && groups.length === 0) return undefined;
    const profileQueries = groups
      ? groups.map((group) => query(
        collection(db, "publicProfiles"),
        where(documentId(), "in", group)
      ))
      : [collection(db, "publicProfiles")];

    const profiles = {};
    const loaded = new Set();
    const unsubscribes = profileQueries.map((profileQuery, index) => onSnapshot(
      profileQuery,
      (snapshot) => {
        snapshot.docs.forEach((item) => {
          profiles[item.id] = { id: item.id, ...item.data() };
        });
        loaded.add(index);
        setState({
          key,
          profiles: { ...profiles },
          loading: loaded.size < profileQueries.length,
          error: null,
        });
      },
      (error) => {
        console.error("No se pudieron cargar los perfiles públicos:", error);
        loaded.add(index);
        setState({
          key,
          profiles: { ...profiles },
          loading: loaded.size < profileQueries.length,
          error,
        });
      }
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [authLoading, ids, key, userId]);

  if (!userId || idsKey === "") {
    return { profiles: {}, loading: authLoading, error: null };
  }
  return state.key === key
    ? state
    : { profiles: {}, loading: Boolean(userId), error: null };
}
