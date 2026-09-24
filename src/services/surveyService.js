import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getISOWeek } from "../utils/dateUtils";

// Traduce las respuestas crudas de la encuesta al esquema de "responses"
// que ya usa el script de datos simulados (scripts/seed.js).
function buildPsychosocialFactors({ cognitiveLoad, workLifeBalance, psychSafetyRaw }) {
  const highFriction = cognitiveLoad !== "balanced";

  return {
    cognitiveLoad: highFriction ? 3.8 : 1.8,
    roleAmbiguity: cognitiveLoad === "unclear-protocols" ? 4.0 : 2.2,
    emotionalLabor: workLifeBalance <= 5 ? 4.0 : 2.0,
    shiftFatigue: workLifeBalance <= 5 ? 3.6 : 1.8,
    autonomy: psychSafetyRaw >= 7 ? 3.5 : 2.0,
    psychSafety: Math.round((psychSafetyRaw / 2) * 10) / 10, // normalizado a escala 1-5
  };
}

export async function submitSurveyResponse({ departmentId, answers }) {
  const now = new Date();

  const payload = {
    departmentId,
    weekId: getISOWeek(now),
    submittedAt: Timestamp.fromDate(now),
    workLifeBalance: answers.workLifeBalance,
    cognitiveLoad: answers.cognitiveLoad,
    psychosocialFactors: buildPsychosocialFactors({
      cognitiveLoad: answers.cognitiveLoad,
      workLifeBalance: answers.workLifeBalance,
      psychSafetyRaw: answers.psychSafety,
    }),
    enps: answers.enps,
    openText: answers.openText || "",
    source: "live", // distingue respuestas reales de las simuladas por el script
  };

  await addDoc(collection(db, "responses"), payload);
}