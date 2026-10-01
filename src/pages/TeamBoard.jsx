import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import TeamKanban from "../components/TeamKanban";
import { useTeam } from "../hooks/useTeams";
import { useAuth } from "../hooks/useAuth";
import { useSidebarState } from "../hooks/useSidebarState";
import { useDepartments } from "../hooks/useDepartments";

function departmentName(id, departments) {
  return departments.find((department) => department.id === id)?.name || id || "—";
}

/** Tablero de un equipo: vista admin (/equipos/:teamId) y líder (/mi-equipo). */
export default function TeamBoard() {
  const { teamId } = useParams();
  const { isAdmin } = useAuth();
  const { team, loading } = useTeam(teamId);
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();

  const content = (
    <div className="flex flex-col gap-space-lg max-w-6xl">
      {loading ? (
        <p className="text-body-md text-on-surface-variant">Cargando equipo...</p>
      ) : !team ? (
        <p className="text-body-md text-on-surface-variant">Equipo no encontrado.</p>
      ) : (
        <>
          <div className="animate-enter">
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
              {departmentName(team.departmentId, departments)}
            </span>
            <h1 className="text-headline-xl text-on-surface tracking-tight">{team.name}</h1>
            <div className="flex flex-wrap gap-space-xs mt-space-sm">
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

          <section className="animate-enter" style={{ animationDelay: "80ms" }}>
            <h2 className="text-headline-sm text-on-surface mb-space-sm">Kanban del equipo</h2>
            <TeamKanban teamId={team.id} team={team} />
          </section>
        </>
      )}
    </div>
  );

  if (!isAdmin) {
    // team_lead: layout simple sin el sidebar ejecutivo
    return (
      <div className="min-h-screen bg-surface">
        <header className="h-16 px-space-xl flex items-center justify-between bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-space-sm">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold">P</div>
            <span className="text-headline-sm text-on-surface">Bienestar organizacional</span>
          </div>
          <Link to="/mi-espacio" className="motion-press text-label-md text-primary hover:underline">
            Ir a mi espacio
          </Link>
        </header>
        <main className="max-w-6xl mx-auto px-space-xl py-space-lg">{content}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="px-space-xl py-space-lg">{content}</div>
      </main>
    </div>
  );
}
