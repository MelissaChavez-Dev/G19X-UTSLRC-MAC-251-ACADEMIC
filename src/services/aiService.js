import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function generateStrategy({ orgMetrics, departmentRisk }) {
  const callable = httpsCallable(functions, "generate_strategy");
  const result = await callable({ orgMetrics, departmentRisk });
  return result.data.markdown;
}

export async function explainMetric({ label, context }) {
  const callable = httpsCallable(functions, "explain_metric");
  const result = await callable({ label, context });
  return result.data.explanation;
}

export async function classifySentiment(comments) {
  const callable = httpsCallable(functions, "classify_sentiment");
  const result = await callable({ comments });
  return result.data.results;
}