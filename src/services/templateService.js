import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { validateSurveyTemplate } from "../data/surveyTemplate";

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

export async function publishTemplate(templateId) {
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