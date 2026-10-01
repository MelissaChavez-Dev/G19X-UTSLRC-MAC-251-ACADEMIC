import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useMyTeam } from "../hooks/useTeams";
import { usePendingSurveys } from "../hooks/usePendingSurveys";
import { useMyPresence } from "../hooks/usePresence";
import { CYCLE_LABELS } from "../services/templateService";
import ThemeToggle from "../components/ThemeToggle";
import JoinTeamCard from "../components/JoinTeamCard";
import TeamKanban from "../components/TeamKanban";
import { EmployeeNotificationBell } from "../components/NotificationBell";

/**
 * Espacio personal del colaborador (/mi-espacio).
 * Las secciones de encuestas pendientes y actividad se conectan en las Fases D y E.
 */
export default function MiEspacio() {
  const { profile, user } = useAuth();
  const { team, loading: teamLoading } = useMyTeam();
  const { pending, streak, loading: surveysLoading } = usePendingSurveys();
  const { summary: presence, loading: presenceLoading } = useMyPresence();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const firstName = (profile?.displayName || user?.displayName || "colaborador").split(" ")[0];

  return (
    <div className="min-h-screen bg-surface app-canvas">
      <header className="h-16 px-space-xl flex items-center justify-between bg-surface/80 backdrop-blur-xl sticky top-0 z-40 border-b border-outline-variant/40">
        <div className="flex items-center gap-space-sm">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold">
            P
          </div>
          <span className="text-headline-sm text-on-surface">Bienestar organizacional</span>
        </div>
        <div className="flex items-center gap-space-sm">
          <EmployeeNotificationBell />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="motion-press flex items-center gap-space-xs px-space-md py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-body-md">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-space-xl py-space-lg flex flex-col gap-space-lg relative z-10">
        <div className="animate-enter">
          <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
            Mi espacio
          </span>
          <h1 className="text-headline-xl text-on-surface tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Este es tu espacio personal: tus encuestas, tu equipo y tu actividad.
          </p>
          {streak > 0 && (
            <span className="animate-pop inline-flex items-center gap-space-xs mt-space-sm px-space-md py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-label-md">
              <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
              {streak} {streak === 1 ? "semana" : "semanas"} seguidas participando
            </span>
          )}
        </div>

        {/* Encuestas pendientes */}
        <section className="animate-enter" style={{ animationDelay: "40ms" }}>
          <h2 className="text-headline-sm text-on-surface mb-space-sm">Encuestas pendientes</h2>
          {surveysLoading ? (
            <div className="h-20 rounded-xl animate-shimmer" />
          ) : pending.length === 0 ? (
            <div className="motion-card bg-surface-container-lowest p-space-lg flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[28px]">task_alt</span>
              <p className="text-body-md text-on-surface-variant">
                Estás al día. Cuando haya una encuesta nueva para tu área, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {pending.map((survey, index) => (
                <div
                  key={survey.id}
                  className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-xs animate-enter"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
                    {CYCLE_LABELS[survey.cycle] || "Encuesta"}
                  </span>
                  <h3 className="text-headline-sm text-on-surface">{survey.title}</h3>
                  <p className="text-body-sm text-on-surface-variant">
                    {(survey.questions || []).length} preguntas · confidencial
                  </p>
                  <div className="flex justify-end mt-space-xs">
                    <Link
                      to={`/encuesta/${survey.id}`}
                      className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2 text-label-md"
                    >
                      Responder
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mi equipo */}
        <section className="animate-enter" style={{ animationDelay: "80ms" }}>
          {teamLoading ? (
            <p className="text-body-md text-on-surface-variant">Cargando tu equipo...</p>
          ) : team ? (
            <div className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[28px]">groups</span>
                <h2 className="text-headline-sm text-on-surface">{team.name}</h2>
              </div>
              <div className="flex flex-wrap gap-space-xs">
                {Object.values(team.memberNames || {}).map((memberName) => (
                  <span
                    key={memberName}
                    className="text-label-md px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant"
                  >
                    {memberName}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <JoinTeamCard />
          )}
        </section>

        {/* Kanban del equipo */}
        {team && (
          <section className="animate-enter" style={{ animationDelay: "160ms" }}>
            <h2 className="text-headline-sm text-on-surface mb-space-sm">Kanban de mi equipo</h2>
            <TeamKanban teamId={team.id} team={team} />
          </section>
        )}

        {/* Mi actividad — transparencia sobre la presencia digital */}
        <section className="animate-enter" style={{ animationDelay: "240ms" }}>
          <h2 className="text-headline-sm text-on-surface mb-space-sm">Mi actividad</h2>
          <div className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[28px]">pace</span>
              <p className="text-body-sm text-on-surface-variant flex-1">
                El sistema registra tus <strong>movimientos dentro de esta app</strong> (inicios de
                sesión, encuestas respondidas, uso del kanban) para calcular un indicador de
                presencia digital. No es un control de asistencia ni mide tu trabajo fuera de la
                plataforma. Aquí puedes ver exactamente lo que el sistema registra sobre ti.
              </p>
            </div>
            {presenceLoading ? (
              <div className="h-12 rounded-xl animate-shimmer" />
            ) : presence && presence.workDays > 0 ? (
              <div className="grid grid-cols-3 gap-space-sm">
                <div className="rounded-lg bg-surface-container-low p-space-sm text-center">
                  <span className="text-metric-val text-on-surface">{presence.presentDays}</span>
                  <span className="text-label-sm text-on-surface-variant block">días con actividad</span>
                </div>
                <div className="rounded-lg bg-surface-container-low p-space-sm text-center">
                  <span className="text-metric-val text-on-surface">{presence.absentDays}</span>
                  <span className="text-label-sm text-on-surface-variant block">días sin actividad</span>
                </div>
                <div className="rounded-lg bg-surface-container-low p-space-sm text-center">
                  <span className="text-metric-val text-on-surface">{presence.workDays}</span>
                  <span className="text-label-sm text-on-surface-variant block">días laborales (30d)</span>
                </div>
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Aún no hay registros de presencia. Se calculan automáticamente al final de cada día laboral.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
