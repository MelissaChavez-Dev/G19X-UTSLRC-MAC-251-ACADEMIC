import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useTurnoverMetrics } from "../hooks/useTurnoverMetrics";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyTeam } from "../hooks/useTeams";
import { useTeamTasks } from "../hooks/useTeamTasks";
import { useAuth } from "../hooks/useAuth";
import { getKpiLevelForSample, MIN_SAMPLE } from "../data/kpiThresholds";

function Bell({ count, open, onToggle, children, label = "Notificaciones" }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${label} (${count})`}
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
        <div className="animate-pop absolute right-0 top-11 w-80 max-h-96 overflow-y-auto rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant/40 p-space-sm z-50">
          {children}
        </div>
      )}
    </div>
  );
}

function useDismissOnOutsideClick(open, onClose) {
  useEffect(() => {
    if (!open) return;
    function handleClick() {
      onClose();
    }
    // Escucha en captura para no interferir con los enlaces
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
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
export function AdminNotificationBell({ responseSourceMode = "all", alerts: dashboardAlerts }) {
  const [open, setOpen] = useState(false);
  const [readAlertState, setReadAlertState] = useState({ uid: null, alerts: {} });
  const [readError, setReadError] = useState("");
  const { user } = useAuth();
  const { rows } = useDepartmentRisk(null, responseSourceMode);
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

/** Campana del colaborador: encuestas nuevas y actividad reciente en su kanban. */
export function EmployeeNotificationBell() {
  const [open, setOpen] = useState(false);
  const { pending } = usePendingSurveys();
  const { team } = useMyTeam();
  const { tasks } = useTeamTasks(team?.id ?? null);
  useDismissOnOutsideClick(open, () => setOpen(false));

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const taskAlerts = tasks.flatMap((task) => {
    if (task.dueDate && task.status !== "done") {
      const [year, month, day] = task.dueDate.split("-").map(Number);
      const [hours = 23, minutes = 59] = (task.dueTime || "23:59").split(":").map(Number);
      const dueDate = new Date(year, month - 1, day, hours, minutes);
      const dueDay = new Date(year, month - 1, day);
      const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

      if (dueDate.getTime() < now.getTime()) {
        return [{ task, label: `Vencida hace ${Math.abs(daysUntilDue)} d`, icon: "event_busy", tone: "text-error" }];
      }
      if (daysUntilDue <= 3) {
        const deadline = task.dueTime ? ` · ${task.dueTime}` : "";
        return [{ task, label: daysUntilDue === 0 ? `Vence hoy${deadline}` : `Vence en ${daysUntilDue} d${deadline}`, icon: "event", tone: "text-warning" }];
      }
    }

    if ((task.createdAt?.toMillis?.() || 0) > dayAgo) {
      return [{ task, label: "Tarea nueva en tu equipo", icon: "view_kanban", tone: "text-tertiary" }];
    }
    return [];
  });

  const count = pending.length + taskAlerts.length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Bell count={count} open={open} onToggle={() => setOpen((v) => !v)}>
        <span className="text-label-md uppercase tracking-widest text-on-surface-variant font-semibold block px-space-xs pb-space-xs">
          Novedades
        </span>
        {count === 0 ? (
          <EmptyState text="Sin novedades por ahora." />
        ) : (
          <>
            {pending.map((survey) => (
              <Link
                key={survey.id}
                to={`/encuesta/${survey.id}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">assignment</span>
                <div>
                  <p className="text-body-sm text-on-surface font-semibold">Encuesta pendiente</p>
                  <p className="text-body-sm text-on-surface-variant">{survey.title}</p>
                </div>
              </Link>
            ))}
            {taskAlerts.map(({ task, label, icon, tone }) => (
              <div
                key={task.id}
                className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className={`material-symbols-outlined text-[20px] ${tone}`}>{icon}</span>
                <div>
                  <p className="text-body-sm text-on-surface font-semibold">{label}</p>
                  <p className="text-body-sm text-on-surface-variant">{task.title}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </Bell>
    </div>
  );
}
