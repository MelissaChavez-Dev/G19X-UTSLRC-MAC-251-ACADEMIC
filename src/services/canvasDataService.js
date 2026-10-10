import { collection, getDocs, query, Timestamp, where } from "firebase/firestore";
import { averageNumeric, workPressureIndex } from "../utils/metricUtils";
import { getISOWeek } from "../utils/dateUtils";
import { db } from "./firebase";

const PERIOD_DAYS = 30;

export async function getNativeDashboardRecords({ departmentId, headcount }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS);
  const responsesQuery = query(
    collection(db, "responses"),
    where("submittedAt", ">=", Timestamp.fromDate(cutoff))
  );
  const snapshot = await getDocs(responsesQuery);
  const responses = snapshot.docs
    .map((item) => item.data())
    .filter((response) => !departmentId || response.departmentId === departmentId);
  const byWeek = new Map();

  responses.forEach((response) => {
    const submittedAt = response.submittedAt?.toDate?.();
    if (!submittedAt) return;
    const weekId = response.weekId || getISOWeek(submittedAt);
    const group = byWeek.get(weekId) || { items: [], dates: [] };
    group.items.push(response);
    group.dates.push(submittedAt);
    byWeek.set(weekId, group);
  });

  const records = [...byWeek.entries()].map(([weekId, group]) => {
    const sampleSize = group.items.length;
    const psychSafety = averageNumeric(
      group.items.map((response) => response.psychosocialFactors?.psychSafety)
    );
    const weekHeadcount = departmentId ? headcount.department : headcount.total;

    return {
      date: Timestamp.fromDate(new Date(Math.min(...group.dates.map((date) => date.getTime())))),
      department: departmentId || "Organización",
      period: weekId,
      sampleSize,
      metrics: {
        participationRate: weekHeadcount > 0
          ? Math.min(100, Math.round((sampleSize / weekHeadcount) * 100))
          : null,
        psychSafety: psychSafety === null ? null : Math.round(psychSafety * 10) / 10,
        attritionRisk: workPressureIndex(group.items),
      },
    };
  });

  return { records, updatedAt: new Date() };
}

export function filterCanvasRecordsByDepartment(records, departmentId, departmentName) {
  if (!departmentId) return records;
  return records.filter((record) =>
    record.department === departmentId || record.department === departmentName
  );
}

export function canvasMetricDate(record) {
  if (record.date?.toDate) return record.date.toDate();
  if (record.date instanceof Date) return record.date;
  const parsed = new Date(record.date);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function canvasMetricDateLabel(record) {
  const date = canvasMetricDate(record);
  return date
    ? new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" }).format(date)
    : "—";
}
