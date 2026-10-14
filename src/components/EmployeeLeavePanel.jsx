import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLeaves } from "../hooks/useLeaves";
import { cancelLeaveRequest, LEAVE_STATUS, LEAVE_TYPES, submitLeaveRequest } from "../services/leaveService";
import { countBusinessDays, getVacationBalance } from "../utils/leaveUtils";

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30";

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EmployeeLeavePanel() {
  const { user, profile } = useAuth();
  const { requests, loading, error: loadError } = useLeaves();
  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const balance = profile?.hireDate
    ? getVacationBalance(profile.hireDate, requests)
    : null;
  const requestedBusinessDays = form.startDate && form.endDate && form.startDate <= form.endDate
    ? countBusinessDays(form.startDate, form.endDate)
    : null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await submitLeaveRequest({ user, profile, ...form, existingRequests: requests });
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" });
      setNotice("Tu solicitud se envió a RH para su revisión.");
    } catch (submitError) {
      console.error("No se pudo enviar la solicitud de permiso:", submitError);
      setError(submitError.message || "No se pudo enviar la solicitud.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(request) {
    setCancellingId(request.id);
    setError("");
    setNotice("");
    try {
      await cancelLeaveRequest(request.id);
      setNotice("La solicitud pendiente se canceló.");
    } catch (cancelError) {
      console.error("No se pudo cancelar la solicitud de permiso:", cancelError);
      setError(cancelError.message || "No se pudo cancelar la solicitud.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
      <div>
        <h2 className="text-headline-sm text-on-surface">Permisos y vacaciones</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Envía una solicitud y consulta su resolución. Solo RH puede aprobarla.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-space-sm">
        <div className="rounded-xl bg-primary-container px-space-md py-space-sm text-on-primary-container">
          <p className="text-label-sm">Saldo anual</p>
          <p className="text-headline-md font-semibold">{balance ? `${balance.available} días` : "Sin calcular"}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low px-space-md py-space-sm text-on-surface">
          <p className="text-label-sm text-on-surface-variant">En revisión</p>
          <p className="text-headline-md font-semibold">
            {requests.filter((request) => request.status === "pending").length}
          </p>
        </div>
      </div>
      {!profile?.hireDate && (
        <p className="text-label-sm text-on-surface-variant">
          RH aún no registra tu fecha de ingreso; el saldo de vacaciones se calculará cuando esté disponible.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm border-t border-outline-variant pt-space-md">
        <h3 className="text-label-lg font-semibold text-on-surface">Nueva solicitud</h3>
        <label htmlFor="leave-type" className="flex flex-col gap-space-xs text-label-md text-on-surface">
          Tipo de permiso
          <select
            id="leave-type"
            className={inputClass}
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          >
            {LEAVE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <label htmlFor="leave-start" className="flex flex-col gap-space-xs text-label-md text-on-surface">
            Desde
            <input
              id="leave-start"
              type="date"
              className={inputClass}
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              required
            />
          </label>
          <label htmlFor="leave-end" className="flex flex-col gap-space-xs text-label-md text-on-surface">
            Hasta
            <input
              id="leave-end"
              type="date"
              className={inputClass}
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              required
            />
          </label>
        </div>
        <label htmlFor="leave-reason" className="flex flex-col gap-space-xs text-label-md text-on-surface">
          Motivo
          <textarea
            id="leave-reason"
            className={`${inputClass} min-h-20 resize-y`}
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            maxLength={500}
            required
          />
        </label>
        {requestedBusinessDays !== null && (
          <p className="text-label-sm text-on-surface-variant">
            Días hábiles solicitados: {requestedBusinessDays}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || requestedBusinessDays === 0}
          className="motion-press inline-flex items-center justify-center gap-space-xs self-start rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      {(error || loadError) && (
        <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
          {error || "No se pudieron cargar tus solicitudes. Revisa tu conexión e inténtalo de nuevo."}
        </p>
      )}
      {notice && <p role="status" className="rounded-lg bg-success-container px-space-md py-space-sm text-body-sm text-on-success-container">{notice}</p>}

      <div className="flex flex-col gap-space-xs border-t border-outline-variant pt-space-md">
        <h3 className="text-label-lg font-semibold text-on-surface">Historial de solicitudes</h3>
        {loading ? (
          <div role="status" className="h-16 animate-shimmer rounded-xl" />
        ) : requests.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Aún no tienes solicitudes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant/60">
            {requests.map((request) => {
              const status = LEAVE_STATUS[request.status] || LEAVE_STATUS.pending;
              return (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-space-sm py-space-sm">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface">
                      {LEAVE_TYPES.find((type) => type.id === request.type)?.label || "Permiso"} · {request.businessDays} días
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {formatDate(request.startDate)} – {formatDate(request.endDate)}
                    </p>
                    {request.reviewNote && <p className="text-label-sm text-on-surface-variant">{request.reviewNote}</p>}
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <span className={`rounded-full px-space-sm py-1 text-label-sm ${
                      status.tone === "success" ? "bg-success-container text-on-success-container"
                        : status.tone === "error" ? "bg-error-container text-on-error-container"
                          : status.tone === "warning" ? "bg-warning-container text-on-warning-container"
                            : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {status.label}
                    </span>
                    {request.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(request)}
                        disabled={cancellingId === request.id}
                        className="text-label-sm font-semibold text-error hover:underline disabled:opacity-50"
                      >
                        {cancellingId === request.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
