import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useTurnoverMetrics } from "../hooks/useTurnoverMetrics";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyTeam, useMyTeams } from "../hooks/useTeams";
import { useTeamTasks } from "../hooks/useTeamTasks";
import { useTeamActivity } from "../hooks/useTeamActivity";
import { useAuth } from "../hooks/useAuth";
import { getKpiLevelForSample, MIN_SAMPLE } from "../data/kpiThresholds";

function Bell({ count, open, onToggle, children, label = "Notificaciones" }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${label} (${count})`}
        aria-expanded={open}
        aria-haspopup="true"
        className="motion-press relative flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {count > 0 && (
          <span className="animate-pop absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-tertiary text-on-tertiary text-[11px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-pop fixed inset-x-4 top-[4.5rem] z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/40 p-space-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:max-h-[28rem] sm:w-96">
          {children}
        </div>
      )}
    </div>
  );
}


function useDismissOnOutsideClick(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    // El contenedor de cada campana detiene la propagación de sus propios clics.
    document.addEventListener("click", onClose);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", onClose);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center gap-space-xs py-space-lg text-center">
      <span className="material-symbols-outlined text-[28px] text-on-surface-variant">notifications_off</span>
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  );
}

function alertFingerprint(alert) {
  return `${alert.severity}|${alert.title}|${alert.detail}`;
}

/** Campana del admin: departamentos que entran en nivel de riesgo alto y rotación real elevada. */
export function AdminNotificationBell({ alerts: dashboardAlerts }) {
  const [open, setOpen] = useState(false);
  const [readAlertState, setReadAlertState] = useState({ uid: null, alerts: {} });
  const [readError, setReadError] = useState("");
  const { user } = useAuth();
  const { rows } = useDepartmentRisk();
  const { metrics: turnover } = useTurnoverMetrics();
  useDismissOnOutsideClick(open, () => setOpen(false));

  useEffect(() => {
    if (!user?.uid) return undefined;

    return onSnapshot(
      collection(db, "users", user.uid, "readAlerts"),
      (snapshot) => {
        setReadAlertState({
          uid: user.uid,
          alerts: Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()])),
        });
        setReadError("");
      },
      (error) => {
        console.error("No se pudo cargar el estado de lectura de alertas:", error);
        setReadError("No se pudo sincronizar el estado de lectura.");
      }
    );
  }, [user?.uid]);
  const readAlerts = readAlertState.uid === user?.uid ? readAlertState.alerts : {};

  async function markAsRead(alert) {
    if (!user?.uid) return;
    const documentId = encodeURIComponent(alert.id);
    try {
      await setDoc(
        doc(db, "users", user.uid, "readAlerts", documentId),
        { fingerprint: alertFingerprint(alert), readAt: serverTimestamp() },
        { merge: true }
      );
      setReadError("");
    } catch (error) {
      console.error("No se pudo marcar la alerta como leída:", error);
      setReadError("No se pudo guardar el estado de lectura. Revisa tus permisos o conexión.");
    }
  }

  const riskAlerts = (rows || []).filter(
    (row) => row.tier?.tone === "critical" || row.tier?.tone === "elevated"
  );
  const turnoverLevel = getKpiLevelForSample(
    "turnover90d",
    turnover?.rate,
    turnover?.headcount,
    MIN_SAMPLE.headcount
  );
  const hasTurnoverAlert = turnoverLevel.tone === "critical" || turnoverLevel.tone === "elevated";
  const fallbackAlerts = [
    ...riskAlerts.map((row) => ({
      id: row.id,
      severity: row.tier.tone,
      title: `${row.name} está en nivel ${row.tier.label.toLowerCase()}`,
      detail: `Índice de presión laboral: ${Number.isFinite(row.attritionRisk) ? `${row.attritionRisk}/100 puntos` : "—"}`,
    })),
    ...(hasTurnoverAlert
      ? [{
        id: "turnover",
        severity: turnoverLevel.tone,
        title: `Rotación real: ${turnoverLevel.label.toLowerCase()}`,
        detail: `${turnover.rate}% de bajas en los últimos 90 días (${turnover.departures} de ${turnover.headcount} activos).`,
      }]
      : []),
  ];
  const alerts = dashboardAlerts ?? fallbackAlerts;
  const unreadCount = alerts.filter((alert) => (
    readAlerts[encodeURIComponent(alert.id)]?.fingerprint !== alertFingerprint(alert)
  )).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Bell count={unreadCount} open={open} onToggle={() => setOpen((v) => !v)} label="Alertas activas">
        <span className="text-label-md uppercase tracking-widest text-on-surface-variant font-semibold block px-space-xs pb-space-xs">
          Alertas activas
        </span>
        {readError && (
          <p role="alert" className="mb-space-xs rounded-xl bg-error-container px-space-sm py-2 text-label-sm text-on-error-container">
            {readError}
          </p>
        )}
        {alerts.length === 0 ? (
          <EmptyState text={dashboardAlerts ? "No hay alertas activas." : "Ningún departamento en riesgo alto por ahora."} />
        ) : (
          alerts.map((alert) => {
            const isRead = readAlerts[encodeURIComponent(alert.id)]?.fingerprint === alertFingerprint(alert);
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors ${
                  isRead ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    alert.severity === "critical" ? "text-error" : "text-warning"
                  }`}
                >
                  {isRead ? "check_circle" : alert.severity === "critical" ? "emergency_home" : "warning"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm text-on-surface font-semibold">{alert.title}</p>
                  <p className="text-body-sm text-on-surface-variant">{alert.detail}</p>
                  <button
                    type="button"
                    onClick={() => markAsRead(alert)}
                    disabled={isRead || !user?.uid}
                    className="mt-1 text-label-sm font-semibold text-primary hover:underline disabled:cursor-default disabled:no-underline disabled:text-on-surface-variant"
                  >
                    {isRead ? "Leída" : "Marcar como leída"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Bell>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campana del colaborador                                             */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TEAM_EVENTS = 15;

// La marca de "visto" vive en este dispositivo; evita depender de reglas nuevas en Firestore.
function seenStorageKey(uid) {
  return `team-activity-seen:${uid}`;
}

function readSeen(uid) {
  if (!uid) return 0;
  try {
    return Number(window.localStorage.getItem(seenStorageKey(uid))) || 0;
  } catch {
    return 0;
  }
}

function writeSeen(uid, value) {
  if (!uid) return;
  try {
    window.localStorage.setItem(seenStorageKey(uid), String(value));
  } catch {
    // Sin almacenamiento disponible: la marca solo dura mientras la pestaña esté abierta.
  }
}

function eventMillis(event) {
  return event.createdAt?.toMillis?.() ?? 0;
}

function timeAgo(millis) {
  if (!millis) return "Ahora";
  const minutes = Math.round((Date.now() - millis) / 60000);
  if (minutes < 1) return "Ahora";
  const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

// Tipos que guarda taskService en el historial de cada tarea.
const TEAM_EVENT_ICONS = {
  created: "add_task",
  status: "swap_horiz",
  updated: "edit",
  comment: "chat_bubble",
};

function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function describeTeamEvent(event) {
  const actor = event.actorName || "Alguien";
  const message = lowerFirst(event.message) || "hizo un cambio en una tarea";
  return { icon: TEAM_EVENT_ICONS[event.type] || "view_kanban", text: `${actor} ${message}` };
}

function BellSection({ title, action, children }) {
  return (
    <div className="pb-space-xs">
      <div className="flex items-center justify-between gap-space-sm px-space-xs py-space-xs">
        <span className="text-label-md font-semibold text-on-surface-variant">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Campana del colaborador: encuestas, entregas por vencer y cambios o comentarios en el kanban de su equipo. */
export function EmployeeNotificationBell() {
  const [open, setOpen] = useState(false);
  const [seenState, setSeenState] = useState({ uid: null, value: 0 });
  const { user } = useAuth();
  const uid = user?.uid;
  const { pending } = usePendingSurveys();
  const { team } = useMyTeam();
  const { tasks } = useTeamTasks(team?.id ?? null);
  const { teams: myTeams } = useMyTeams();
  const teamIds = useMemo(() => (myTeams || []).map((item) => item.id), [myTeams]);
  const { events, error: activityError } = useTeamActivity(teamIds);
  const teamNameOf = (teamId) => (myTeams || []).find((item) => item.id === teamId)?.name || "";

  // Entregas: vencidas o con vencimiento en los próximos 3 días.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskAlerts = tasks.flatMap((task) => {
    if (!task.dueDate || task.status === "done") return [];
    const [year, month, day] = task.dueDate.split("-").map(Number);
    const [hours = 23, minutes = 59] = (task.dueTime || "23:59").split(":").map(Number);
    const dueDate = new Date(year, month - 1, day, hours, minutes);
    const dueDay = new Date(year, month - 1, day);
    const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

    if (dueDate.getTime() < now.getTime()) {
      return [{ task, label: `Vencida hace ${Math.abs(daysUntilDue)} d`, icon: "event_busy", tone: "text-error" }];
    }
    if (daysUntilDue <= 3) {
      const deadline = task.dueTime ? `, ${task.dueTime}` : "";
      return [{
        task,
        label: daysUntilDue === 0 ? `Vence hoy${deadline}` : `Vence en ${daysUntilDue} d${deadline}`,
        icon: "event",
        tone: "text-warning",
      }];
    }
    return [];
  });

  // Actividad del equipo hecha por otras personas.
  const storedSeen = seenState.uid === uid ? seenState.value : readSeen(uid);
  const seenAt = storedSeen || now.getTime() - DAY_MS;
  const teamEvents = events.filter((event) => event.actorId !== uid).slice(0, MAX_TEAM_EVENTS);
  const unreadTeam = teamEvents.filter((event) => eventMillis(event) > seenAt).length;

  function markTeamSeen() {
    if (!uid) return;
    const latest = Math.max(0, ...events.map(eventMillis));
    const value = latest || Date.now();
    writeSeen(uid, value);
    setSeenState({ uid, value });
  }

  function close() {
    setOpen(false);
    if (unreadTeam > 0) markTeamSeen();
  }

  const count = pending.length + taskAlerts.length + unreadTeam;
  const isEmpty = pending.length === 0 && taskAlerts.length === 0 && teamEvents.length === 0;
  useDismissOnOutsideClick(open, close);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Bell count={count} open={open} onToggle={() => (open ? close() : setOpen(true))}>
        <span className="block px-space-xs pb-space-xs text-label-lg font-semibold text-on-surface">Novedades</span>

        {isEmpty ? (
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-md">
            <span className="material-symbols-outlined text-[24px] text-on-surface-variant">notifications_off</span>
            <p className="text-body-sm text-on-surface-variant">Sin novedades por ahora.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <BellSection title="Encuestas pendientes">
                {pending.map((survey) => (
                  <Link
                    key={survey.id}
                    to={`/encuesta/${survey.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">assignment</span>
                    <div className="min-w-0">
                      <p className="text-body-sm text-on-surface font-semibold">Encuesta pendiente</p>
                      <p className="text-body-sm text-on-surface-variant">{survey.title}</p>
                    </div>
                  </Link>
                ))}
              </BellSection>
            )}

            {taskAlerts.length > 0 && (
              <BellSection title="Entregas">
                {taskAlerts.map(({ task, label, icon, tone }) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${tone}`}>{icon}</span>
                    <div className="min-w-0">
                      <p className="text-body-sm text-on-surface font-semibold">{label}</p>
                      <p className="text-body-sm text-on-surface-variant">{task.title}</p>
                    </div>
                  </div>
                ))}
              </BellSection>
            )}

            {teamEvents.length > 0 && (
              <BellSection
                title="Tu equipo"
                action={
                  unreadTeam > 0 && (
                    <button
                      type="button"
                      onClick={markTeamSeen}
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      Marcar como leído
                    </button>
                  )
                }
              >
                {teamEvents.map((event) => {
                  const { icon, text } = describeTeamEvent(event);
                  const unread = eventMillis(event) > seenAt;
                  return (
                    <Link
                      key={`${event.teamId}-${event.id}`}
                      to={`/mis-proyectos/${event.teamId}`}
                      onClick={close}
                      className="flex items-start gap-space-sm rounded-lg p-space-sm transition-colors hover:bg-surface-container-low"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-body-sm text-on-surface ${unread ? "font-semibold" : ""}`}>{text}</p>
                        <p className="truncate text-label-sm text-on-surface-variant">
                          {event.taskTitle ? `«${event.taskTitle}», ` : ""}
                          {teamNameOf(event.teamId) ? `${teamNameOf(event.teamId)}, ` : ""}
                          {timeAgo(eventMillis(event))}
                        </p>
                      </div>
                      {unread && <span role="img" aria-label="Nuevo" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                  );
                })}
              </BellSection>
            )}
          </>
        )}

        {activityError && (
          <p role="alert" className="mt-space-xs rounded-xl bg-error-container px-space-sm py-2 text-label-sm text-on-error-container">
            {activityError}
          </p>
        )}
      </Bell>
    </div>
  );
}