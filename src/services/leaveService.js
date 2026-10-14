import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";
import { countBusinessDays, findLeaveOverlap, getVacationBalance } from "../utils/leaveUtils";

export const LEAVE_TYPES = [
  { id: "annual", label: "Vacaciones" },
  { id: "sick", label: "Incapacidad / enfermedad" },
  { id: "other", label: "Otro permiso" },
];

export const LEAVE_STATUS = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Rechazada", tone: "error" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export async function listMyLeaveRequests(userId) {
  const snapshot = await getDocs(query(
    collection(db, "leaveRequests"),
    where("userId", "==", userId)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function submitLeaveRequest({ user, profile, type, startDate, endDate, reason, existingRequests }) {
  if (!user?.uid) throw new Error("Inicia sesión para enviar una solicitud.");
  if (!LEAVE_TYPES.some((leaveType) => leaveType.id === type)) throw new Error("Selecciona un tipo de permiso válido.");
  if (!startDate || !endDate) throw new Error("Selecciona la fecha inicial y final.");
  if (!reason.trim()) throw new Error("Describe brevemente el motivo de la solicitud.");

  const businessDays = countBusinessDays(startDate, endDate);
  if (businessDays === 0) throw new Error("El periodo seleccionado no contiene días laborales.");

  const request = { startDate, endDate };
  const overlap = findLeaveOverlap(request, existingRequests);
  if (overlap) {
    throw new Error(`El periodo se traslapa con otra solicitud ${overlap.status === "approved" ? "aprobada" : "pendiente"}.`);
  }

  if (type === "annual" && profile?.hireDate) {
    const balance = getVacationBalance(profile.hireDate, existingRequests);
    if (businessDays > balance.available) {
      throw new Error(`La solicitud excede el saldo disponible de ${balance.available} días.`);
    }
  }

  const callable = httpsCallable(functions, "submit_leave_request");
  const result = await callable({
    type,
    startDate,
    endDate,
    reason: reason.trim().slice(0, 500),
  });
  return result.data;
}

export async function cancelLeaveRequest(requestId) {
  await updateDoc(doc(db, "leaveRequests", requestId), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function reviewLeaveRequest(requestId, { status, reviewNote = "" }) {
  if (status !== "approved" && status !== "rejected") {
    throw new Error("La resolución debe ser aprobada o rechazada.");
  }
  const reviewerId = auth.currentUser?.uid;
  if (!reviewerId) throw new Error("Inicia sesión como administrador para resolver la solicitud.");
  await updateDoc(doc(db, "leaveRequests", requestId), {
    status,
    reviewedBy: reviewerId,
    reviewNote: reviewNote.trim().slice(0, 500),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
