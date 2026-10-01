import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useMyTeams } from "../hooks/useTeams";
import { useTeamTasks } from "../hooks/useTeamTasks";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyPresence } from "../hooks/usePresence";
import { CYCLE_LABELS } from "../services/templateService";
import { projectTheme, initials } from "../data/projectTheme";
import ThemeToggle from "../components/ThemeToggle";
import JoinTeamCard from "../components/JoinTeamCard";
import { EmployeeNotificationBell } from "../components/NotificationBell";

function Icon({ name, size = 18, className = "" }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

// Etiqueta corta de entrega: vencida, hoy o fecha.
function dueBadge(task) {
  const today = new Date().toLocaleDateString("en-CA");
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  if (task.dueDate < today) return { label: "Vencida", classes: "text-error" };
  if (task.dueDate === today) return { label: "Hoy", classes: "text-on-warning-container" };
  return { label: dateLabel, classes: "text-on-surface-variant" };
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

function formatActivityTime(timestamp) {
  const date = timestamp?.toDate?.();
  return date
    ? date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Hermosillo" })
    : "Ahora";
}

function ProjectCard({ project, index }) {
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
      className="motion-card group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary animate-enter"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Banner */}
      <div className={`relative h-28 overflow-hidden p-space-md ${projectTheme(project.id)}`}>
        <Icon name="dashboard" size={96} className="absolute -bottom-4 right-2 opacity-15" />
        <h3 className="relative line-clamp-2 pr-16 text-headline-sm font-semibold group-hover:underline">{project.name}</h3>
        <p className="relative mt-0.5 text-body-sm opacity-80">
          {members.length} {members.length === 1 ? "integrante" : "integrantes"}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="relative z-10 -mt-7 mr-space-md flex h-14 w-14 shrink-0 items-center justify-center self-end rounded-full bg-surface-container-lowest text-headline-sm font-semibold text-on-surface ring-4 ring-surface-container-lowest"
      >
        {initials(project.name).slice(0, 1)}
      </span>

      {/* Contenido */}
      <div className="-mt-6 flex flex-1 flex-col gap-space-sm px-space-md pb-space-sm">
        <p className="line-clamp-2 min-h-10 pr-16 text-body-sm text-on-surface-variant">
          {project.description || "Sin descripción"}
        </p>

        <div className="min-h-14">
          <p className="mb-1 text-label-sm font-semibold text-on-surface-variant">Próximas entregas</p>
          {loading ? (
            <div className="h-10 rounded-lg animate-shimmer" />
          ) : upcoming.length ? (
            <ul className="flex flex-col gap-1">
              {upcoming.map((task) => {
                const badge = dueBadge(task);
                return (
                  <li key={task.id} className="flex items-center gap-space-xs text-body-sm">
                    <Icon name="assignment" size={16} className="shrink-0 text-on-surface-variant" />
                    <span className="min-w-0 flex-1 truncate text-on-surface" title={task.title}>{task.title}</span>
                    <span className={`shrink-0 text-label-sm font-semibold ${badge.classes}`}>{badge.label}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-sm text-on-surface-variant/80">
              {open.length ? `${open.length} tareas abiertas, sin fecha de entrega.` : "Sin entregas pendientes."}
            </p>
          )}
        </div>
      </div>

      {/* Pie */}
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
        <Icon name="arrow_outward" size={18} className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

/**
 * Espacio personal del colaborador (/mi-espacio).
 */
export default function MiEspacio() {
  const { profile, user } = useAuth();
  const { teams: myTeams, loading: projectsLoading, error: projectsError } = useMyTeams();
  const { pending, streak, loading: surveysLoading } = usePendingSurveys();
  const {
    summary: presence,
    events: presenceEvents,
    todayActivityCount,
    activityError,
    loading: presenceLoading,
  } = useMyPresence();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const firstName = (profile?.displayName || user?.displayName || "colaborador").split(" ")[0];

  return (
    <div className="min-h-screen bg-surface app-canvas">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/40 bg-surface/80 px-space-xl backdrop-blur-xl">
        <div className="flex items-center gap-space-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-bold text-on-primary">P</div>
          <span className="text-headline-sm text-on-surface">Bienestar organizacional</span>
        </div>
        <div className="flex items-center gap-space-sm">
          <details className="relative">
            <summary className="motion-press flex cursor-pointer list-none items-center gap-space-xs rounded-full bg-primary-container px-space-md py-2 text-label-md font-semibold text-on-primary-container hover:brightness-95">
              <Icon name="view_kanban" />
              <span>Mis proyectos</span>
              <span className="rounded-full bg-surface-container-lowest/70 px-1.5 text-label-sm">{projectsLoading ? "…" : myTeams.length}</span>
            </summary>
            <nav aria-label="Mis proyectos" className="absolute right-0 top-full z-50 mt-2 flex max-h-80 w-72 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xs shadow-xl">
              {projectsLoading ? (
                <p className="px-space-sm py-space-md text-body-sm text-on-surface-variant">Cargando proyectos...</p>
              ) : myTeams.length ? myTeams.map((project) => (
                <Link
                  key={project.id}
                  to={`/mis-proyectos/${project.id}`}
                  className="flex items-center gap-space-sm rounded-lg px-space-sm py-2.5 text-body-sm text-on-surface hover:bg-primary-container hover:text-on-primary-container"
                >
                  <Icon name="dashboard" />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                </Link>
              )) : (
                <Link to="/mis-proyectos" className="rounded-lg px-space-sm py-2.5 text-body-sm text-on-surface-variant hover:bg-surface-container-low">
                  Aún no perteneces a un proyecto
                </Link>
              )}
              <Link to="/mis-proyectos" className="mt-space-xs border-t border-outline-variant px-space-sm py-2.5 text-label-md font-semibold text-primary">
                Abrir Mis proyectos
              </Link>
            </nav>
          </details>
          <EmployeeNotificationBell />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="motion-press flex items-center gap-space-xs rounded-full px-space-md py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="logout" size={20} />
            <span className="text-body-md">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-space-lg px-space-xl py-space-lg">
        {/* Saludo */}
        <div className="relative animate-enter overflow-hidden rounded-2xl bg-primary-container p-space-lg text-on-primary-container">
          <Icon name="waving_hand" size={120} className="absolute -right-2 -top-3 opacity-10" />
          <p className="relative text-label-md font-semibold opacity-80">Mi espacio</p>
          <h1 className="relative text-headline-xl tracking-tight">Hola, {firstName}</h1>
          <p className="relative mt-1 max-w-prose text-body-md opacity-90">
            Tus proyectos, tus encuestas y tu actividad en un solo lugar.
          </p>
          {streak > 0 && (
            <span className="animate-pop relative mt-space-sm inline-flex items-center gap-space-xs rounded-full bg-tertiary-fixed px-space-md py-1.5 text-label-md text-on-tertiary-fixed-variant">
              <Icon name="local_fire_department" size={16} />
              {streak} {streak === 1 ? "semana" : "semanas"} seguidas participando
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-[1fr_320px]">
          {/* Proyectos */}
          <section className="flex min-w-0 animate-enter flex-col gap-space-md" style={{ animationDelay: "80ms" }}>
            <div className="flex flex-wrap items-end justify-between gap-space-sm">
              <div>
                <h2 className="text-headline-sm text-on-surface">Mis proyectos</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Elige un proyecto para abrir su tablero completo.</p>
              </div>
              <Link to="/mis-proyectos" className="motion-press inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-2 text-label-md font-semibold text-primary hover:bg-surface-container">
                Ver todos
                <Icon name="arrow_forward" size={17} />
              </Link>
            </div>

            {projectsError && (
              <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
                No se pudieron sincronizar todos tus proyectos: {projectsError}
              </p>
            )}

            {projectsLoading ? (
              <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                {[0, 1].map((item) => <div key={item} className="h-72 rounded-2xl animate-shimmer" />)}
              </div>
            ) : myTeams.length ? (
              <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                {myTeams.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
              </div>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-outline-variant px-space-md py-space-xl text-center text-body-sm text-on-surface-variant">
                {projectsError ? "Tus proyectos no están disponibles ahora." : "Aún no perteneces a un proyecto. Únete con el código que te compartieron."}
              </p>
            )}

            <JoinTeamCard onJoined={(result) => navigate(`/mis-proyectos/${result.teamId}`)} />
          </section>

          {/* Columna lateral */}
          <aside className="flex min-w-0 flex-col gap-space-md lg:sticky lg:top-20">
            <section className="animate-enter rounded-2xl bg-surface-container-lowest p-space-md" style={{ animationDelay: "40ms" }}>
              <div className="mb-space-sm flex items-center justify-between">
                <h2 className="text-headline-sm text-on-surface">Pendientes</h2>
                {!surveysLoading && pending.length > 0 && (
                  <span className="rounded-full bg-primary px-space-sm text-label-sm font-semibold text-on-primary">{pending.length}</span>
                )}
              </div>
              {surveysLoading ? (
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
                            {CYCLE_LABELS[survey.cycle] || "Encuesta"} · {(survey.questions || []).length} preguntas · confidencial
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
            </section>

            {/* Mi actividad — transparencia sobre la presencia digital */}
            <section className="animate-enter rounded-2xl bg-surface-container-lowest p-space-md" style={{ animationDelay: "120ms" }}>
              <div className="mb-space-sm flex items-center justify-between gap-space-sm">
                <h2 className="text-headline-sm text-on-surface">Mi actividad</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-container px-space-sm py-1 text-label-sm font-semibold text-on-success-container">
                  <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  En vivo
                </span>
              </div>
              {presenceLoading ? (
                <div className="h-16 rounded-xl animate-shimmer" />
              ) : (
                <>
                  <div className="mb-space-sm flex items-center gap-space-sm rounded-xl bg-primary-container px-space-md py-space-sm text-on-primary-container">
                    <Icon name="bolt" size={22} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-label-md font-semibold">
                        {todayActivityCount ? `${todayActivityCount} movimientos en horario hoy` : "Sin movimientos en horario por ahora"}
                      </p>
                      <p className="text-label-sm opacity-80">Este indicador se actualiza al momento.</p>
                    </div>
                  </div>
                  {presence && presence.workDays > 0 && (
                    <div className="grid grid-cols-3 gap-space-xs">
                      {[
                        [presence.presentDays, "con actividad"],
                        [presence.absentDays, "sin actividad"],
                        [presence.workDays, "laborales (30d)"],
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-lg bg-surface-container-low p-space-sm text-center">
                          <span className="text-metric-val text-on-surface">{value}</span>
                          <span className="block text-label-sm text-on-surface-variant">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activityError && <p role="alert" className="mt-space-sm text-body-sm text-error">No se pudo cargar el historial: {activityError}</p>}
                  {presenceEvents.length ? (
                    <div className="mt-space-md border-t border-outline-variant/60 pt-space-sm">
                      <h3 className="mb-space-xs text-label-md font-semibold text-on-surface">Movimientos recientes</h3>
                      <ol className="flex flex-col divide-y divide-outline-variant/50">
                        {presenceEvents.slice(0, 6).map((event) => (
                          <li key={event.id} className="flex items-start gap-space-xs py-space-xs">
                            <Icon
                              name={event.type === "survey_submit" ? "quiz" : event.type === "kanban_action" ? "view_kanban" : event.type === "login" ? "login" : "near_me"}
                              size={16}
                              className="mt-0.5 shrink-0 text-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-body-sm text-on-surface">{activityDescription(event)}</p>
                              <time className="text-label-sm text-on-surface-variant">{formatActivityTime(event.timestamp)}</time>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <p className="mt-space-sm text-body-sm text-on-surface-variant">Aquí aparecerán tus encuestas respondidas y movimientos del Kanban.</p>
                  )}
                </>
              )}
              <p className="mt-space-sm flex items-start gap-space-xs text-label-sm text-on-surface-variant">
                <Icon name="pace" size={16} className="mt-0.5 shrink-0" />
                <span>
                  El historial se actualiza en tiempo real. El resumen de jornadas sin actividad se confirma al cierre del día laboral. No es un control de asistencia ni mide tu trabajo fuera de la plataforma; aquí no se guardan tus respuestas ni el texto de tus comentarios.
                </span>
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}