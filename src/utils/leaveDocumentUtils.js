export const MIN_REJECTION_NOTE_LENGTH = 10;
export const MAX_REJECTION_NOTE_LENGTH = 500;
export const MAX_LEAVE_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const LEAVE_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function validateRejectionNote(note) {
  const length = String(note || "").trim().length;
  if (length < MIN_REJECTION_NOTE_LENGTH) {
    return `Escribe al menos ${MIN_REJECTION_NOTE_LENGTH} caracteres para explicar el rechazo.`;
  }
  if (length > MAX_REJECTION_NOTE_LENGTH) {
    return `El motivo no puede superar ${MAX_REJECTION_NOTE_LENGTH} caracteres.`;
  }
  return "";
}

export function getLeaveDocumentUrl(request) {
  const url = request?.documentUrl || request?.proofUrl || "";
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

export function validateLeaveDocumentFile(file) {
  if (!file) return "Selecciona un comprobante médico.";
  if (!LEAVE_DOCUMENT_MIME_TYPES.includes(file.type)) {
    return "El comprobante debe ser un PDF, JPG o PNG.";
  }
  if (file.size <= 0 || file.size > MAX_LEAVE_DOCUMENT_SIZE) {
    return "El comprobante debe pesar más de 0 y hasta 10 MB.";
  }
  return "";
}

export function hasLeaveDocument(request) {
  return Boolean(request?.documentPath || getLeaveDocumentUrl(request));
}
