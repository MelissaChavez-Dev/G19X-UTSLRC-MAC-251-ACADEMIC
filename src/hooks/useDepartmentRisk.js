import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useHeadcount } from "./useHeadcount";
import { useDepartments } from "./useDepartments";
import { averageNumeric, toFiniteNumber, workPressureIndex } from "../utils/metricUtils";

const FACTOR_KEYS = ["cognitiveLoad", "roleAmbiguity", "emotionalLabor", "shiftFatigue", "autonomy", "psychSafety"];
const PROTECTIVE_FACTORS = ["autonomy", "psychSafety"];

function average(nums) {
  return averageNumeric(nums) ?? 0;
}

function riskTier(avgRisk) {
  if (avgRisk >= 4) return { label: "CRÍTICO", tone: "critical" };
  if (avgRisk >= 3) return { label: "ELEVADO", tone: "elevated" };
  if (avgRisk >= 2) return { label: "CONTROLADO", tone: "controlled" };
  return { label: "BAJO RIESGO", tone: "low" };
}

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
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs.map((d) => d.data());

        const result = departments.map((dept) => {
          const deptHeadcount = forDepartment(dept.id);
          const deptResponses = all.filter((r) => r.departmentId === dept.id);
          const factors = {};
          const riskEquivalents = [];

          const promoters = deptResponses.filter((r) => (toFiniteNumber(r.enps) ?? -Infinity) >= 9).length;
          const detractors = deptResponses.filter((r) => (toFiniteNumber(r.enps) ?? Infinity) <= 6).length;
          const enps = deptResponses.length > 0
            ? Math.round(((promoters - detractors) / deptResponses.length) * 100)
            : 0;
          const averageWorkLifeBalance = averageNumeric(deptResponses.map((response) => response.workLifeBalance)) ?? 0;

          FACTOR_KEYS.forEach((key) => {
            const values = deptResponses
              .map((r) => r.psychosocialFactors?.[key])
              .filter((value) => toFiniteNumber(value) !== null);
            const avg = Math.round(average(values) * 10) / 10;
            factors[key] = avg;
            riskEquivalents.push(PROTECTIVE_FACTORS.includes(key) ? 6 - avg : avg);
          });

          const avgRisk = average(riskEquivalents);
          const attritionRisk = workPressureIndex(deptResponses);
          const pulseRate = deptHeadcount > 0
            ? Math.min(100, Math.round((deptResponses.length / deptHeadcount) * 100))
            : 0;

          return {
            id: dept.id,
            name: dept.name,
            headcount: deptHeadcount,
            factors,
            avgRisk,
            enps,
            attritionRisk,
            activePulseRate: pulseRate,
            workLifeBalance: Math.round(averageWorkLifeBalance * 10) / 10,
            tier: riskTier(avgRisk),
            sampleSize: deptResponses.length,
          };
        });

        result.sort((a, b) => b.avgRisk - a.avgRisk);
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