import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { DEPARTMENTS } from "../../data/surveyQuestion";
import { useTeams } from "../../hooks/useTeams";
import { useSidebarState } from "../../hooks/useSidebarState";
import { createTeam } from "../../services/userService";

function departmentName(id) {
  return DEPARTMENTS.find((d) => d.id === id)?.name || id || "—";
}

export default function TeamDirectory() {
  const { teams, loading } = useTeams();
  const { collapsed } = useSidebarState();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0].id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState(null); // { name, joinCode }
  const [copied, setCopied] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setCreating(true);
    try {
      const result = await createTeam({ name: name.trim(), departmentId });
      setNewCode({ name: name.trim(), joinCode: result.joinCode });
      setCopied(false);
      setName("");
    } catch (err) {
      setError(err?.message || "No se pudo crear el equipo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(code) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  const inputClass =
    "rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-6xl">
          <div className="animate-enter">
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
              Organización
            </span>
            <h1 className="text-headline-xl text-on-surface tracking-tight">Directorio de equipos</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Crea equipos y comparte su código para que los colaboradores se unan solos.
            </p>
          </div>

          {/* Crear equipo */}
          <form
            onSubmit={handleCreate}
            className="motion-card bg-surface-container-lowest p-space-lg flex flex-wrap items-end gap-space-md animate-enter"
          >
            <div className="flex flex-col gap-space-xs flex-1 min-w-48">
              <label className="text-label-md text-on-surface" htmlFor="team-name">Nombre del equipo</label>
              <input
                id="team-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Squad Backend Alpha"
                required
              />
            </div>
            <div className="flex flex-col gap-space-xs min-w-48">
              <label className="text-label-md text-on-surface" htmlFor="team-dept">Departamento</label>
              <select
                id="team-dept"
                className={inputClass}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear equipo"}
            </button>
            {error && <p className="text-body-sm text-error animate-pop w-full" role="alert">{error}</p>}
          </form>

          {/* Código del equipo recién creado */}
          {newCode && (
            <div className="motion-card animate-pop bg-secondary-container p-space-lg flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-on-secondary-container">celebration</span>
                <h2 className="text-headline-sm text-on-secondary-container">
                  Equipo "{newCode.name}" creado
                </h2>
              </div>
              <p className="text-body-md text-on-secondary-container">
                Comparte este código para que los integrantes se unan desde su espacio:
              </p>
              <div className="flex items-center gap-space-sm">
                <code className="flex-1 rounded-lg bg-surface-container-lowest px-space-md py-2.5 text-body-lg font-semibold text-on-surface tracking-widest">
                  {newCode.joinCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(newCode.joinCode)}
                  className="motion-press rounded-full bg-secondary text-on-secondary px-space-md py-2.5 text-label-md"
                >
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Lista de equipos */}
          {loading ? (
            <p className="text-body-md text-on-surface-variant">Cargando equipos...</p>
          ) : teams.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Aún no hay equipos. Crea el primero arriba.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {teams.map((team, index) => (
                <div
                  key={team.id}
                  className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm animate-enter"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-start justify-between gap-space-sm">
                    <div>
                      <h2 className="text-headline-sm text-on-surface">{team.name}</h2>
                      <p className="text-body-sm text-on-surface-variant">
                        {departmentName(team.departmentId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(team.joinCode)}
                      title="Copiar código de unión"
                      className="motion-press flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-sm py-1.5 text-label-md text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">key</span>
                      {team.joinCode}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-space-xs">
                    {Object.values(team.memberNames || {}).length === 0 ? (
                      <span className="text-body-sm text-on-surface-variant">Sin miembros todavía</span>
                    ) : (
                      Object.values(team.memberNames).map((memberName) => (
                        <span
                          key={memberName}
                          className="text-label-md px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant"
                        >
                          {memberName}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end mt-auto pt-space-xs">
                    <Link
                      to={`/equipos/${team.id}`}
                      className="motion-press flex items-center gap-space-xs text-label-md text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                      Ver kanban
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
