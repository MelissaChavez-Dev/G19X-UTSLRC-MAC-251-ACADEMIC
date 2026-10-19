import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "./firebaseFirestore";

const MAX_RESPONSE_ROWS = 5000;
const DASHBOARD_RESPONSE_WINDOW_DAYS = 365;
const DASHBOARD_RESPONSE_CACHE_MS = 30_000;

let dashboardResponsesCache = null;

function responseLimit(maxRows) {
  return Math.min(Math.max(1, maxRows), MAX_RESPONSE_ROWS);
}

function loadDashboardResponses() {
  if (dashboardResponsesCache && dashboardResponsesCache.expiresAt > Date.now()) {
    return dashboardResponsesCache.promise;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DASHBOARD_RESPONSE_WINDOW_DAYS);
  const responsesQuery = query(
    collection(db, "responses"),
    where("source", "==", "live"),
    where("submittedAt", ">=", Timestamp.fromDate(cutoff)),
    orderBy("submittedAt", "desc"),
    limit(MAX_RESPONSE_ROWS)
  );
  const entry = { expiresAt: Number.POSITIVE_INFINITY, promise: null };
  entry.promise = getDocs(responsesQuery)
    .then((snapshot) => {
      entry.expiresAt = Date.now() + DASHBOARD_RESPONSE_CACHE_MS;
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    })
    .catch((error) => {
      if (dashboardResponsesCache === entry) dashboardResponsesCache = null;
      throw error;
    });
  dashboardResponsesCache = entry;
  return entry.promise;
}

export async function listDashboardResponses(days = DASHBOARD_RESPONSE_WINDOW_DAYS, maxRows = MAX_RESPONSE_ROWS) {
  const lookbackDays = Math.min(Math.max(1, days), DASHBOARD_RESPONSE_WINDOW_DAYS);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const responses = await loadDashboardResponses();
  return responses
    .filter((response) => response.submittedAt?.toDate?.() >= cutoff)
    .slice(0, responseLimit(maxRows));
}

export function invalidateDashboardResponses() {
  dashboardResponsesCache = null;
}

export async function listRecentResponses(days = 90, maxRows = MAX_RESPONSE_ROWS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const responsesQuery = query(
    collection(db, "responses"),
    where("source", "==", "live"),
    where("submittedAt", ">=", Timestamp.fromDate(cutoff)),
    orderBy("submittedAt", "desc"),
    limit(responseLimit(maxRows))
  );
  const snapshot = await getDocs(responsesQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
