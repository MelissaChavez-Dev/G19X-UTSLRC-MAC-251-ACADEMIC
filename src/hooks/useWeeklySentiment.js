import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { classifySentiment } from "../services/aiService";
import { useDepartments } from "./useDepartments";

export function useWeeklySentiment(departmentId = null) {
  const [trend, setTrend] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { departments, loading: departmentsLoading } = useDepartments();

  useEffect(() => {
    if (departmentsLoading) return;

    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, "responses"), where("openText", "!=", ""));
        const snapshot = await getDocs(q);
        const withText = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.openText && r.openText.trim().length > 0)
          .filter((r) => !departmentId || r.departmentId === departmentId);

        // Limitar la muestra para no disparar prompts enormes a Gemini
        const sample = withText.slice(-120);

        const comments = sample.map((r) => ({
          id: r.id,
          text: r.openText,
          departmentName: departments.find((dept) => dept.id === r.departmentId)?.name || r.departmentId,
        }));
        setComments(comments);
        const classified = await classifySentiment(comments);
        const sentimentById = Object.fromEntries(classified.map((c) => [c.id, c.sentiment]));

        // Tendencia por departamento: % positivo - % negativo
        const byDept = {};
        sample.forEach((r) => {
          const sentiment = sentimentById[r.id] || "neutral";
          if (!byDept[r.departmentId]) byDept[r.departmentId] = { positive: 0, negative: 0, total: 0 };
          byDept[r.departmentId].total += 1;
          if (sentiment === "positive") byDept[r.departmentId].positive += 1;
          if (sentiment === "negative") byDept[r.departmentId].negative += 1;
        });

        const visibleDepts = departmentId
          ? departments.filter((d) => d.id === departmentId)
          : departments;

        const trendRows = visibleDepts.map((dept) => {
          const stats = byDept[dept.id] || { positive: 0, negative: 0, total: 0 };
          const shift = stats.total > 0
            ? Math.round(((stats.positive - stats.negative) / stats.total) * 100)
            : 0;
          return { id: dept.id, name: dept.name, shift };
        });

        // Focos de fricción: los comentarios negativos mas recientes
        const negativeComments = sample
          .filter((r) => sentimentById[r.id] === "negative")
          .sort((a, b) => (b.submittedAt?.toMillis() || 0) - (a.submittedAt?.toMillis() || 0))
          .slice(0, 3)
          .map((r) => ({
            id: r.id,
            departmentName: departments.find((d) => d.id === r.departmentId)?.name || r.departmentId,
            excerpt: r.openText,
          }));

        setTrend(trendRows);
        setHotspots(negativeComments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, departments, departmentsLoading]);

  return { trend, hotspots, comments, loading };
}