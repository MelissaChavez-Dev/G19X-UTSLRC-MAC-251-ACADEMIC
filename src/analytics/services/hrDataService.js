import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { assertNoSalaryFields } from "../constants";

const MAX_DASHBOARDS_PER_ADMIN = 5;
const MAX_PAGES_PER_DASHBOARD = 20;
const MAX_WIDGETS_PER_PAGE = 30;

function createDashboardId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function validateDashboard({ name, description, pages }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    throw new Error("El nombre debe contener entre 1 y 80 caracteres.");
  }
  if (description !== undefined && (
    typeof description !== "string" || description.length > 500
  )) {
    throw new Error("La descripción no puede superar 500 caracteres.");
  }
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > MAX_PAGES_PER_DASHBOARD) {
    throw new Error(`El dashboard admite entre 1 y ${MAX_PAGES_PER_DASHBOARD} páginas.`);
  }
  pages.forEach((page) => {
    if (
      !page ||
      typeof page.id !== "string" ||
      typeof page.title !== "string" ||
      !page.title.trim() ||
      page.title.length > 100 ||
      !Array.isArray(page.widgets) ||
      page.widgets.length > MAX_WIDGETS_PER_PAGE ||
      !Array.isArray(page.slicers)
    ) {
      throw new Error("El dashboard contiene una página inválida.");
    }
  });
  assertNoSalaryFields(pages);
}

export function subscribeHrDashboards(ownerId, onDashboards, onError) {
  if (!ownerId) throw new Error("No se pudo identificar al administrador.");
  return onSnapshot(
    doc(db, "users", ownerId),
    (snapshot) => {
      const dashboards = snapshot.exists() ? snapshot.data().hrDashboards || [] : [];
      onDashboards(Array.isArray(dashboards) ? dashboards : []);
    },
    onError
  );
}

export async function saveHrDashboard(ownerId, dashboardId, dashboardData) {
  if (!ownerId) throw new Error("No se pudo identificar al administrador.");
  validateDashboard(dashboardData);
  const userRef = doc(db, "users", ownerId);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) throw new Error("No se encontró tu perfil en users.");

  const profile = userSnapshot.data();
  const currentDashboards = Array.isArray(profile.hrDashboards) ? profile.hrDashboards : [];
  const id = dashboardId || createDashboardId();
  const index = currentDashboards.findIndex((dashboard) => dashboard.id === id);
  if (index < 0 && currentDashboards.length >= MAX_DASHBOARDS_PER_ADMIN) {
    throw new Error(`Puedes guardar hasta ${MAX_DASHBOARDS_PER_ADMIN} dashboards personalizados.`);
  }

  const previous = index >= 0 ? currentDashboards[index] : null;
  const nextDashboard = {
    id,
    ownerId,
    name: dashboardData.name.trim(),
    description: dashboardData.description || "",
    pages: dashboardData.pages,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextDashboards = index >= 0
    ? currentDashboards.map((dashboard, itemIndex) => itemIndex === index ? nextDashboard : dashboard)
    : [...currentDashboards, nextDashboard];

  assertNoSalaryFields(nextDashboards);
  await updateDoc(userRef, {
    hrDashboards: nextDashboards,
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function deleteHrDashboard(ownerId, dashboardId) {
  if (!ownerId || !dashboardId) throw new Error("Falta el dashboard o su propietario.");
  const userRef = doc(db, "users", ownerId);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) throw new Error("No se encontró tu perfil en users.");
  const currentDashboards = Array.isArray(userSnapshot.data().hrDashboards)
    ? userSnapshot.data().hrDashboards
    : [];
  const nextDashboards = currentDashboards.filter((dashboard) => dashboard.id !== dashboardId);
  if (nextDashboards.length === currentDashboards.length) {
    throw new Error("No se encontró el dashboard solicitado.");
  }
  await updateDoc(userRef, {
    hrDashboards: nextDashboards,
    updatedAt: serverTimestamp(),
  });
}
