import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc, setDoc, query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { validateSurveyTemplate } from "../data/surveyTemplate";
import { getISOWeek } from "../utils/dateUtils";

/** Identificador del ciclo vigente según la periodicidad de la encuesta. */
export function getCurrentCycleId(cycle = "weekly") {
  if (cycle === "once") return "unica";
  const isoWeek = getISOWeek(new Date()); // "2026-W40"
  if (cycle === "biweekly") {
    const [year, weekPart] = isoWeek.split("-W");
    return `${year}-Q${String(Math.ceil(Number(weekPart) / 2)).padStart(2, "0")}`;
  }
  return isoWeek;
}

export const CYCLE_LABELS = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  once: "Única",
};

export async function createTemplate(title) {
  const ref = await addDoc(collection(db, "surveyTemplates"), {
    title,
    status: "draft",
    questions: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function saveTemplateQuestions(templateId, questions, title) {
  await updateDoc(doc(db, "surveyTemplates", templateId), {
    questions,
    status: "draft",
    ...(title !== undefined ? { title } : {}),
    updatedAt: Timestamp.now(),
  });
}

export async function publishTemplate(templateId, { targetDepartments = [], cycle = "weekly" } = {}) {
  const templateRef = doc(db, "surveyTemplates", templateId);
  const snapshot = await getDoc(templateRef);
  if (!snapshot.exists()) throw new Error("La encuesta no existe.");

  const template = { id: snapshot.id, ...snapshot.data(), status: "published" };
  const errors = validateSurveyTemplate(template);
  if (errors.length > 0) {
    throw new Error(`No se puede publicar: ${errors.join(" ")}`);
  }

  await updateDoc(templateRef, {
    status: "published",
    targetDepartments, // vacío = todos los departamentos
    cycle,
    updatedAt: Timestamp.now(),
  });
}

export async function archiveTemplate(templateId) {
  await updateDoc(doc(db, "surveyTemplates", templateId), {
    status: "archived",
    updatedAt: Timestamp.now(),
  });
}

export async function getTemplate(templateId) {
  const snap = await getDoc(doc(db, "surveyTemplates", templateId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listTemplates() {
  const q = query(collection(db, "surveyTemplates"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getActivePublishedTemplate() {
  const q = query(collection(db, "surveyTemplates"), where("status", "==", "published"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // La mas reciente publicada
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  return docs[0];
}

/** Todas las plantillas publicadas (pueden coexistir varias activas). */
export async function listPublishedTemplates() {
  const q = query(collection(db, "surveyTemplates"), where("status", "==", "published"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Marca que un colaborador ya respondió una encuesta en el ciclo vigente. */
export async function markSurveyCompleted({ userId, templateId, cycleId }) {
  await setDoc(doc(db, "surveyCompletions", `${userId}_${templateId}_${cycleId}`), {
    userId,
    templateId,
    cycleId,
    completedAt: Timestamp.now(),
  });
}

/** Historial de encuestas completadas por un colaborador. */
export async function listMyCompletions(userId) {
  const q = query(collection(db, "surveyCompletions"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}