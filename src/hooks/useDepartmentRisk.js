import { useEffect, useState } from "react";
import { useHeadcount } from "./useHeadcount";
import { useDepartments } from "./useDepartments";
import { listRecentResponses } from "../services/responseService";
import { listTemplates } from "../services/templateService";
import { calculateDepartmentRisk, filterRecentResponses } from "../utils/departmentRiskUtils.js";

export { calculateDepartmentRisk, filterRecentResponses };

export function useDepartmentRisk(departmentId = null) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { forDepartment } = useHeadcount();
  const { departments, loading: departmentsLoading } = useDepartments();

  useEffect(() => {
    if (departmentsLoading) return;

    async function load() {
      setLoading(true);
      try {
        const [all, templates] = await Promise.all([
          listRecentResponses(30),
          listTemplates(),
        ]);
        const recent = filterRecentResponses(all);

        const result = departments.map((dept) => {
          const deptHeadcount = forDepartment(dept.id);
          const deptResponses = recent.filter((r) => r.departmentId === dept.id);
          return {
            id: dept.id,
            name: dept.name,
            headcount: deptHeadcount,
            ...calculateDepartmentRisk(deptResponses, deptHeadcount, templates),
          };
        });

        result.sort((a, b) => (b.avgRisk ?? -1) - (a.avgRisk ?? -1));
        setRows(departmentId ? result.filter((row) => row.id === departmentId) : result);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, departments, departmentsLoading, forDepartment]);

  return { rows, loading, error };
}