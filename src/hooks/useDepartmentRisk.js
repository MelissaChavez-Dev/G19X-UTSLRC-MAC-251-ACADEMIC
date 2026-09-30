import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { DEPARTMENTS } from "../data/surveyQuestion";
import { useHeadcount } from "./useHeadcount";

const FACTOR_KEYS = ["cognitiveLoad", "roleAmbiguity", "emotionalLabor", "shiftFatigue", "autonomy", "psychSafety"];
const PROTECTIVE_FACTORS = ["autonomy", "psychSafety"];

function average(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs.map((d) => d.data());

        const result = DEPARTMENTS.map((dept) => {
          const deptHeadcount = forDepartment(dept.id);
          const deptResponses = all.filter((r) => r.departmentId === dept.id);
          const factors = {};
          const riskEquivalents = [];

          const promoters = deptResponses.filter((r) => r.enps >= 9).length;
          const detractors = deptResponses.filter((r) => r.enps <= 6).length;
          const enps = deptResponses.length > 0
            ? Math.round(((promoters - detractors) / deptResponses.length) * 100)
            : 0;
          const averageWorkLifeBalance = deptResponses.length > 0
            ? deptResponses.reduce((sum, response) => sum + (response.workLifeBalance || 0), 0) / deptResponses.length
            : 0;

          FACTOR_KEYS.forEach((key) => {
            const values = deptResponses
              .map((r) => r.psychosocialFactors?.[key])
              .filter((v) => v !== undefined);
            const avg = Math.round(average(values) * 10) / 10;
            factors[key] = avg;
            riskEquivalents.push(PROTECTIVE_FACTORS.includes(key) ? 6 - avg : avg);
          });

          const avgRisk = average(riskEquivalents);
          const attritionRisk = Math.round((((factors.shiftFatigue + factors.emotionalLabor) / 2) / 5) * 100 * 0.6);
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
  }, [departmentId, forDepartment]);

  return { rows, loading, error };
}