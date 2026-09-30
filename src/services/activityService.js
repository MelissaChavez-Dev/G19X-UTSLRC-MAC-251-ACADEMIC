import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Registro de presencia digital (Fase E).
 * Un "movimiento" es: login, envío de encuesta, acción de kanban o
 * navegación dentro de la app (throttled a 1 registro cada 5 min).
 * La telemetría nunca debe bloquear la UX: los errores se ignoran.
 */

const NAVIGATION_THROTTLE_MS = 5 * 60 * 1000;
let lastNavigationLog = 0;

export async function logActivity(type) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId: user.uid,
      type,
      timestamp: serverTimestamp(),
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
