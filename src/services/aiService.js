import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function generateStrategy({ orgMetrics, departmentRisk }) {
  const callable = httpsCallable(functions, "generate_strategy");
  const result = await callable({ orgMetrics, departmentRisk });
  return result.data.markdown;
}