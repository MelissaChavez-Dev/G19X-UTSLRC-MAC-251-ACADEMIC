import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLeaves } from "../hooks/useLeaves";
import { cancelLeaveRequest, LEAVE_STATUS, LEAVE_TYPES, submitLeaveRequest } from "../services/leaveService";
import { countBusinessDays, getVacationBalance } from "../utils/leaveUtils";
import { Card, EmptyState, fieldClass, Icon, Notice, SectionHeader, StatTile } from "./EmployeeUi";

const EMPTY_FORM = { type: "annual", startDate: "", endDate: "", reason: "" };

const STATUS_CLASSES = {
  success: "bg-success-container text-on-success-container",
  error: "bg-error-container text-on-error-container",
  warning: "bg-warning-container text-on-warning-container",
};

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const balance = profile?.hireDate ? getVacationBalance(profile.hireDate, requests) : null;
  const requestedBusinessDays =
    form.startDate && form.endDate && form.startDate <= form.endDate
      ? countBusinessDays(form.startDate, form.endDate)
      : null;
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const exceedsBalance =
    form.type === "annual" && balance && requestedBusinessDays !== null && requestedBusinessDays > balance.available;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await submitLeaveRequest({ user, profile, ...form, existingRequests: requests });
      setForm(EMPTY_FORM);
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
    <div className="flex flex-col gap-space-lg">
      {/* Resumen */}
      <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
        <StatTile
          highlight
          icon="beach_access"
          label="Saldo anual"
          value={balance ? `${balance.available} días` : "Sin calcular"}
        />
        <StatTile icon="hourglass_top" label="En revisión" value={pendingCount} />
        <StatTile icon="history" label="Solicitudes en total" value={loading ? "…" : requests.length} />
      </div>
      {!profile?.hireDate && (
        <Notice tone="warning">
          RH aún no registra tu fecha de ingreso. El saldo de vacaciones se calculará cuando esté disponible.
        </Notice>
      )}

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Nueva solicitud */}
        <Card className="flex flex-col gap-space-md">
          <SectionHeader
            title="Nueva solicitud"
            description="Se envía a RH, que es quien la aprueba."
          />
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
            <label htmlFor="leave-type" className="flex flex-col gap-space-xs text-label-md text-on-surface">
              Tipo de permiso
              <select
                id="leave-type"
                className={fieldClass}
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
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
                  className={fieldClass}
                  value={form.startDate}
                  onChange={(event) => updateField("startDate", event.target.value)}
                  required
                />
              </label>
              <label htmlFor="leave-end" className="flex flex-col gap-space-xs text-label-md text-on-surface">
                Hasta
                <input
                  id="leave-end"
                  type="date"
                  className={fieldClass}
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(event) => updateField("endDate", event.target.value)}
                  required
                />
              </label>
            </div>
            <label htmlFor="leave-reason" className="flex flex-col gap-space-xs text-label-md text-on-surface">
              Motivo
              <textarea
                id="leave-reason"
                className={`${fieldClass} min-h-24 resize-y`}
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                maxLength={500}
                required
              />
            </label>

            {requestedBusinessDays !== null && (
              <p className="inline-flex w-fit items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-1.5 text-label-md text-on-surface">
                <Icon name="date_range" size={16} className="text-primary" />
                {requestedBusinessDays === 0
                  ? "El rango no incluye días hábiles"
                  : `${requestedBusinessDays} ${requestedBusinessDays === 1 ? "día hábil" : "días hábiles"}`}
              </p>
            )}
            {exceedsBalance && (
              <Notice tone="warning">
                Pides más días de los que tienes disponibles ({balance.available}). RH revisará la solicitud.
              </Notice>
            )}

            <button
              type="submit"
              disabled={saving || requestedBusinessDays === 0}
              className="motion-press inline-flex items-center justify-center gap-space-xs self-start rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              <Icon name="send" size={18} />
              {saving ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>

          {(error || loadError) && (
            <Notice tone="error">
              {error || "No se pudieron cargar tus solicitudes. Revisa tu conexión e inténtalo de nuevo."}
            </Notice>
          )}
          {notice && <Notice tone="success">{notice}</Notice>}
        </Card>

        {/* Historial */}
        <Card className="flex flex-col gap-space-md">
          <SectionHeader title="Historial de solicitudes" />
          {loading ? (
            <div role="status" aria-label="Cargando solicitudes" className="h-24 animate-shimmer rounded-xl" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon="event_available"
              title="Aún no tienes solicitudes"
              text="Cuando envíes una, aquí verás su estado y la respuesta de RH."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-outline-variant/60">
              {requests.map((request) => {
                const status = LEAVE_STATUS[request.status] || LEAVE_STATUS.pending;
                const typeLabel = LEAVE_TYPES.find((type) => type.id === request.type)?.label || "Permiso";
                return (
                  <li key={request.id} className="flex flex-wrap items-center justify-between gap-space-sm py-space-sm">
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold text-on-surface">
                        {typeLabel}, {request.businessDays} {request.businessDays === 1 ? "día" : "días"}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        Del {formatDate(request.startDate)} al {formatDate(request.endDate)}
                      </p>
                      {request.reviewNote && (
                        <p className="mt-1 flex items-start gap-space-xs text-label-sm text-on-surface-variant">
                          <Icon name="comment" size={14} className="mt-0.5 shrink-0" />
                          {request.reviewNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <span
                        className={`rounded-full px-space-sm py-1 text-label-sm font-semibold ${
                          STATUS_CLASSES[status.tone] || "bg-surface-container text-on-surface-variant"
                        }`}
                      >
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
        </Card>
      </div>
    </div>
  );
}