import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useMyTeam } from "../hooks/useTeams";
import { useDepartmentRisk } from "../hooks/useDepartmentRisk";
import { useAuth } from "../hooks/useAuth";
import TeamKanban from "../components/TeamKanban";
import JoinTeamCard from "../components/JoinTeamCard";
import ThemeToggle from "../components/ThemeToggle";
import { EmployeeNotificationBell } from "../components/NotificationBell";
import { DEPARTMENTS } from "../data/surveyQuestion";

/**
 * Vista del líder de equipo (rol team_lead): kanban y métricas agregadas
 * SOLO de su propio departamento/equipo — sin acceso al dashboard ejecutivo.
 */
export default function MiEquipo() {
  const { profile } = useAuth();
  const { team, loading: teamLoading } = useMyTeam();
  const { rows: deptRows } = useDepartmentRisk();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const deptName = DEPARTMENTS.find((d) => d.id === profile?.departmentId)?.name;
  const myDeptRisk = deptRows?.find((row) => row.id === profile?.departmentId);

  return (
    <div className="min-h-screen bg-surface app-canvas">
      <header className="h-16 px-space-xl flex items-center justify-between bg-surface/80 backdrop-blur-xl sticky top-0 z-40 border-b border-outline-variant/40">
        <div className="flex items-center gap-space-sm">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold">P</div>
          <span className="text-headline-sm text-on-surface">PluriOne Health</span>
          <span className="text-label-md px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
            Líder de equipo
          </span>
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

      <main className="max-w-6xl mx-auto px-space-xl py-space-lg flex flex-col gap-space-lg relative z-10">
        <div className="animate-enter">
          <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
            {deptName || "Mi equipo"}
          </span>
          <h1 className="text-headline-xl text-on-surface tracking-tight">
            {teamLoading ? "Cargando..." : team ? team.name : "Salud de mi equipo"}
          </h1>
        </div>

        {/* Resumen agregado de su departamento (sin datos individuales) */}
        {myDeptRisk && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md animate-enter" style={{ animationDelay: "80ms" }}>
            {[
              { label: "Fatiga", value: myDeptRisk.factors?.shiftFatigue },
              { label: "Carga emocional", value: myDeptRisk.factors?.emotionalLabor },
              { label: "Seguridad psicológica", value: myDeptRisk.factors?.psychSafety },
              { label: "Balance vida-trabajo", value: myDeptRisk.workLifeBalance },
            ].map((metric) => (
              <div key={metric.label} className="motion-card bg-surface-container-lowest p-space-md text-center">
                <span className="text-metric-val text-on-surface">{metric.value ?? "—"}</span>
                <span className="text-label-sm text-on-surface-variant block mt-1">{metric.label}</span>
              </div>
            ))}
          </div>
        )}

        {teamLoading ? null : team ? (
          <section className="animate-enter" style={{ animationDelay: "160ms" }}>
            <h2 className="text-headline-sm text-on-surface mb-space-sm">Kanban del equipo</h2>
            <TeamKanban teamId={team.id} team={team} />
          </section>
        ) : (
          <JoinTeamCard />
        )}

        <p className="text-body-sm text-on-surface-variant">
          ¿Buscas tu espacio personal? <Link to="/mi-espacio" className="text-primary hover:underline">Ir a mi espacio</Link>
        </p>
      </main>
    </div>
  );
}
