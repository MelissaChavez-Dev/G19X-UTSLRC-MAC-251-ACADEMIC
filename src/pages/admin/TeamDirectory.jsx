import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { useTeams } from "../../hooks/useTeams";
import { useSidebarState } from "../../hooks/useSidebarState";
import { useDepartments } from "../../hooks/useDepartments";
import {
  createTeam,
  deleteTeamProject,
  removeTeamMember,
  updateTeamProject,
} from "../../services/userService";

function departmentName(id, departments) {
  return id
    ? departments.find((department) => department.id === id)?.name || id
    : "Interdepartamental";
}

export default function TeamDirectory() {
  const { teams, loading } = useTeams();
  const { departments } = useDepartments();
  const { collapsed } = useSidebarState();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState(null); // { name, joinCode }
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [savingTeamId, setSavingTeamId] = useState(null);
  const [teamOperationError, setTeamOperationError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setCreating(true);
    try {
      const result = await createTeam({ name: name.trim(), description: description.trim(), departmentId });
      setNewCode({ name: name.trim(), joinCode: result.joinCode });
      setCopied(false);
      setName("");
      setDescription("");
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

  async function handleUpdateTeam(event, teamId) {
    event.preventDefault();
    setTeamOperationError("");
    setSavingTeamId(teamId);
    try {
      await updateTeamProject(teamId, teamForm);
      setEditingTeamId(null);
    } catch (err) {
      setTeamOperationError(err?.message || "No se pudo actualizar el proyecto.");
    } finally {
      setSavingTeamId(null);
    }
  }

  async function handleRemoveMember(team, userId, memberName) {
    if (!window.confirm(`¿Retirar a ${memberName} de «${team.name}»?`)) return;
    setTeamOperationError("");
    setSavingTeamId(team.id);
    try {
      await removeTeamMember(team.id, userId);
    } catch (err) {
      setTeamOperationError(err?.message || "No se pudo retirar al integrante.");
    } finally {
      setSavingTeamId(null);
    }
  }

  async function handleDeleteTeam(team) {
    if (!window.confirm(`¿Eliminar «${team.name}» y todas sus tareas? Esta acción no se puede deshacer.`)) return;
    setTeamOperationError("");
    setSavingTeamId(team.id);
    try {
      await deleteTeamProject(team.id);
    } catch (err) {
      setTeamOperationError(err?.message || "No se pudo eliminar el proyecto.");
    } finally {
      setSavingTeamId(null);
    }
  }

  const queryText = searchTerm.trim().toLocaleLowerCase("es");
  const filteredTeams = teams.filter((team) => {
    const members = Object.values(team.memberNames || {}).join(" ");
    const department = departmentName(team.departmentId, departments);
    const matchesSearch = !queryText ||
      `${team.name} ${members} ${department}`.toLocaleLowerCase("es").includes(queryText);
    const matchesDepartment = departmentFilter === "all"
      || (departmentFilter === "interdepartmental" ? !team.departmentId : team.departmentId === departmentFilter);
    return matchesSearch && matchesDepartment;
  });
  const memberCount = teams.reduce((total, team) => total + (team.memberIds || []).length, 0);
  const crossDepartmentCount = teams.filter((team) => !team.departmentId).length;

  const inputClass =
    "rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-space-lg px-space-xl py-space-lg">
          <div className="flex flex-wrap items-end justify-between gap-space-md animate-enter">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                Organización
              </span>
              <h1 className="mt-space-sm text-headline-xl text-on-surface">Directorio de equipos</h1>
              <p className="mt-1 max-w-prose text-body-md text-on-surface-variant">
                Organiza tableros por área o crea grupos interdepartamentales mediante código.
              </p>
            </div>
            <div className="flex flex-wrap gap-space-sm">
              {[
                { label: "Equipos", value: teams.length },
                { label: "Integrantes", value: memberCount },
                { label: "Interdepartamentales", value: crossDepartmentCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-surface-container-low px-space-md py-space-sm">
                  <span className="block text-headline-sm text-on-surface">{stat.value}</span>
                  <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Crear equipo */}
          <form
            onSubmit={handleCreate}
            className="motion-card keep-card-color bg-surface-container-lowest p-space-lg flex flex-col gap-space-md animate-enter"
          >
            <div>
              <h2 className="text-headline-sm text-on-surface">Crear equipo</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                El código permite unirse a personas de cualquier departamento.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-space-md">
              <div className="flex min-w-56 flex-1 flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="team-name">Nombre del equipo</label>
                <input
                  id="team-name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Equipo de proyecto"
                  required
                />
              </div>
              <div className="flex min-w-56 flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="team-dept">Área de referencia (opcional)</label>
                <select
                  id="team-dept"
                  className={inputClass}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Interdepartamental</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-56 flex-[2] flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="team-description">Descripción (opcional)</label>
                <input
                  id="team-description"
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo del proyecto"
                  maxLength={2000}
                />
              </div>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
                {creating ? "Creando..." : "Crear equipo"}
              </button>
            </div>
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
                Comparte este código con cualquier integrante. Puede unirse aunque pertenezca a otro departamento:
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

          {teamOperationError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{teamOperationError}</p>}

          {/* Lista de equipos */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_18rem] gap-space-sm">
            <label className="relative">
              <span className="sr-only">Buscar equipos o integrantes</span>
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar equipo o integrante"
                className={`${inputClass} pl-10`}
              />
            </label>
            <label>
              <span className="sr-only">Filtrar equipos por departamento</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={inputClass}
              >
                <option value="all">Todos los equipos</option>
                <option value="interdepartmental">Interdepartamentales</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-body-md text-on-surface-variant">Cargando equipos...</p>
          ) : filteredTeams.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              {teams.length === 0 ? "Aún no hay equipos. Crea el primero arriba." : "No hay equipos que coincidan con la búsqueda o el filtro."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {filteredTeams.map((team, index) => (
                <div
                  key={team.id}
                  className="motion-card keep-card-color bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm animate-enter"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  {editingTeamId === team.id ? (
                    <form onSubmit={(event) => handleUpdateTeam(event, team.id)} className="flex flex-col gap-space-sm">
                      <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                        Nombre del proyecto
                        <input
                          value={teamForm.name}
                          onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))}
                          className={inputClass}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                        Descripción
                        <textarea
                          value={teamForm.description}
                          onChange={(event) => setTeamForm((current) => ({ ...current, description: event.target.value }))}
                          className={`${inputClass} min-h-20 resize-y`}
                          maxLength={2000}
                        />
                      </label>
                      <div className="flex justify-end gap-space-xs">
                        <button type="button" onClick={() => setEditingTeamId(null)} className="rounded-full px-space-md py-2 text-label-md text-on-surface-variant">Cancelar</button>
                        <button type="submit" disabled={savingTeamId === team.id} className="motion-press rounded-full bg-primary px-space-md py-2 text-label-md text-on-primary disabled:opacity-60">
                          {savingTeamId === team.id ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-space-sm">
                        <div className="min-w-0">
                          <h2 className="text-headline-sm text-on-surface">{team.name}</h2>
                          <p className="mt-1 inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
                            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                              {team.departmentId ? "domain" : "diversity_3"}
                            </span>
                            {departmentName(team.departmentId, departments)}
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
                      {team.description && <p className="text-body-sm text-on-surface-variant">{team.description}</p>}
                      <div className="flex justify-end gap-space-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setTeamForm({ name: team.name, description: team.description || "" });
                            setEditingTeamId(team.id);
                          }}
                          className="motion-press inline-flex items-center gap-1 rounded-full bg-surface-container-low px-space-sm py-1.5 text-label-sm text-on-surface-variant hover:text-primary"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                          Editar proyecto
                        </button>
                        <button
                          type="button"
                          disabled={savingTeamId === team.id}
                          onClick={() => handleDeleteTeam(team)}
                          className="motion-press inline-flex items-center gap-1 rounded-full bg-error-container px-space-sm py-1.5 text-label-sm text-on-error-container disabled:opacity-50"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap gap-space-xs">
                    {(team.memberIds || []).length === 0 ? (
                      <span className="text-body-sm text-on-surface-variant">Sin integrantes todavía; comparte el código para invitar.</span>
                    ) : (
                      (team.memberIds || []).map((memberId) => (
                        <span
                          key={memberId}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--aqua-soft)] px-space-sm py-1 text-label-md text-[var(--aqua-ink)]"
                        >
                          {team.memberNames?.[memberId] || "Integrante"}
                          <button
                            type="button"
                            disabled={savingTeamId === team.id}
                            onClick={() => handleRemoveMember(team, memberId, team.memberNames?.[memberId] || "este integrante")}
                            title={`Retirar a ${team.memberNames?.[memberId] || "este integrante"}`}
                            aria-label={`Retirar a ${team.memberNames?.[memberId] || "este integrante"}`}
                            className="text-[var(--aqua-ink)] hover:text-error disabled:opacity-50"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-space-sm border-t border-outline-variant pt-space-sm">
                    <span className="text-label-sm text-on-surface-variant">
                      {Object.keys(team.memberNames || {}).length} integrantes · {(team.taskLists || []).length || 3} listas
                    </span>
                    <Link
                      to={`/equipos/${team.id}`}
                      className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary-container px-space-md py-2 text-label-md font-semibold text-on-primary-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                      Abrir tablero
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
