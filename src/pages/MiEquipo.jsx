import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import TeamKanban from "../components/TeamKanban";
import EmployeeShell from "../components/EmployeeShell";
import { Icon, SectionHeader } from "../components/EmployeeUi";
import { useTeam } from "../hooks/useTeams";
import { useAuth } from "../hooks/useAuth";
import { useSidebarState } from "../hooks/useSidebarState";
import { useDepartments } from "../hooks/useDepartments";

function departmentName(id, departments) {
  return departments.find((department) => department.id === id)?.name || id || "—";
}

/** Tablero de un equipo: vista admin (/equipos/:teamId) y vista de colaborador / líder. */
export default function TeamBoard() {
  const { teamId } = useParams();
  const { isAdmin } = useAuth();
  const { team, loading } = useTeam(teamId);
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();

  const members = Object.values(team?.memberNames || {});

  const content = (
    <div className="flex flex-col gap-space-lg">
      <Link
        to={isAdmin ? "/equipos" : "/mi-espacio"}
        className="inline-flex w-fit items-center gap-space-xs rounded-full py-1 pr-space-sm text-label-md font-semibold text-primary hover:underline"
      >
        <Icon name="arrow_back" size={18} />
        {isAdmin ? "Equipos" : "Mi espacio"}
      </Link>

      {loading ? (
        <div className="flex flex-col gap-space-md">
          <div className="h-16 max-w-md rounded-2xl animate-shimmer" />
          <div className="h-72 rounded-2xl animate-shimmer" />
        </div>
      ) : !team ? (
        <p className="text-body-md text-on-surface-variant">Equipo no encontrado.</p>
      ) : (
        <>
          <div>
            <p className="text-label-md font-semibold text-primary">{departmentName(team.departmentId, departments)}</p>
            <h1 className="text-headline-xl tracking-tight text-on-surface">{team.name}</h1>
            {members.length > 0 && (
              <div className="mt-space-sm flex flex-wrap items-center gap-space-xs">
                <span className="text-label-md text-on-surface-variant">
                  {members.length} {members.length === 1 ? "integrante" : "integrantes"}
                </span>
                {members.map((memberName) => (
                  <span
                    key={memberName}
                    className="rounded-full bg-primary-fixed px-space-sm py-1 text-label-md text-on-primary-fixed-variant"
                  >
                    {memberName}
                  </span>
                ))}
              </div>
            )}
          </div>

          <section className="flex flex-col gap-space-sm">
            <SectionHeader title="Kanban del equipo" />
            <TeamKanban teamId={team.id} team={team} />
          </section>
        </>
      )}
    </div>
  );

  if (!isAdmin) {
    // colaborador / team_lead: cabecera simple, sin el sidebar ejecutivo
    return <EmployeeShell>{content}</EmployeeShell>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="max-w-6xl px-space-xl py-space-lg">{content}</div>
      </main>
    </div>
  );
}