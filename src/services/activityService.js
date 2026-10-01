import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Registro de presencia digital (Fase E).
 * Un "movimiento" es: login, envío de encuesta, acción de kanban o
 * navegación dentro de la app (throttled a 1 registro cada 5 min).
 * La telemetría nunca debe bloquear la UX: los errores se ignoran.
 */

const NAVIGATION_THROTTLE_MS = 5 * 60 * 1000;
const DETAIL_FIELDS = [
  "action",
  "projectId",
  "projectName",
  "taskId",
  "taskTitle",
  "fromStatus",
  "toStatus",
  "surveyTitle",
];
let lastNavigationLog = 0;

export async function logActivity(type, details = {}) {
  const user = auth.currentUser;
  if (!user) return;
  const safeDetails = Object.fromEntries(
    DETAIL_FIELDS
      .filter((field) => typeof details[field] === "string" && details[field].trim())
      .map((field) => [field, details[field].trim().slice(0, 160)])
  );
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId: user.uid,
      type,
      timestamp: serverTimestamp(),
      ...safeDetails,
    });
  } catch (err) {
    console.warn("No se pudo registrar la actividad:", err);
  }
}

export function logNavigation() {
  const now = Date.now();
  if (now - lastNavigationLog < NAVIGATION_THROTTLE_MS) return;
  lastNavigationLog = now;
  logActivity("navigation");
}

export function logLogin() {
  logActivity("login");
}
