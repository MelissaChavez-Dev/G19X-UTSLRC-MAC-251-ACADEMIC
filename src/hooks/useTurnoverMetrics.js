import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useHeadcount } from "./useHeadcount";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Rotación real (no modelada): bajas registradas por administración
 * (cuentas desactivadas o eliminadas) en departureLog, comparadas con
 * el periodo anterior de la misma duración.
 */
export function useTurnoverMetrics(departmentId = null) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { total: totalHeadcount, forDepartment } = useHeadcount();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = departmentId
          ? query(collection(db, "departureLog"), where("departmentId", "==", departmentId))
          : collection(db, "departureLog");
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map((d) => d.data());

        const headcount = departmentId ? forDepartment(departmentId) : totalHeadcount;
        const cutoff90 = daysAgo(90);
        const cutoff180 = daysAgo(180);

        const current = all.filter((r) => r.recordedAt?.toDate() >= cutoff90);
        const previous = all.filter((r) => {
          const date = r.recordedAt?.toDate();
          return date && date >= cutoff180 && date < cutoff90;
        });

        // Proporción de bajas sobre la fuerza laboral aproximada del periodo
        // (headcount actual + quienes se fueron durante la ventana).
        const rate = (departures) => {
          const base = headcount + departures;
          return base > 0 ? Math.round((departures / base) * 100 * 10) / 10 : null;
        };

        setMetrics({
          departures: current.length,
          previousDepartures: previous.length,
          rate: rate(current.length),
          previousRate: rate(previous.length),
          headcount,
        });
      } catch (err) {
        console.error("No se pudo calcular la rotación real:", err);
        setError(err);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, totalHeadcount, forDepartment]);

  return { metrics, loading, error };
}
