import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

const TOTAL_HEADCOUNT = 78; // suma de headcount de los 5 departamentos (scripts/seed.js)

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function average(arr, selector) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, item) => sum + (selector(item) || 0), 0) / arr.length;
}

// Participacion semanal promedio: cuantas respuestas llegan en una semana
// tipica, contra el headcount total. Mas representativo que dividir el
// total acumulado del mes (que cuenta varias semanas de pulso recurrente).
function computeWeeklyParticipation(responses) {
  if (responses.length === 0) return { rate: 0, avgPerWeek: 0 };

  const byWeek = {};
  responses.forEach((r) => {
    byWeek[r.weekId] = (byWeek[r.weekId] || 0) + 1;
  });

  const weekCounts = Object.values(byWeek);
  const avgPerWeek = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const rate = Math.min(100, Math.round((avgPerWeek / TOTAL_HEADCOUNT) * 100));

  return { rate, avgPerWeek: Math.round(avgPerWeek) };
}

function computeMetrics(responses) {
  if (responses.length === 0) {
    return { enps: 0, attritionRisk: 0, activePulseRate: 0, avgPerWeek: 0, psychSafety: 0, sampleSize: 0 };
  }

  const promoters = responses.filter((r) => r.enps >= 9).length;
  const detractors = responses.filter((r) => r.enps <= 6).length;
  const enps = Math.round(((promoters - detractors) / responses.length) * 100);

  const avgFatigue = average(responses, (r) => r.psychosocialFactors?.shiftFatigue);
  const avgEmotionalLabor = average(responses, (r) => r.psychosocialFactors?.emotionalLabor);
  const attritionRisk = Math.round((((avgFatigue + avgEmotionalLabor) / 2) / 5) * 100 * 0.6);

  const { rate: activePulseRate, avgPerWeek } = computeWeeklyParticipation(responses);

  const psychSafety = Math.round(average(responses, (r) => r.psychosocialFactors?.psychSafety) * 10) / 10;

  return { enps, attritionRisk, activePulseRate, avgPerWeek, psychSafety, sampleSize: responses.length };
}

export function useOrgHealthMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [previousMetrics, setPreviousMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const snapshot = await getDocs(collection(db, "responses"));
        const all = snapshot.docs.map((d) => d.data());

        const cutoff30 = daysAgo(30);
        const cutoff60 = daysAgo(60);

        const current = all.filter((r) => r.submittedAt?.toDate() >= cutoff30);
        const previous = all.filter((r) => {
          const date = r.submittedAt?.toDate();
          return date >= cutoff60 && date < cutoff30;
        });

        setMetrics(computeMetrics(current.length ? current : all));
        setPreviousMetrics(computeMetrics(previous.length ? previous : current));
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { metrics, previousMetrics, loading, error };
}