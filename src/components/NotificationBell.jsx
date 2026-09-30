import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyTeam } from "../hooks/useTeams";
import { useTeamTasks } from "../hooks/useTeamTasks";

function Bell({ count, open, onToggle, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Notificaciones (${count} sin leer)`}
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

/** Campana del admin: departamentos que entran en nivel de riesgo alto. */
export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const { rows } = useDepartmentRisk();
  useDismissOnOutsideClick(open, () => setOpen(false));

  const alerts = (rows || []).filter(
    (row) => row.tier?.tone === "critical" || row.tier?.tone === "elevated"
  );

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Bell count={alerts.length} open={open} onToggle={() => setOpen((v) => !v)}>
        <span className="text-label-md uppercase tracking-widest text-on-surface-variant font-semibold block px-space-xs pb-space-xs">
          Alertas de riesgo
        </span>
        {alerts.length === 0 ? (
          <EmptyState text="Ningún departamento en riesgo alto por ahora." />
        ) : (
          alerts.map((row) => (
            <div
              key={row.id}
              className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  row.tier.tone === "critical" ? "text-error" : "text-warning"
                }`}
              >
                {row.tier.tone === "critical" ? "emergency_home" : "warning"}
              </span>
              <div>
                <p className="text-body-sm text-on-surface font-semibold">
                  {row.name} está en nivel {row.tier.label.toLowerCase()}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Riesgo de rotación estimado: {row.attritionRisk}%
                </p>
              </div>
            </div>
          ))
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

  const [dayAgo] = useState(() => Date.now() - 24 * 60 * 60 * 1000);
  const recentTasks = tasks.filter(
    (t) => (t.createdAt?.toMillis?.() || 0) > dayAgo
  );

  const count = pending.length + recentTasks.length;

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
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-tertiary">view_kanban</span>
                <div>
                  <p className="text-body-sm text-on-surface font-semibold">Tarea nueva en tu equipo</p>
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
