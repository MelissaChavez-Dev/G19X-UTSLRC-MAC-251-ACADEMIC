import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";
import { logActivity } from "./activityService";

export async function submitSurveyResponse({ departmentId, answers, templateId = null, surveyTitle = "Encuesta" }) {
  if (!auth.currentUser) throw new Error("Inicia sesión para enviar tu respuesta.");
  const callable = httpsCallable(functions, "submit_survey_response");
  const result = await callable({
    departmentId,
    answers,
    ...(templateId ? { templateId } : {}),
  });
  logActivity("survey_submit", { action: "survey_submitted", surveyTitle });
  return result.data;
}