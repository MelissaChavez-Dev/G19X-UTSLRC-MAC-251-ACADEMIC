import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function generateStrategy({ orgMetrics, departmentRisk, openComments = [] }) {
  const callable = httpsCallable(functions, "generate_strategy");
  const result = await callable({ orgMetrics, departmentRisk, openComments });
  return result.data.markdown;
}

export async function explainMetric({ label, context }) {
  const callable = httpsCallable(functions, "explain_metric");
  const result = await callable({ label, context });
  return result.data.explanation;
}

export async function classifySentiment(comments) {
  const callable = httpsCallable(functions, "classify_sentiment");
  const result = await callable({ comments: comments.map(({ id }) => ({ id })) });
  if (result.data.error) throw new Error("No se pudo clasificar el sentimiento de los comentarios.");
  return result.data.results;
}