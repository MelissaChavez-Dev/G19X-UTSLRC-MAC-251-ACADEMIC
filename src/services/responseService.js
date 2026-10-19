import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "./firebaseFirestore";

const MAX_RESPONSE_ROWS = 5000;

export async function listRecentResponses(days = 90, maxRows = MAX_RESPONSE_ROWS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const responsesQuery = query(
    collection(db, "responses"),
    where("source", "==", "live"),
    where("submittedAt", ">=", Timestamp.fromDate(cutoff)),
    orderBy("submittedAt", "desc"),
    limit(Math.min(Math.max(1, maxRows), MAX_RESPONSE_ROWS))
  );
  const snapshot = await getDocs(responsesQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
