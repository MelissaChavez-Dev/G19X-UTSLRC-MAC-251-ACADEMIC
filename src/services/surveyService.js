import { collection, addDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getISOWeek } from "../utils/dateUtils";
import { SURVEY_STEPS as DEFAULT_STEPS } from "../data/surveyQuestion";
import { markSurveyCompleted } from "./templateService";
import { logActivity } from "./activityService";
import { toFiniteNumber } from "../utils/metricUtils";

const NUMERIC_RESPONSE_FIELDS = new Set([
  "enps",
  "workLifeBalance",
  "psychosocialFactors.cognitiveLoad",
  "psychosocialFactors.roleAmbiguity",
  "psychosocialFactors.emotionalLabor",
  "psychosocialFactors.shiftFatigue",
  "psychosocialFactors.autonomy",
  "psychosocialFactors.psychSafety",
]);

// Traduce las respuestas crudas de la encuesta al esquema de "responses"
// que ya usa el script de datos simulados (scripts/seed.js).
function buildPsychosocialFactors({ cognitiveLoad, workLifeBalance, psychSafetyRaw }) {
  const highFriction = cognitiveLoad !== "balanced";
  const factors = {};

  if (cognitiveLoad !== undefined) {
    factors.cognitiveLoad = highFriction ? 3.8 : 1.8;
    factors.roleAmbiguity = cognitiveLoad === "unclear-protocols" ? 4.0 : 2.2;
  }
  if (workLifeBalance !== null) {
    factors.emotionalLabor = workLifeBalance <= 5 ? 4.0 : 2.0;
    factors.shiftFatigue = workLifeBalance <= 5 ? 3.6 : 1.8;
  }
  if (psychSafetyRaw !== null) {
    factors.autonomy = psychSafetyRaw >= 7 ? 3.5 : 2.0;
    factors.psychSafety = Math.round((psychSafetyRaw / 2) * 10) / 10;
  }

  return factors;
}

function setNestedValue(target, path, value) {
  const segments = path.split(".");
  const lastSegment = segments.pop();
  const parent = segments.reduce((current, segment) => {
    if (!current[segment]) current[segment] = {};
    return current[segment];
  }, target);
  parent[lastSegment] = value;
}

function getAnswerFor(questions, answers, mapsTo, fallbackId) {
  const question = questions.find((item) => item.mapsTo === mapsTo || item.id === fallbackId);
  return question ? answers[question.id] : undefined;
}

export async function submitSurveyResponse({ departmentId, answers, questions = DEFAULT_STEPS, templateId = null, cycleId = null, surveyTitle = "Encuesta" }) {
  const now = new Date();
  const surveyQuestions = questions?.length ? questions : DEFAULT_STEPS;

  const payload = {
    departmentId,
    weekId: getISOWeek(now),
    submittedAt: Timestamp.fromDate(now),
    source: "live", // distingue respuestas reales de las simuladas por el script
  };
  if (templateId) payload.templateId = templateId;

  surveyQuestions.forEach((question) => {
    const value = answers[question.id];
    const mapsTo = question.mapsTo || question.id;
    if (value !== undefined && mapsTo) {
      const numericValue = NUMERIC_RESPONSE_FIELDS.has(mapsTo) ? toFiniteNumber(value) : value;
      if (numericValue !== null && numericValue !== undefined) {
        const normalizedValue = mapsTo === "psychosocialFactors.psychSafety" && question.max > 5
          ? Math.round((numericValue / question.max) * 5 * 10) / 10
          : numericValue;
        setNestedValue(payload, mapsTo, normalizedValue);
      }
    }
  });

  const cognitiveLoad = getAnswerFor(surveyQuestions, answers, "cognitiveLoad", "cognitiveLoad");
  const workLifeBalance = toFiniteNumber(getAnswerFor(surveyQuestions, answers, "workLifeBalance", "workLifeBalance"));
  const psychSafetyRaw = toFiniteNumber(getAnswerFor(surveyQuestions, answers, "psychosocialFactors.psychSafety", "psychSafety"));

  if (cognitiveLoad !== undefined || workLifeBalance !== null || psychSafetyRaw !== null) {
    payload.psychosocialFactors = {
      ...buildPsychosocialFactors({ cognitiveLoad, workLifeBalance, psychSafetyRaw }),
      ...payload.psychosocialFactors,
    };
  }

  if (payload.openText === undefined) payload.openText = "";

  await addDoc(collection(db, "responses"), payload);

  // Si quien responde es un colaborador autenticado, registramos su
  // participación (para "encuestas pendientes") y su presencia digital.
  const currentUser = auth.currentUser;
  if (currentUser) {
    if (templateId && cycleId) {
      await markSurveyCompleted({ userId: currentUser.uid, templateId, cycleId });
    }
    logActivity("survey_submit", { action: "survey_submitted", surveyTitle });
  }
}