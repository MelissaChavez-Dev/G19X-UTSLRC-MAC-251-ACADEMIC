import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { deleteObject, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, storage } from "./firebase";
import { countBusinessDays, findLeaveOverlap, getVacationBalance } from "../utils/leaveUtils";
import {
  getLeaveDocumentUrl,
  validateLeaveDocumentFile,
  validateRejectionNote,
} from "../utils/leaveDocumentUtils";

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

export async function submitLeaveRequest({
  user,
  profile,
  type,
  startDate,
  endDate,
  reason,
  existingRequests,
  proofFile = null,
}) {
  if (!user?.uid) throw new Error("Inicia sesión para enviar una solicitud.");
  if (!LEAVE_TYPES.some((leaveType) => leaveType.id === type)) throw new Error("Selecciona un tipo de permiso válido.");
  if (!startDate || !endDate) throw new Error("Selecciona la fecha inicial y final.");
  if (!reason.trim()) throw new Error("Describe brevemente el motivo de la solicitud.");
  if (type === "sick") {
    const proofError = validateLeaveDocumentFile(proofFile);
    if (proofError) throw new Error(proofError);
  } else if (proofFile) {
    throw new Error("El comprobante solo se adjunta a solicitudes de incapacidad.");
  }

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
  let documentPath = "";
  if (proofFile) {
    documentPath = `leave-documents/${user.uid}/pending/${crypto.randomUUID()}`;
    await uploadBytes(ref(storage, documentPath), proofFile, {
      contentType: proofFile.type,
      customMetadata: { ownerUid: user.uid },
    });
  }

  try {
    const result = await callable({
      type,
      startDate,
      endDate,
      reason: reason.trim().slice(0, 500),
      documentPath: documentPath || null,
    });
    return result.data;
  } catch (error) {
    if (documentPath) {
      try {
        await deleteObject(ref(storage, documentPath));
      } catch (cleanupError) {
        console.error("No se pudo limpiar el comprobante temporal:", cleanupError);
      }
    }
    throw error;
  }
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
  if (status === "rejected") {
    const noteError = validateRejectionNote(reviewNote);
    if (noteError) throw new Error(noteError);
  }
  await updateDoc(doc(db, "leaveRequests", requestId), {
    status,
    reviewedBy: reviewerId,
    reviewNote: reviewNote.trim().slice(0, 500),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function openLeaveDocument(request) {
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("El navegador bloqueó la apertura del comprobante.");
  popup.opener = null;

  try {
    const url = request?.documentPath
      ? await getDownloadURL(ref(storage, request.documentPath))
      : getLeaveDocumentUrl(request);
    if (!url) throw new Error("Esta solicitud no tiene un comprobante disponible.");
    popup.location.replace(url);
  } catch (error) {
    popup.close();
    throw error;
  }
}
