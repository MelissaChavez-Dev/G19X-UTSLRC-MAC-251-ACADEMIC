import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { validateSurveyTemplate } from "../data/surveyTemplate";

const templatesCollection = collection(db, "surveyTemplates");

function assertValidTemplate(template) {
  const errors = validateSurveyTemplate(template);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export async function createSurveyTemplate(template) {
  assertValidTemplate(template);

  const now = serverTimestamp();
  const reference = await addDoc(templatesCollection, {
    ...template,
    createdAt: now,
    updatedAt: now,
  });

  return reference.id;
}

export async function getSurveyTemplate(templateId) {
  const snapshot = await getDoc(doc(db, "surveyTemplates", templateId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function listSurveyTemplates() {
  const snapshot = await getDocs(query(templatesCollection, orderBy("updatedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function updateSurveyTemplate(templateId, template) {
  assertValidTemplate(template);

  await updateDoc(doc(db, "surveyTemplates", templateId), {
    ...template,
    updatedAt: serverTimestamp(),
  });
}
