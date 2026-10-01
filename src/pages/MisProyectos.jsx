import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import JoinTeamCard from "../components/JoinTeamCard";
import TeamKanban from "../components/TeamKanban";
import { useMyTeams } from "../hooks/useTeams";
import { leaveTeamProject, updateTeamProject } from "../services/userService";
import { projectTheme, initials } from "../data/projectTheme";

const TABS = [
  { id: "board", label: "Tablero", icon: "view_kanban" },
  { id: "people", label: "Personas", icon: "group" },
  { id: "about", label: "Acerca de", icon: "info" },
];

function Icon({ name, size = 18, className = "" }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function ProjectDetails({ team, onLeave }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(team.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateTeamProject(team.id, { description });
      setEditing(false);
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar la descripción.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave() {
    if (!window.confirm(`¿Abandonar el proyecto «${team.name}»?`)) return;
    setSaving(true);
    setError("");
    try {
      await leaveTeamProject(team.id);
      onLeave();
    } catch (leaveError) {
      setError(leaveError?.message || "No se pudo abandonar el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <section className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-lg">
        <div className="flex items-center justify-between gap-space-sm">
          <h2 className="text-headline-sm text-on-surface">Descripción</h2>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="motion-press inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-2 text-label-md text-on-surface hover:bg-surface-container-high">
              <Icon name="edit" size={17} />
              Editar
            </button>
          )}
        </div>
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-space-xs">
            <label htmlFor="project-description" className="sr-only">Descripción del proyecto</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-on-surface-variant">{description.length}/2000</span>
              <div className="flex gap-space-xs">
                <button type="button" onClick={() => setEditing(false)} className="rounded-full px-space-md py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low">Cancelar</button>
                <button type="submit" disabled={saving} className="motion-press rounded-full bg-primary px-space-md py-2 text-label-md font-semibold text-on-primary disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar descripción"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="max-w-prose whitespace-pre-line text-body-md text-on-surface-variant">
            {team.description || "Este proyecto aún no tiene descripción."}
          </p>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-space-sm rounded-2xl bg-surface-container-lowest p-space-lg">
        <div>
          <h2 className="text-headline-sm text-on-surface">Abandonar proyecto</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">Dejarás de ver su tablero. Puedes volver a unirte con el código.</p>
        </div>
        <button type="button" onClick={handleLeave} disabled={saving} className="motion-press inline-flex items-center gap-space-xs rounded-full bg-error-container px-space-md py-2 text-label-md font-semibold text-on-error-container disabled:opacity-50">
          <Icon name="logout" size={17} />
          Abandonar
        </button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{error}</p>}
    </div>
  );
}

function ProjectView({ team, onLeave, onJoined }) {
  const [tab, setTab] = useState("board");
  const members = Object.entries(team.memberNames || {});

  return (
    <>
      {/* Banner del proyecto */}
      <div className={`relative overflow-hidden rounded-2xl p-space-lg ${projectTheme(team.id)}`}>
        <Icon name="dashboard" size={160} className="absolute -bottom-8 right-4 opacity-10" />
        <p className="relative text-label-md font-semibold opacity-80">Proyecto</p>
        <h1 className="relative mt-1 text-headline-xl tracking-tight">{team.name}</h1>
        <p className="relative mt-1 line-clamp-2 max-w-prose text-body-md opacity-90">
          {team.description || "Este proyecto aún no tiene descripción."}
        </p>
        <span className="relative mt-space-sm inline-flex items-center gap-space-xs rounded-full bg-surface-container-lowest/70 px-space-sm py-1 text-label-md font-semibold text-on-surface">
          <Icon name="group" size={16} />
          {members.length} {members.length === 1 ? "integrante" : "integrantes"}
        </span>
      </div>

      {/* Pestañas */}
      <div role="tablist" aria-label="Secciones del proyecto" className="flex gap-space-xs border-b border-outline-variant">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`motion-press -mb-px inline-flex items-center gap-space-xs border-b-2 px-space-md py-space-sm text-label-md font-semibold transition-colors ${
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="animate-enter">
        {tab === "board" && (
          <section aria-label={`Tablero Kanban de ${team.name}`}>
            <TeamKanban teamId={team.id} team={team} />
          </section>
        )}

        {tab === "people" && (
          <section className="max-w-3xl rounded-2xl bg-surface-container-lowest p-space-lg">
            <h2 className="text-headline-sm text-on-surface">Personas</h2>
            <p className="mb-space-sm mt-1 text-body-sm text-on-surface-variant">
              {members.length} {members.length === 1 ? "integrante" : "integrantes"} en este proyecto.
            </p>
            {members.length ? (
              <ul className="divide-y divide-outline-variant/60">
                {members.map(([uid, memberName]) => (
                  <li key={uid} className="flex items-center gap-space-sm py-space-sm">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-semibold text-on-primary-container">
                      {initials(memberName)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">{memberName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Aún no hay integrantes.</p>
            )}
          </section>
        )}

        {tab === "about" && (
          <div className="flex max-w-3xl flex-col gap-space-md">
            <ProjectDetails team={team} onLeave={onLeave} />
            <section className="flex flex-col gap-space-sm">
              <h2 className="text-headline-sm text-on-surface">Unirte a otro proyecto</h2>
              <JoinTeamCard onJoined={onJoined} />
            </section>
          </div>
        )}
      </div>
    </>
  );
}

export default function MisProyectos() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { teams, loading, error } = useMyTeams();
  const [joinedTeam, setJoinedTeam] = useState(null);
  const selectedTeam = teams.find((team) => team.id === teamId)
    || (joinedTeam?.id === teamId ? joinedTeam : null);

  function handleJoined(result) {
    setJoinedTeam({ id: result.teamId, name: result.teamName });
    navigate(`/mis-proyectos/${result.teamId}`);
  }

  if (loading) {
    return (
      <div className="app-canvas min-h-screen">
        <header className="flex h-16 items-center border-b border-outline-variant/50 bg-surface-container-lowest px-space-lg">
          <Link to="/mi-espacio" className="text-label-md text-primary">Volver a Mi espacio</Link>
        </header>
        <main className="mx-auto flex max-w-screen-2xl flex-col gap-space-md px-space-lg py-space-lg" role="status" aria-label="Cargando tus proyectos">
          <div className="h-40 rounded-2xl animate-shimmer" />
          <div className="h-64 rounded-2xl animate-shimmer" />
        </main>
      </div>
    );
  }

  if (!teamId && teams.length > 0) {
    return <Navigate to={`/mis-proyectos/${teams[0].id}`} replace />;
  }

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <header className="sticky top-0 z-40 border-b border-outline-variant/50 bg-surface-container-lowest/95 px-space-lg py-space-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-12 max-w-screen-2xl items-center justify-between gap-space-md">
          <Link to="/mi-espacio" className="inline-flex items-center gap-space-xs text-label-md text-on-surface-variant hover:text-primary">
            <Icon name="arrow_back" size={20} />
            <span>Mi espacio</span>
          </Link>
          <details className="relative">
            <summary className="motion-press flex max-w-[min(24rem,60vw)] cursor-pointer list-none items-center gap-space-xs rounded-full bg-primary-container px-space-md py-2 text-label-md font-semibold text-on-primary-container hover:brightness-95">
              <Icon name="workspaces" />
              <span className="truncate">{selectedTeam?.name || "Mis proyectos"}</span>
              <Icon name="expand_more" />
            </summary>
            <nav aria-label="Seleccionar proyecto" className="absolute right-0 top-full z-50 mt-2 flex max-h-80 w-72 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xs shadow-xl">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/mis-proyectos/${team.id}`}
                  aria-current={team.id === teamId ? "page" : undefined}
                  className={`flex items-center gap-space-sm rounded-lg px-space-sm py-2.5 text-body-sm ${
                    team.id === teamId
                      ? "bg-primary-container font-semibold text-on-primary-container"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <Icon name="dashboard" />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                </Link>
              ))}
              {!teams.length && (
                <p className="px-space-sm py-space-md text-body-sm text-on-surface-variant">
                  Aún no perteneces a ningún proyecto.
                </p>
              )}
            </nav>
          </details>
        </div>
      </header>

      <main className="mx-auto flex max-w-screen-2xl flex-col gap-space-md px-space-lg py-space-lg">
        {error && (
          <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
            No se pudieron sincronizar todos tus proyectos: {error}
          </p>
        )}
        {!teams.length && !selectedTeam ? (
          <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-space-md py-space-2xl text-center">
            <Icon name="dashboard" size={40} className="text-primary" />
            <h1 className="text-headline-lg text-on-surface">{error ? "No pudimos cargar tus proyectos" : "Aún no tienes proyectos"}</h1>
            <p className="text-body-md text-on-surface-variant">
              {error ? "Comprueba tu conexión o vuelve a intentarlo." : "Únete con el código que te compartió el administrador para ver sus tableros."}
            </p>
            <JoinTeamCard onJoined={handleJoined} />
            <Link to="/mi-espacio" className="text-label-md font-semibold text-primary hover:underline">Volver a Mi espacio</Link>
          </section>
        ) : !selectedTeam ? (
          <section className="flex flex-col items-center gap-space-sm py-space-2xl text-center">
            <h1 className="text-headline-lg text-on-surface">Proyecto no disponible</h1>
            <p className="text-body-md text-on-surface-variant">
              Este tablero no está en la lista de proyectos a los que perteneces.
            </p>
            <Link to={`/mis-proyectos/${teams[0].id}`} className="text-label-md font-semibold text-primary hover:underline">
              Abrir {teams[0].name}
            </Link>
          </section>
        ) : (
          <ProjectView
            key={selectedTeam.id}
            team={selectedTeam}
            onLeave={() => navigate("/mis-proyectos", { replace: true })}
            onJoined={handleJoined}
          />
        )}
      </main>
    </div>
  );
}