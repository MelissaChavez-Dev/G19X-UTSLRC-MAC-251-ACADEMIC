import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import { Icon } from "./EmployeeUi";
import { LEAVE_STATUS, LEAVE_TYPES, openLeaveDocument } from "../services/leaveService";
import { findDepartmentOverlaps } from "../utils/leaveUtils";
import {
  hasLeaveDocument,
  MAX_REJECTION_NOTE_LENGTH,
  validateRejectionNote,
} from "../utils/leaveDocumentUtils";

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimestamp(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  return date
    ? date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : "—";
}

function statusClasses(tone) {
  if (tone === "success") return "bg-secondary-container text-on-secondary-container";
  if (tone === "error") return "bg-error-container text-on-error-container";
  if (tone === "warning") return "bg-tertiary-container text-on-tertiary-container";
  return "bg-surface-container-high text-on-surface-variant";
}

function statusDot(tone) {
  if (tone === "success") return "bg-secondary";
  if (tone === "error") return "bg-error";
  if (tone === "warning") return "bg-tertiary";
  return "bg-outline";
}

function ActionButton({ children, className, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`motion-press inline-flex min-h-11 items-center justify-center gap-space-xs rounded-full px-space-md py-2 text-label-md font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export default function LeaveDetailModal({
  request,
  allRequests,
  departments,
  profiles,
  queue,
  initialMode = "view",
  busy = false,
  error = "",
  notice = "",
  headcount = 0,
  returnFocusRef,
  onClose,
  onNavigate,
  onApprove,
  onReject,
}) {
  const [mode, setMode] = useState(initialMode);
  const [rejectionNote, setRejectionNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [previousRequestId, setPreviousRequestId] = useState(request.id);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const rejectionFieldRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  if (request.id !== previousRequestId) {
    setPreviousRequestId(request.id);
    setMode(initialMode);
    setRejectionNote("");
    setNoteError(initialMode === "reject" ? validateRejectionNote("") : "");
    setDocumentError("");
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnTarget = returnFocusRef?.current || document.activeElement;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    const focusTarget = mode === "reject"
      ? rejectionFieldRef.current
      : mode === "approve"
        ? confirmButtonRef.current
        : closeButtonRef.current;
    const frame = window.requestAnimationFrame(() => focusTarget?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const pendingIndex = queue.findIndex((item) => item.id === request.id);
  const overlaps = useMemo(
    () => findDepartmentOverlaps(request, allRequests),
    [request, allRequests]
  );
  const status = LEAVE_STATUS[request.status] || LEAVE_STATUS.pending;
  const department = departments.find((item) => item.id === request.departmentId)?.name
    || request.departmentId
    || "—";
  const reviewer = profiles[request.reviewedBy]?.displayName
    || request.reviewedByName
    || request.reviewedBy
    || "—";
  const documentAvailable = hasLeaveDocument(request);
  const isPending = request.status === "pending";

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (busy) return;
      if (mode !== "view") {
        setMode("view");
        setNoteError("");
      } else {
        onClose();
      }
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ) || [])].filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function beginReject() {
    setRejectionNote("");
    setNoteError(validateRejectionNote(""));
    setMode("reject");
  }

  function updateRejectionNote(value) {
    setRejectionNote(value);
    setNoteError(value ? validateRejectionNote(value) : "");
  }

  async function confirmRejection(event) {
    event.preventDefault();
    const validationError = validateRejectionNote(rejectionNote);
    setNoteError(validationError);
    if (validationError || busy) return;
    await onReject(request, rejectionNote);
  }

  async function handleOpenDocument() {
    setDocumentError("");
    try {
      await openLeaveDocument(request);
    } catch (openError) {
      setDocumentError(openError.message || "No se pudo abrir el comprobante.");
    }
  }

  if (!request) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-5"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-detail-title"
        aria-describedby="leave-detail-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-outline-variant/70 bg-surface text-on-surface shadow-2xl sm:max-w-2xl sm:rounded-[28px]"
      >
        <header className="shrink-0 border-b border-outline-variant/60 bg-surface-container-lowest px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={request.employeeName}
              photoURL={profiles[request.userId]?.photoURL}
              size={52}
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold ${statusClasses(status.tone)}`}>
                  <i className={`h-1.5 w-1.5 rounded-full ${statusDot(status.tone)}`} />
                  {status.label}
                </span>
                {isPending && (
                  <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm text-on-surface-variant">
                    Requiere revisión
                  </span>
                )}
              </div>
              <h2 id="leave-detail-title" className="mt-2 text-title-lg font-semibold tracking-tight text-on-surface">
                {request.employeeName || "Colaborador"}
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {department}{request.employeeId ? ` · ID ${request.employeeId}` : ""}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Cerrar detalle"
              disabled={busy}
              onClick={onClose}
              className="motion-press -mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          {isPending && pendingIndex >= 0 && queue.length > 0 && (
            <nav aria-label="Navegación de solicitudes pendientes" className="mt-4 flex items-center justify-between rounded-2xl bg-surface-container-low px-2 py-1.5">
              <button
                type="button"
                disabled={busy || pendingIndex === 0}
                onClick={() => onNavigate(queue[pendingIndex - 1])}
                className="motion-press inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-label-sm font-semibold text-primary transition hover:bg-primary-container disabled:pointer-events-none disabled:opacity-35"
              >
                <Icon name="chevron_left" size={18} />
                Anterior
              </button>
              <span className="text-label-sm font-medium text-on-surface-variant">
                {pendingIndex + 1} de {queue.length}
              </span>
              <button
                type="button"
                disabled={busy || pendingIndex === queue.length - 1}
                onClick={() => onNavigate(queue[pendingIndex + 1])}
                className="motion-press inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-label-sm font-semibold text-primary transition hover:bg-primary-container disabled:pointer-events-none disabled:opacity-35"
              >
                Siguiente
                <Icon name="chevron_right" size={18} />
              </button>
            </nav>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          <p id="leave-detail-description" className="sr-only">
            Detalle completo de la solicitud de permiso.
          </p>

          {error && (
            <p role="alert" className="mb-4 rounded-2xl border border-error/20 bg-error-container px-4 py-3 text-body-sm text-on-error-container">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mb-4 rounded-2xl border border-secondary/20 bg-secondary-container px-4 py-3 text-body-sm text-on-secondary-container">
              {notice}
            </p>
          )}

          <section aria-label="Resumen de la solicitud" className="overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-lowest">
            <div className="flex items-center gap-3 border-b border-outline-variant/50 px-4 py-3.5 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon name="event_available" size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-label-sm text-on-surface-variant">Periodo solicitado</p>
                <p className="mt-0.5 text-title-md font-semibold tracking-tight text-on-surface">
                  {formatDate(request.startDate)} – {formatDate(request.endDate)}
                </p>
              </div>
              <div className="hidden shrink-0 rounded-xl bg-surface-container-low px-3 py-2 text-right sm:block">
                <p className="text-label-sm text-on-surface-variant">Duración</p>
                <p className="text-title-md font-semibold text-on-surface">{request.businessDays ?? "—"} <span className="text-body-sm font-medium">días</span></p>
              </div>
            </div>
            <dl className="grid grid-cols-2 divide-x divide-outline-variant/50 sm:grid-cols-3">
              <div className="px-4 py-3.5 sm:px-5">
                <dt className="text-label-sm text-on-surface-variant">Tipo de permiso</dt>
                <dd className="mt-1 text-body-sm font-semibold text-on-surface">
                  {LEAVE_TYPES.find((type) => type.id === request.type)?.label || request.type}
                </dd>
              </div>
              <div className="px-4 py-3.5 sm:px-5">
                <dt className="text-label-sm text-on-surface-variant sm:hidden">Días hábiles</dt>
                <dt className="hidden text-label-sm text-on-surface-variant sm:block">Solicitud recibida</dt>
                <dd className="mt-1 text-body-sm font-semibold text-on-surface">
                  <span className="sm:hidden">{request.businessDays ?? "—"} días</span>
                  <span className="hidden sm:inline">{formatTimestamp(request.createdAt)}</span>
                </dd>
              </div>
              <div className="col-span-2 border-t border-outline-variant/50 px-4 py-3.5 sm:col-span-1 sm:border-l-0 sm:border-t-0 sm:px-5">
                <dt className="text-label-sm text-on-surface-variant sm:hidden">Solicitud recibida</dt>
                <dt className="hidden text-label-sm text-on-surface-variant sm:block">Estado</dt>
                <dd className="mt-1 text-body-sm font-semibold text-on-surface sm:hidden">{formatTimestamp(request.createdAt)}</dd>
                <dd className="mt-1 hidden text-body-sm font-semibold text-on-surface sm:block">{status.label}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="subject" size={19} className="text-primary" />
              <h3 className="text-title-sm font-semibold text-on-surface">Motivo de la solicitud</h3>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-2xl bg-surface-container-low px-4 py-4 text-body-md leading-relaxed text-on-surface whitespace-pre-wrap break-words">
              {request.reason || "No se proporcionó un motivo."}
            </div>
          </section>

          {request.type === "sick" && (
            <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-outline-variant/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                  <Icon name="description" size={19} />
                </span>
                <div>
                  <h3 className="text-body-sm font-semibold text-on-surface">Comprobante médico</h3>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">
                    {documentAvailable ? "Documento adjunto a la solicitud" : "Sin comprobante (solicitud anterior al requisito)"}
                  </p>
                </div>
              </div>
              {documentAvailable && (
                <button
                  type="button"
                  onClick={handleOpenDocument}
                  className="motion-press inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full px-4 text-label-md font-semibold text-primary transition hover:bg-primary-container sm:self-auto"
                >
                  <Icon name="open_in_new" size={18} />
                  Ver comprobante
                </button>
              )}
              {documentError && <p role="alert" className="text-body-sm text-error">{documentError}</p>}
            </section>
          )}

          {request.type === "annual" && (
            <section className="mt-4 flex items-center gap-3 rounded-2xl border border-outline-variant/60 px-4 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon name="beach_access" size={20} />
              </span>
              <div>
                <p className="text-label-sm text-on-surface-variant">Saldo de vacaciones al solicitar</p>
                <p className="mt-0.5 text-title-md font-semibold text-on-surface">
                  {request.balanceAtRequest == null ? "No disponible" : `${request.balanceAtRequest} días`}
                </p>
              </div>
            </section>
          )}

          {isPending ? (
            <section className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
                  <Icon name="groups" size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-title-sm font-semibold text-on-surface">Disponibilidad del equipo</h3>
                  <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">
                    {overlaps.length
                      ? `${overlaps.length} ${overlaps.length === 1 ? "persona tiene" : "personas tienen"} permiso aprobado durante estas fechas${headcount > 0 ? `, de un equipo de ${headcount}` : ""}.`
                      : "No hay otros permisos aprobados del departamento que coincidan con estas fechas."}
                  </p>
                  {overlaps.length > 0 && (
                    <ul className="mt-3 divide-y divide-outline-variant/50">
                      {overlaps.slice(0, 3).map((overlap) => (
                        <li key={overlap.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-body-sm">
                          <span className="font-medium text-on-surface">{overlap.employeeName || "Colaborador"}</span>
                          <span className="text-label-sm text-on-surface-variant">{formatDate(overlap.startDate)} – {formatDate(overlap.endDate)}</span>
                        </li>
                      ))}
                      {overlaps.length > 3 && (
                        <li className="pt-2 text-label-sm text-on-surface-variant">Y {overlaps.length - 3} personas más.</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-5 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Icon name="fact_check" size={19} className="text-primary" />
                <h3 className="text-title-sm font-semibold text-on-surface">Resolución</h3>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Revisada por</dt>
                  <dd className="mt-1 text-body-sm font-medium text-on-surface break-words">{reviewer}</dd>
                </div>
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Fecha de resolución</dt>
                  <dd className="mt-1 text-body-sm font-medium text-on-surface">{formatTimestamp(request.reviewedAt)}</dd>
                </div>
              </dl>
              {request.status === "rejected" && request.reviewNote && (
                <div className="mt-4 rounded-xl bg-error-container/60 px-3.5 py-3">
                  <p className="text-label-sm font-semibold text-on-error-container">Motivo del rechazo</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-on-error-container">{request.reviewNote}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="shrink-0 border-t border-outline-variant/60 bg-surface-container-lowest px-5 py-4 sm:px-7">
          {isPending && mode === "view" && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton
                onClick={beginReject}
                className="border border-error/35 bg-surface-container-lowest text-error hover:bg-error-container"
              >
                <Icon name="close" size={18} />
                Rechazar solicitud
              </ActionButton>
              <ActionButton onClick={() => setMode("approve")} className="bg-primary text-on-primary hover:brightness-95">
                <Icon name="check" size={18} />
                Aprobar solicitud
              </ActionButton>
            </div>
          )}

          {isPending && mode === "approve" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body-sm font-medium text-on-surface">¿Confirmas la aprobación de este permiso?</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <ActionButton disabled={busy} onClick={() => setMode("view")} className="bg-surface-container text-on-surface hover:bg-surface-container-high">
                  Volver
                </ActionButton>
                <ActionButton
                  disabled={busy}
                  onClick={() => onApprove(request)}
                  className="bg-primary text-on-primary hover:brightness-95"
                >
                  <Icon name={busy ? "progress_activity" : "check"} size={18} />
                  {busy ? "Guardando..." : "Confirmar aprobación"}
                </ActionButton>
              </div>
            </div>
          )}

          {isPending && mode === "reject" && (
            <form onSubmit={confirmRejection} className="flex flex-col gap-3">
              <div>
                <label htmlFor="leave-rejection-note" className="text-body-sm font-semibold text-on-surface">
                  Motivo del rechazo <span aria-hidden="true">*</span>
                </label>
                <p className="mt-1 text-label-sm text-on-surface-variant">Explica la decisión para que la persona tenga claridad.</p>
              </div>
              <textarea
                ref={rejectionFieldRef}
                id="leave-rejection-note"
                value={rejectionNote}
                maxLength={MAX_REJECTION_NOTE_LENGTH}
                onChange={(event) => updateRejectionNote(event.target.value)}
                aria-required="true"
                aria-invalid={Boolean(noteError)}
                aria-describedby="leave-rejection-error leave-rejection-count"
                disabled={busy}
                rows={3}
                placeholder="Escribe aquí el motivo..."
                className="w-full resize-y rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-body-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
              <div className="flex items-start justify-between gap-3">
                <p id="leave-rejection-error" role={noteError ? "alert" : undefined} className={`text-body-sm ${noteError ? "text-error" : "text-on-surface-variant"}`}>
                  {noteError || "El motivo quedará registrado junto con la resolución."}
                </p>
                <span id="leave-rejection-count" className="shrink-0 text-label-sm text-on-surface-variant">
                  {rejectionNote.length}/{MAX_REJECTION_NOTE_LENGTH}
                </span>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <ActionButton disabled={busy} onClick={() => { setMode("view"); setNoteError(""); }} className="bg-surface-container text-on-surface hover:bg-surface-container-high">
                  Volver
                </ActionButton>
                <ActionButton
                  type="submit"
                  disabled={busy || Boolean(validateRejectionNote(rejectionNote))}
                  className="bg-error text-on-error hover:brightness-95"
                >
                  <Icon name={busy ? "progress_activity" : "close"} size={18} />
                  {busy ? "Guardando..." : "Confirmar rechazo"}
                </ActionButton>
              </div>
            </form>
          )}

          {!isPending && (
            <div className="flex justify-end">
              <ActionButton onClick={onClose} className="bg-primary text-on-primary hover:brightness-95">
                Cerrar detalle
              </ActionButton>
            </div>
          )}
        </footer>
      </motion.section>
    </motion.div>,
    document.body
  );
}
