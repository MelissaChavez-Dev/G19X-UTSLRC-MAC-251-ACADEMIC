import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useMyTeams } from "../hooks/useTeams";
import { useTeamTasks } from "../hooks/useTeamTasks";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyPresence } from "../hooks/usePresence";
import { useProfiles } from "../hooks/useProfiles";
import { CYCLE_LABELS } from "../services/templateService";
import { projectTheme, initials } from "../data/projectTheme";
import Avatar from "../components/Avatar";
import JoinTeamCard from "../components/JoinTeamCard";
import EmployeeShell from "../components/EmployeeShell";
import EmployeeLeavePanel from "../components/EmployeeLeavePanel";
import EmployeeProfilePanel from "../components/EmployeeProfilePanel";
import { Card, EmptyState, Icon, Notice, SectionHeader, SideNav, StatTile, TabPanel, Tabs } from "../components/EmployeeUi";

const TABS = [
  { id: "resumen", label: "Resumen", icon: "space_dashboard" },
  { id: "perfil", label: "Mi perfil", icon: "person" },
  { id: "permisos", label: "Permisos y vacaciones", icon: "event_available" },
];

// Etiqueta corta de entrega: vencida, hoy o fecha.
function dueBadge(task) {
  const today = new Date().toLocaleDateString("en-CA");
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  if (task.dueDate < today) return { label: "Vencida", classes: "bg-error-container text-on-error-container" };
  if (task.dueDate === today) return { label: "Hoy", classes: "bg-warning-container text-on-warning-container" };
  return { label: dateLabel, classes: "bg-surface-container text-on-surface-variant" };
}

function activityDescription(event) {
  if (event.type === "survey_submit") {
    return `Respondiste la encuesta «${event.surveyTitle || "Encuesta"}»`;
  }
  if (event.type === "login") return "Iniciaste sesión";
  if (event.type === "navigation") return "Navegaste en la plataforma";

  const task = event.taskTitle ? `«${event.taskTitle}»` : "una tarea";
  const project = event.projectName ? ` en ${event.projectName}` : "";
  if (event.action === "task_moved") {
    return `Moviste ${task} de ${event.fromStatus || "otra lista"} a ${event.toStatus || "otra lista"}${project}`;
  }
  if (event.action === "task_created") return `Creaste ${task}${project}`;
  if (event.action === "task_deleted") return `Eliminaste ${task}${project}`;
  if (event.action === "task_updated") return `Editaste ${task}${project}`;
  if (event.action === "task_comment_added") return `Comentaste en ${task}${project}`;
  if (event.type === "kanban_action") return `Hiciste una acción en el tablero${project}`;
  return "Actividad registrada en la plataforma";
}

function activityIcon(event) {
  if (event.type === "survey_submit") return "quiz";
  if (event.type === "kanban_action") return "view_kanban";
  if (event.type === "login") return "login";
  return "near_me";
}

function formatActivityTime(timestamp) {
  const date = timestamp?.toDate?.();
  return date
    ? date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Hermosillo" })
    : "Ahora";
}

function ProjectCard({ project }) {
  const { tasks, loading } = useTeamTasks(project.id);
  const members = Object.values(project.memberNames || {});
  const open = tasks.filter((task) => (task.status || "todo") !== "done");
  const doneCount = tasks.length - open.length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const upcoming = open
    .filter((task) => task.dueDate)
    .sort((a, b) => `${a.dueDate} ${a.dueTime || "23:59"}`.localeCompare(`${b.dueDate} ${b.dueTime || "23:59"}`))
    .slice(0, 2);

  return (
    <Link
      to={`/mis-proyectos/${project.id}`}
      aria-label={`Abrir el tablero del proyecto ${project.name}`}
      className="motion-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className={`flex items-center gap-space-sm p-space-md ${projectTheme(project.id)}`}>
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest/70 text-headline-sm font-semibold text-on-surface"
        >
          {initials(project.name).slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-headline-sm font-semibold group-hover:underline">{project.name}</h3>
          <p className="text-body-sm opacity-80">
            {members.length} {members.length === 1 ? "integrante" : "integrantes"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-space-sm p-space-md">
        <p className="line-clamp-2 min-h-10 text-body-sm text-on-surface-variant">
          {project.description || "Sin descripción"}
        </p>

        <div className="min-h-14">
          <p className="mb-1 text-label-md font-semibold text-on-surface">Próximas entregas</p>
          {loading ? (
            <div className="h-10 rounded-lg animate-shimmer" />
          ) : upcoming.length ? (
            <ul className="flex flex-col gap-1.5">
              {upcoming.map((task) => {
                const badge = dueBadge(task);
                return (
                  <li key={task.id} className="flex items-center gap-space-xs text-body-sm">
                    <Icon name="assignment" size={16} className="shrink-0 text-on-surface-variant" />
                    <span className="min-w-0 flex-1 truncate text-on-surface" title={task.title}>{task.title}</span>
                    <span className={`shrink-0 rounded-full px-space-xs py-0.5 text-label-sm font-semibold ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              {open.length ? `${open.length} tareas abiertas, sin fecha de entrega.` : "Sin entregas pendientes."}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-space-sm border-t border-outline-variant/60 px-space-md py-space-sm">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"
          role="progressbar"
          aria-label="Tareas completadas"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="shrink-0 text-label-sm text-on-surface-variant">
          {loading ? "…" : `${doneCount}/${tasks.length} hechas`}
        </span>
        <Icon
          name="arrow_outward"
          size={18}
          className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Link>
  );
}

function ProjectsSection({ teams, loading, error, onJoined }) {
  return (
    <section className="flex min-w-0 flex-col gap-space-md">
      <SectionHeader
        title="Mis proyectos"
        description="Elige un proyecto para abrir su tablero completo."
        action={
          <Link
            to="/mis-proyectos"
            className="motion-press inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-2 text-label-md font-semibold text-primary hover:bg-surface-container"
          >
            Ver todos
            <Icon name="arrow_forward" size={17} />
          </Link>
        }
      />

      {error && <Notice tone="error">No se pudieron sincronizar todos tus proyectos: {error}</Notice>}

      {loading ? (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1].map((item) => <div key={item} className="h-72 rounded-2xl animate-shimmer" />)}
        </div>
      ) : teams.length ? (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 2xl:grid-cols-3">
          {teams.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      ) : (
        <EmptyState
          icon="view_kanban"
          title={error ? "Tus proyectos no están disponibles ahora" : "Aún no perteneces a un proyecto"}
          text={error ? "Vuelve a intentarlo en unos minutos." : "Únete con el código que te compartieron."}
        />
      )}

      <JoinTeamCard onJoined={onJoined} />
    </section>
  );
}

function PendingSurveysCard({ pending, loading }) {
  return (
    <Card className="p-space-md">
      <div className="mb-space-sm flex items-center justify-between">
        <h2 className="text-headline-sm text-on-surface">Pendientes</h2>
        {!loading && pending.length > 0 && (
          <span className="rounded-full bg-primary px-space-sm text-label-sm font-semibold text-on-primary">{pending.length}</span>
        )}
      </div>
      {loading ? (
        <div className="h-20 rounded-xl animate-shimmer" />
      ) : pending.length === 0 ? (
        <div className="flex items-start gap-space-sm py-space-xs">
          <Icon name="task_alt" size={26} className="shrink-0 text-secondary" />
          <p className="text-body-sm text-on-surface-variant">
            Estás al día. Cuando haya una encuesta nueva para tu área, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-outline-variant/60">
          {pending.map((survey) => (
            <li key={survey.id}>
              <Link
                to={`/encuesta/${survey.id}`}
                className="group -mx-space-xs flex items-center gap-space-sm rounded-lg px-space-xs py-space-sm transition-colors hover:bg-surface-container-low"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
                  <Icon name="quiz" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md font-medium text-on-surface">{survey.title}</span>
                  <span className="block truncate text-body-sm text-on-surface-variant">
                    {CYCLE_LABELS[survey.cycle] || "Encuesta"}, {(survey.questions || []).length} preguntas
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-label-sm text-on-surface-variant">
                    <Icon name="lock" size={12} />
                    Respuesta confidencial
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-primary px-space-sm py-1 text-label-sm font-semibold text-on-primary group-hover:opacity-90">
                  Responder
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ActivityCard({ presence, events, todayActivityCount, activityError, summaryError, loading }) {
  const metrics = presence && presence.workDays > 0
    ? [
        [presence.presentDays, "Con actividad"],
        [presence.justifiedDays, "Justificadas"],
        [presence.absentDays, "Injustificadas"],
        [presence.workDays, "Laborales (30 d)"],
      ]
    : [];

  return (
    <Card className="p-space-md">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm">
        <h2 className="text-headline-sm text-on-surface">Mi actividad</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-container px-space-sm py-1 text-label-sm font-semibold text-on-success-container">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          En vivo
        </span>
      </div>

      {loading ? (
        <div className="h-16 rounded-xl animate-shimmer" />
      ) : (
        <>
          <div className="flex items-center gap-space-sm rounded-xl bg-primary-container px-space-md py-space-sm text-on-primary-container">
            <Icon name="bolt" size={22} className="shrink-0" />
            <p className="text-label-md font-semibold">
              {todayActivityCount ? `${todayActivityCount} movimientos en horario hoy` : "Sin movimientos en horario por ahora"}
            </p>
          </div>

          {metrics.length > 0 && (
            <dl className="mt-space-sm grid grid-cols-2 gap-space-xs">
              {metrics.map(([value, label]) => (
                <div key={label} className="rounded-xl bg-surface-container-low p-space-sm text-center">
                  <dd className="text-metric-val text-on-surface">{value}</dd>
                  <dt className="text-label-sm text-on-surface-variant">{label}</dt>
                </div>
              ))}
            </dl>
          )}

          {activityError && <div className="mt-space-sm"><Notice tone="error">No se pudo cargar el historial: {activityError}</Notice></div>}
          {summaryError && <div className="mt-space-sm"><Notice tone="error">{summaryError}</Notice></div>}

          {events.length ? (
            <div className="mt-space-md border-t border-outline-variant/60 pt-space-sm">
              <h3 className="mb-space-xs text-label-lg font-semibold text-on-surface">Movimientos recientes</h3>
              <ol className="flex flex-col divide-y divide-outline-variant/50">
                {events.slice(0, 6).map((event) => (
                  <li key={event.id} className="flex items-start gap-space-sm py-space-xs">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary">
                      <Icon name={activityIcon(event)} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-on-surface">{activityDescription(event)}</p>
                      <time className="text-label-sm text-on-surface-variant">{formatActivityTime(event.timestamp)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="mt-space-sm text-body-sm text-on-surface-variant">
              Aquí aparecerán tus encuestas respondidas y movimientos del Kanban.
            </p>
          )}
        </>
      )}

      <details className="mt-space-sm text-label-sm text-on-surface-variant">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-space-xs font-semibold text-primary">
          <Icon name="info" size={16} />
          Cómo se calcula
        </summary>
        <p className="mt-space-xs">
          El historial se actualiza en tiempo real. El resumen de jornadas sin actividad se confirma al cierre del día laboral.
          No es un control de asistencia ni mide tu trabajo fuera de la plataforma; aquí no se guardan tus respuestas ni el
          texto de tus comentarios.
        </p>
      </details>
    </Card>
  );
}

const PAGE_COPY = {
  perfil: { title: "Mi perfil", description: "Tu foto y tus datos de contacto." },
  permisos: { title: "Permisos y vacaciones", description: "Solicita días y consulta la respuesta de RH." },
};

/**
 * Espacio personal del colaborador (/mi-espacio).
 * En escritorio la navegación vive en el menú lateral; en pantallas chicas, en pestañas.
 * La sección activa va en la URL (?tab=perfil, ?tab=permisos) para poder enlazarla.
 */
export default function MiEspacio() {
  const { profile, user } = useAuth();
  const { profiles } = useProfiles(user?.uid ? [user.uid] : []);
  const { teams: myTeams, loading: projectsLoading, error: projectsError } = useMyTeams();
  const { pending, streak, loading: surveysLoading } = usePendingSurveys();
  const {
    summary: presence,
    events: presenceEvents,
    todayActivityCount,
    activityError,
    summaryError,
    loading: presenceLoading,
  } = useMyPresence();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const requestedTab = params.get("tab");
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab : "resumen";
  function selectTab(id) {
    setParams(id === "resumen" ? {} : { tab: id }, { replace: true });
  }

  const fullName = profile?.displayName || user?.displayName || "colaborador";
  const firstName = fullName.split(" ")[0];
  const todayLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Hermosillo",
  });

  const nav = ({ collapsed }) => (
    <>
      <div className={`flex items-center gap-space-sm px-space-xs pb-space-md ${collapsed ? "justify-center" : ""}`}>
        <Avatar
          name={fullName}
          photoURL={profiles[user?.uid]?.photoURL}
          size={44}
          className="shrink-0 text-label-lg"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-on-surface">{fullName}</p>
            {user?.email && <p className="truncate text-label-sm text-on-surface-variant">{user.email}</p>}
          </div>
        )}
      </div>
      <SideNav
        label="Navegación de mi espacio"
        items={TABS}
        value={tab}
        onChange={selectTab}
        collapsed={collapsed}
        links={[{ to: "/mis-proyectos", label: "Mis proyectos", icon: "view_kanban" }]}
      />
    </>
  );

  return (
    <EmployeeShell nav={nav}>
      <div className="flex flex-wrap items-end justify-between gap-space-sm">
        <div className="min-w-0">
          <p className="text-label-md text-on-surface-variant first-letter:uppercase">
            {tab === "resumen" ? todayLabel : "Mi espacio"}
          </p>
          <h1 className="text-headline-xl tracking-tight text-on-surface">
            {tab === "resumen" ? `Hola, ${firstName}` : PAGE_COPY[tab].title}
          </h1>
          {tab !== "resumen" && (
            <p className="mt-1 text-body-md text-on-surface-variant">{PAGE_COPY[tab].description}</p>
          )}
        </div>
        {tab === "resumen" && streak > 0 && (
          <span className="inline-flex w-fit items-center gap-space-xs rounded-full bg-tertiary-fixed px-space-md py-1.5 text-label-md text-on-tertiary-fixed-variant">
            <Icon name="local_fire_department" size={16} />
            {streak} {streak === 1 ? "semana" : "semanas"} seguidas participando
          </span>
        )}
      </div>

      <div className="lg:hidden">
        <Tabs tabs={TABS} value={tab} onChange={selectTab} label="Secciones de mi espacio" />
      </div>

      {tab === "resumen" && (
        <TabPanel id="resumen">
          <div className="grid grid-cols-2 gap-space-sm xl:grid-cols-4">
            <StatTile icon="view_kanban" label="Proyectos" value={projectsLoading ? "…" : myTeams.length} />
            <StatTile
              icon="quiz"
              label="Encuestas pendientes"
              value={surveysLoading ? "…" : pending.length}
              highlight={!surveysLoading && pending.length > 0}
            />
            <StatTile icon="bolt" label="Movimientos hoy" value={presenceLoading ? "…" : todayActivityCount || 0} />
            <StatTile icon="local_fire_department" label="Semanas de racha" value={surveysLoading ? "…" : streak || 0} />
          </div>

          <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-[minmax(0,1fr)_380px]">
            <ProjectsSection
              teams={myTeams}
              loading={projectsLoading}
              error={projectsError}
              onJoined={(result) => navigate(`/mis-proyectos/${result.teamId}`)}
            />
            <aside className="flex min-w-0 flex-col gap-space-md xl:sticky xl:top-20">
              <PendingSurveysCard pending={pending} loading={surveysLoading} />
              <ActivityCard
                presence={presence}
                events={presenceEvents}
                todayActivityCount={todayActivityCount}
                activityError={activityError}
                summaryError={summaryError}
                loading={presenceLoading}
              />
            </aside>
          </div>
        </TabPanel>
      )}

      {tab === "perfil" && (
        <TabPanel id="perfil">
          <EmployeeProfilePanel />
        </TabPanel>
      )}

      {tab === "permisos" && (
        <TabPanel id="permisos">
          <EmployeeLeavePanel />
        </TabPanel>
      )}
    </EmployeeShell>
  );
}