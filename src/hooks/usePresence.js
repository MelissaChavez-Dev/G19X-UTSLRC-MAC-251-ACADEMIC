import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

function cutoffDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Resumen de presencia digital del propio colaborador (transparencia):
 * cuántos de sus días laborales registró al menos un movimiento en la app.
 */
export function useMyPresence() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const q = query(collection(db, "presenceSummary"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const cutoff = cutoffDate(30);
        const records = snapshot.docs
          .map((d) => d.data())
          .filter((r) => r.date >= cutoff && r.workDay);

        const workDays = records.length;
        const presentDays = records.filter((r) => r.present).length;
        setSummary({ workDays, presentDays, absentDays: workDays - presentDays });
      } catch (err) {
        console.error("No se pudo cargar tu resumen de presencia:", err);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return { summary, loading };
}

/**
 * Ausentismo digital agregado (solo admin): días sin ningún movimiento
 * dentro del horario laboral / días laborales esperados, últimos 30 días.
 */
export function useAbsenceMetrics(departmentId = null) {
  const [absence, setAbsence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "presenceSummary"));
        const cutoff = cutoffDate(30);
        const records = snapshot.docs
          .map((d) => d.data())
          .filter(
            (r) =>
              r.date >= cutoff &&
              r.workDay &&
              (!departmentId || r.departmentId === departmentId)
          );

        const workDays = records.length;
        const absentDays = records.filter((r) => !r.present).length;
        setAbsence({
          workDays,
          absentDays,
          rate: workDays > 0 ? Math.round((absentDays / workDays) * 100) : 0,
        });
      } catch (err) {
        console.error("No se pudo calcular el ausentismo digital:", err);
        setAbsence(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId]);

  return { absence, loading };
}
