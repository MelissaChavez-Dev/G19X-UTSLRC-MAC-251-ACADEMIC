import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Headcount real: usuarios activos employee/team_lead agrupados por departamento.
 */
export function useHeadcount() {
  const [state, setState] = useState({
    total: 0,
    byDepartment: {},
  });

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), where("active", "==", true));
    return onSnapshot(usersQuery, (snapshot) => {
        const respondents = snapshot.docs
          .map((d) => d.data())
          .filter((u) => u.role === "employee" || u.role === "team_lead");

        const byDepartment = {};
        respondents.forEach((u) => {
          if (u.departmentId) {
            byDepartment[u.departmentId] = (byDepartment[u.departmentId] || 0) + 1;
          }
        });
        setState({ total: respondents.length, byDepartment });
      }, (err) => {
        console.error("No se pudo calcular el headcount real:", err);
      });
  }, []);

  const forDepartment = useCallback(
    (departmentId) => state.byDepartment[departmentId] ?? 0,
    [state.byDepartment]
  );

  return { ...state, forDepartment };
}
