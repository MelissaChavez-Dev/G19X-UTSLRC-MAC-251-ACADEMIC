import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { INITIAL_METRICS } from "../data/metricsCatalog";
import { db } from "./firebase";

export async function ensureMetricsCatalog() {
  await runTransaction(db, async (transaction) => {
    const references = INITIAL_METRICS.map((metric) => doc(db, "metricsCatalog", metric.id));
    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) {
        transaction.set(references[index], {
          ...INITIAL_METRICS[index],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  });
}

export function subscribeMetricsCatalog(onMetrics, onError) {
  const metricsQuery = query(collection(db, "metricsCatalog"), orderBy("sortOrder", "asc"));
  return onSnapshot(
    metricsQuery,
    (snapshot) => onMetrics(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export function subscribeImportBatches(onBatches, onError) {
  const importsQuery = query(collection(db, "externalDataImports"), orderBy("createdAt", "desc"));
  return onSnapshot(
    importsQuery,
    (snapshot) => onBatches(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function getSurveyResponseCount() {
  const snapshot = await getCountFromServer(collection(db, "responses"));
  return snapshot.data().count;
}

export async function getImportRecords(importId) {
  const recordsQuery = query(
    collection(db, "externalDataImports", importId, "records"),
    orderBy("sourceRowNumber", "asc"),
    limit(100)
  );
  const snapshot = await getDocs(recordsQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveDataImport({
  fileName,
  records,
  rejectedRows,
  inputRows,
  smallCohortGroups,
  createdBy,
  onProgress,
}) {
  const importRef = doc(collection(db, "externalDataImports"));
  await setDoc(importRef, {
    sourceFileName: fileName,
    sourceType: /\.csv$/i.test(fileName) ? "csv" : "xlsx",
    createdBy,
    createdAt: serverTimestamp(),
    completedAt: null,
    status: "uploading",
    acceptedRows: records.length,
    rejectedRows,
    inputRows,
    smallCohortGroups,
  });

  try {
    const batchSize = 450;
    for (let start = 0; start < records.length; start += batchSize) {
      const batch = writeBatch(db);
      const chunk = records.slice(start, start + batchSize);
      chunk.forEach((record) => {
        const recordRef = doc(collection(db, "externalDataImports", importRef.id, "records"));
        batch.set(recordRef, {
          ...record,
          date: Timestamp.fromDate(new Date(`${record.date}T00:00:00.000Z`)),
        });
      });
      await batch.commit();
      onProgress?.(Math.min(start + chunk.length, records.length), records.length);
    }

    await updateDoc(importRef, {
      status: "complete",
      completedAt: serverTimestamp(),
    });
    return importRef.id;
  } catch (error) {
    try {
      await updateDoc(importRef, {
        status: "failed",
        completedAt: serverTimestamp(),
        failureCode: typeof error?.code === "string" ? error.code : "unknown",
      });
    } catch (statusError) {
      console.error("No se pudo registrar el estado fallido de la importación:", statusError);
    }
    throw error;
  }
}
