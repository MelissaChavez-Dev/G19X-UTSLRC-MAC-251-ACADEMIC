import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebaseFirestore";
import { useAuth } from "./useAuth";

export function useLeaves() {
  const { user, isAdmin } = useAuth();
  const userId = user?.uid ?? null;
  const [state, setState] = useState({ key: "", requests: [], loading: true, error: null });
  const key = `${userId || ""}:${isAdmin ? "admin" : "employee"}`;

  useEffect(() => {
    if (!userId) return undefined;
    const requestsQuery = isAdmin
      ? collection(db, "leaveRequests")
      : query(collection(db, "leaveRequests"), where("userId", "==", userId));

    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requests = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((first, second) => (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0));
        setState({ key, requests, loading: false, error: null });
      },
      (error) => {
        console.error("No se pudieron cargar las solicitudes de permiso:", error);
        setState({ key, requests: [], loading: false, error });
      }
    );
  }, [isAdmin, key, userId]);

  const current = state.key === key
    ? state
    : { requests: [], loading: Boolean(userId), error: null };
  return current;
}
