import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { DEPARTMENTS } from "../data/surveyQuestion";

/** Headcount teórico del seed, como último fallback para la demo. */
const SEED_HEADCOUNT = 78;

/**
 * Headcount REAL: cuenta usuarios activos con role employee/team_lead
 * agrupados por departamento. Si no hay usuarios registrados aún,
 * cae al headcount del seed para no romper la demo con datos simulados.
 */
export function useHeadcount() {
  const [state, setState] = useState({
    total: SEED_HEADCOUNT,
    byDepartment: {},
    fromUsers: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "users"), where("active", "==", true));
        const snapshot = await getDocs(q);
        const respondents = snapshot.docs
          .map((d) => d.data())
          .filter((u) => u.role === "employee" || u.role === "team_lead");

        if (respondents.length === 0) return; // mantener fallback del seed

        const byDepartment = {};
        respondents.forEach((u) => {
          if (u.departmentId) {
            byDepartment[u.departmentId] = (byDepartment[u.departmentId] || 0) + 1;
          }
        });
        setState({ total: respondents.length, byDepartment, fromUsers: true });
      } catch (err) {
        console.error("No se pudo calcular el headcount real:", err);
      }
    }
    load();
  }, []);

  return {
    ...state,
    forDepartment: (departmentId) =>
      state.fromUsers
        ? state.byDepartment[departmentId] ?? 0
        : DEPARTMENTS.find((d) => d.id === departmentId)?.headcount ?? state.total,
  };
}
