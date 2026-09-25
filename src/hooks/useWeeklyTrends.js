import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

const TOTAL_HEADCOUNT = 78;

export function useWeeklyTrends() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs.map((d) => d.data());

        const byWeek = {};
        all.forEach((r) => {
          if (!byWeek[r.weekId]) byWeek[r.weekId] = [];
          byWeek[r.weekId].push(r);
        });

        const weekIds = Object.keys(byWeek).sort();

        const series = weekIds.map((weekId) => {
          const items = byWeek[weekId];
          const n = items.length || 1;

          const promoters = items.filter((r) => r.enps >= 9).length;
          const detractors = items.filter((r) => r.enps <= 6).length;
          const enps = Math.round(((promoters - detractors) / n) * 100);

          const avgFatigue = items.reduce((s, r) => s + (r.psychosocialFactors?.shiftFatigue || 0), 0) / n;
          const avgEmotional = items.reduce((s, r) => s + (r.psychosocialFactors?.emotionalLabor || 0), 0) / n;
          const attritionRisk = Math.round((((avgFatigue + avgEmotional) / 2) / 5) * 100 * 0.6);

          const activePulseRate = Math.min(100, Math.round((items.length / TOTAL_HEADCOUNT) * 100));

          const psychSafety = Math.round(
            (items.reduce((s, r) => s + (r.psychosocialFactors?.psychSafety || 0), 0) / n) * 10
          ) / 10;

          return { weekId, enps, attritionRisk, activePulseRate, psychSafety };
        });

        setTrends(series);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { trends, loading };
}