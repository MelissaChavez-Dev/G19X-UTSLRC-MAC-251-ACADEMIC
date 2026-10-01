import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { departmentsCollection } from "../services/departmentService";

function displayName(id, data) {
  if (data.displayName?.trim()) return data.displayName.trim();
  const name = (data.name || "").trim();
  if (id === "capacitacion") return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || id;
  return name || id;
}

export function useDepartments() {
  const [allDepartments, setAllDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const departmentsQuery = query(departmentsCollection(), orderBy("name"));
    return onSnapshot(
      departmentsQuery,
      (snapshot) => {
        const loadedDepartments = snapshot.docs.map((item) => {
            const data = item.data();
            return { id: item.id, ...data, name: displayName(item.id, data) };
          });
        setAllDepartments(loadedDepartments);
        setDepartments(loadedDepartments.filter((department) => department.active !== false));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, []);

  return { departments, allDepartments, loading, error };
}