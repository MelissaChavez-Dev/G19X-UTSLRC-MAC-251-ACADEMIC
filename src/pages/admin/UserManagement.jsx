import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import {
  createEmployeeAccount,
  deleteUserAccount,
  listTeams,
  listUsers,
  resetUserPassword,
  updateUserAccount,
} from "../../services/userService";
import { useSidebarState } from "../../hooks/useSidebarState";
import { useAuth } from "../../hooks/useAuth";
import { useDepartments } from "../../hooks/useDepartments";
import { createDepartment, renameDepartment, setDepartmentActive } from "../../services/departmentService";

const DAY_OPTIONS = [
  { id: "mon", label: "L", name: "Lunes" },
  { id: "tue", label: "M", name: "Martes" },
  { id: "wed", label: "X", name: "Miércoles" },
  { id: "thu", label: "J", name: "Jueves" },
  { id: "fri", label: "V", name: "Viernes" },
  { id: "sat", label: "S", name: "Sábado" },
  { id: "sun", label: "D", name: "Domingo" },
];

const ROLE_OPTIONS = [
  { id: "employee", label: "Colaborador" },
  { id: "team_lead", label: "Líder de equipo" },
  { id: "admin", label: "Administrador" },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.id, r.label]));

const EMPTY_FORM = {
  displayName: "",
  email: "",
  role: "employee",
  departmentId: "",
  teamId: "",
  days: ["mon", "tue", "wed", "thu", "fri"],
  startTime: "09:00",
  endTime: "18:00",
};

const inputClass =
  "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

function departmentName(id, departments) {
  return departments.find((department) => department.id === id)?.name || id || "—";
}

function initials(user) {
  const source = (user.displayName || user.email || "?").trim();
  const parts = source.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Icon({ name, size = 18 }) {
  return (
    <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function Field({ id, label, children }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label className="text-label-md text-on-surface" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, description, aside }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-space-sm">
      <div>
        <h2 className="text-headline-sm text-on-surface">{title}</h2>
        {description && <p className="text-body-sm text-on-surface-variant mt-1 max-w-prose">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

function IconButton({ icon, label, onClick, disabled, tone = "neutral", compact = false }) {
  const tones = {
    neutral: "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
    primary: "text-primary hover:bg-primary-container",
    danger: "text-error hover:bg-error-container",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`motion-press inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-35 disabled:pointer-events-none ${compact ? "h-8 w-8" : "h-9 w-9"} ${tones[tone]}`}
    >
      <Icon name={icon} size={compact ? 17 : 19} />
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col rounded-xl bg-surface-container-lowest px-space-md py-space-sm">
      <span className="text-headline-md text-on-surface leading-tight">{value}</span>
      <span className="text-body-sm text-on-surface-variant">{label}</span>
    </div>
  );
}

export default function UserManagement() {
  const { collapsed } = useSidebarState();
  const { user: currentUser } = useAuth();
  const { departments, allDepartments } = useDepartments();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null); // { email, temporaryPassword }
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: "", email: "", departmentId: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryCredential, setTemporaryCredential] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [directoryError, setDirectoryError] = useState("");

  async function reload() {
    const [userList, teamList] = await Promise.all([listUsers(), listTeams()]);
    setUsers(userList);
    setTeams(teamList);
  }

  useEffect(() => {
    let active = true;
    Promise.all([listUsers(), listTeams()])
      .then(([userList, teamList]) => {
        if (active) {
          setUsers(userList);
          setTeams(teamList);
        }
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(dayId) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayId) ? prev.days.filter((d) => d !== dayId) : [...prev.days, dayId],
    }));
  }

  async function handleCreateDepartment(e) {
    e.preventDefault();
    setDepartmentError("");
    try {
      const department = await createDepartment(newDepartmentName);
      setNewDepartmentName("");
      updateField("departmentId", department.id);
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo agregar el departamento.");
    }
  }

  async function handleRenameDepartment(e) {
    e.preventDefault();
    setDepartmentError("");
    try {
      await renameDepartment(editingDepartmentId, editingDepartmentName);
      setEditingDepartmentId(null);
      setEditingDepartmentName("");
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo actualizar el departamento.");
    }
  }

  async function handleToggleDepartment(department) {
    const willDeactivate = department.active !== false;
    if (willDeactivate && !window.confirm(`¿Desactivar el departamento "${department.name}"? Se conservará su historial y no estará disponible para nuevas cuentas o encuestas.`)) return;

    setDepartmentError("");
    try {
      await setDepartmentActive(department.id, !willDeactivate);
      if (willDeactivate && form.departmentId === department.id) {
        updateField("departmentId", "");
      }
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo cambiar el estado del departamento.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const result = await createEmployeeAccount({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        role: form.role,
        departmentId: form.departmentId,
        teamId: form.teamId || null,
        workSchedule: {
          days: form.days,
          startTime: form.startTime,
          endTime: form.endTime,
          timezone: "America/Hermosillo",
        },
      });
      setCredentials({ email: form.email.trim(), temporaryPassword: result.temporaryPassword });
      setCopied(false);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setError(err?.message || "No se pudo crear la cuenta.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(credentials.temporaryPassword);
    setCopied(true);
  }

  async function handleToggleActive(user) {
    await updateUserAccount(user.id, { active: user.active === false });
    await reload();
  }

  function openEditUser(user) {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || "",
      email: user.email || "",
      departmentId: user.departmentId || "",
    });
    setTemporaryCredential(null);
    setDirectoryError("");
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setDirectoryError("");
    try {
      await updateUserAccount(editingUser.id, {
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim(),
        departmentId: editForm.departmentId || null,
      });
      await reload();
      setEditingUser(null);
    } catch (err) {
      setDirectoryError(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetPassword(user = editingUser) {
    if (!user) return;
    setResettingPassword(true);
    setDirectoryError("");
    setTemporaryCredential(null);
    try {
      const result = await resetUserPassword(user.id);
      setTemporaryCredential({
        email: user.id === editingUser?.id ? editForm.email : user.email || "",
        password: result.temporaryPassword,
      });
    } catch (err) {
      setDirectoryError(err?.message || "No se pudo generar una contraseña temporal.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleDeleteUser(user) {
    if (user.id === currentUser?.uid) {
      setDirectoryError("No puedes eliminar la cuenta con la que iniciaste sesión.");
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar permanentemente la cuenta de ${user.displayName || user.email}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    setDirectoryError("");
    try {
      await deleteUserAccount(user.id);
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
    } catch (err) {
      setDirectoryError(err?.message || "No se pudo eliminar la cuenta.");
    } finally {
      setDeletingUserId(null);
    }
  }

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("es");
  const filteredUsers = users.filter((user) => {
    const matchesSearch = !normalizedSearch ||
      `${user.displayName || ""} ${user.email || ""}`.toLocaleLowerCase("es").includes(normalizedSearch);
    const matchesDepartment = departmentFilter === "all" || user.departmentId === departmentFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" ? user.active !== false : user.active === false);
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.active !== false).length;
  const hasFilters = searchTerm || departmentFilter !== "all" || roleFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearchTerm("");
    setDepartmentFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  const cardClass = "motion-card keep-card-color bg-surface-container-lowest p-space-lg flex flex-col gap-space-lg animate-enter";

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-none flex-col gap-space-lg px-space-md py-space-lg sm:px-space-lg xl:w-3/4 xl:px-space-xl">
          {/* Encabezado + resumen */}
          <div className="flex flex-wrap items-end justify-between gap-space-md animate-enter">
            <div>
              <h1 className="text-headline-xl text-on-surface tracking-tight">Gestión de usuarios</h1>
              <p className="text-body-md text-on-surface-variant mt-1 max-w-prose">
                Solo la administración puede crear cuentas. Comparte la contraseña temporal con el colaborador.
              </p>
            </div>
            <div className="flex flex-wrap gap-space-sm">
              <Stat label="Cuentas" value={users.length} />
              <Stat label="Activas" value={activeCount} />
              <Stat label="Inactivas" value={users.length - activeCount} />
              <Stat label="Departamentos" value={departments.length} />
            </div>
          </div>

          {/* Departamentos */}
          <section className={cardClass}>
            <SectionHeader
              title="Departamentos"
              description="Configura las áreas de tu organización. El headcount se calcula a partir de las cuentas activas."
              aside={
                <form onSubmit={handleCreateDepartment} className="flex w-full sm:w-auto gap-space-sm">
                  <input
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Nuevo departamento"
                    aria-label="Nombre del nuevo departamento"
                    className={`${inputClass} sm:w-64`}
                  />
                  <button
                    type="submit"
                    disabled={!newDepartmentName.trim()}
                    className="motion-press inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary text-on-primary px-space-md py-2.5 text-label-md disabled:opacity-50"
                  >
                    <Icon name="add" size={18} />
                    Agregar
                  </button>
                </form>
              }
            />

            {departmentError && <p role="alert" className="text-body-sm text-error">{departmentError}</p>}

            {allDepartments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-outline-variant px-space-md py-space-lg text-center text-body-sm text-on-surface-variant">
                Agrega el primer departamento para poder crear cuentas.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
                {allDepartments.map((department) => {
                  const inactive = department.active === false;
                  return (
                    <div
                      key={department.id}
                      className={`flex items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low px-space-md py-space-xs min-h-14 ${inactive ? "opacity-70" : ""}`}
                    >
                      {editingDepartmentId === department.id ? (
                        <form onSubmit={handleRenameDepartment} className="flex flex-1 items-center gap-space-xs">
                          <input
                            autoFocus
                            value={editingDepartmentName}
                            onChange={(e) => setEditingDepartmentName(e.target.value)}
                            aria-label="Editar nombre del departamento"
                            className="min-w-0 flex-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-space-sm py-1.5 text-body-md text-on-surface outline-none focus:border-primary"
                          />
                          <IconButton icon="check" label="Guardar nombre" tone="primary" onClick={handleRenameDepartment} />
                          <IconButton icon="close" label="Cancelar" onClick={() => setEditingDepartmentId(null)} />
                        </form>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-body-md font-medium text-on-surface">
                            {department.name}
                          </span>
                          {inactive && (
                            <span className="rounded-full bg-surface-container px-space-sm py-0.5 text-label-sm text-on-surface-variant">
                              Inactivo
                            </span>
                          )}
                          <IconButton
                            icon="edit"
                            label={`Renombrar ${department.name}`}
                            tone="primary"
                            onClick={() => {
                              setEditingDepartmentId(department.id);
                              setEditingDepartmentName(department.name);
                              setDepartmentError("");
                            }}
                          />
                          <IconButton
                            icon={inactive ? "restart_alt" : "block"}
                            label={`${inactive ? "Reactivar" : "Desactivar"} ${department.name}`}
                            tone={inactive ? "primary" : "danger"}
                            onClick={() => handleToggleDepartment(department)}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Alta de usuario */}
          <form onSubmit={handleCreate} className={cardClass}>
            <SectionHeader
              title="Dar de alta una cuenta"
              description="Se generará una contraseña temporal que se muestra una sola vez."
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-x-space-xl gap-y-space-lg">
              <fieldset className="flex flex-col gap-space-md min-w-0">
                <legend className="mb-space-sm text-label-lg font-semibold text-on-surface">Persona</legend>
                <Field id="um-name" label="Nombre completo">
                  <input id="um-name" className={inputClass} value={form.displayName} onChange={(e) => updateField("displayName", e.target.value)} required placeholder="Ana Torres" />
                </Field>
                <Field id="um-email" label="Correo electrónico">
                  <input id="um-email" type="email" className={inputClass} value={form.email} onChange={(e) => updateField("email", e.target.value)} required placeholder="persona@empresa.example" />
                </Field>
                <Field id="um-role" label="Rol">
                  <select id="um-role" className={inputClass} value={form.role} onChange={(e) => updateField("role", e.target.value)}>
                    {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </Field>
              </fieldset>

              <fieldset className="flex flex-col gap-space-md min-w-0">
                <legend className="mb-space-sm text-label-lg font-semibold text-on-surface">Organización y horario</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <Field id="um-dept" label="Departamento">
                    <select
                      id="um-dept"
                      className={inputClass}
                      value={form.departmentId}
                      onChange={(e) => updateField("departmentId", e.target.value)}
                      required
                      disabled={departments.length === 0}
                    >
                      <option value="" disabled>
                        {departments.length ? "Selecciona un departamento" : "Agrega un departamento primero"}
                      </option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="um-team" label="Equipo (opcional)">
                    <select id="um-team" className={inputClass} value={form.teamId} onChange={(e) => updateField("teamId", e.target.value)}>
                      <option value="">Sin equipo asignado</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field id="um-start" label="Hora de entrada">
                    <input id="um-start" type="time" className={inputClass} value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} />
                  </Field>
                  <Field id="um-end" label="Hora de salida">
                    <input id="um-end" type="time" className={inputClass} value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <span className="text-label-md text-on-surface">Días laborales</span>
                  <div className="flex flex-wrap gap-space-xs">
                    {DAY_OPTIONS.map((day) => {
                      const selected = form.days.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          aria-pressed={selected}
                          aria-label={day.name}
                          title={day.name}
                          className={`motion-press h-10 w-10 rounded-full text-label-md font-semibold transition-colors ${
                            selected
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-low text-on-surface-variant border border-outline-variant hover:bg-surface-container"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            </div>

            {error && <p className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container animate-pop" role="alert">{error}</p>}

            <div className="flex justify-end border-t border-outline-variant pt-space-md">
              <button
                type="submit"
                disabled={creating || !form.departmentId}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
              >
                <Icon name="person_add" size={18} />
                {creating ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </div>
          </form>

          {/* Contraseña temporal generada */}
          {credentials && (
            <div className="motion-card animate-pop bg-secondary-container p-space-lg flex flex-col gap-space-sm" role="status">
              <div className="flex items-center gap-space-sm">
                <Icon name="key" size={22} />
                <h2 className="text-headline-sm text-on-secondary-container">Cuenta creada</h2>
              </div>
              <p className="text-body-md text-on-secondary-container max-w-prose">
                Comparte esta contraseña temporal con <strong>{credentials.email}</strong>. Se muestra una sola vez y deberá cambiarla en su primer acceso.
              </p>
              <div className="flex flex-wrap items-center gap-space-sm">
                <code className="flex-1 min-w-48 rounded-lg bg-surface-container-lowest px-space-md py-2.5 text-body-lg font-semibold text-on-surface tracking-wider break-all">
                  {credentials.temporaryPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="motion-press inline-flex items-center gap-1 rounded-full bg-secondary text-on-secondary px-space-md py-2.5 text-label-md"
                >
                  <Icon name={copied ? "check" : "content_copy"} size={17} />
                  {copied ? "Copiada" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Directorio */}
          <section className="motion-card keep-card-color bg-surface-container p-space-lg animate-enter">
            <SectionHeader
              title="Directorio de usuarios"
              description={`${filteredUsers.length} de ${users.length} cuentas`}
              aside={hasFilters && (
                <button type="button" onClick={clearFilters} className="motion-press inline-flex items-center gap-1 text-label-md text-primary">
                  <Icon name="filter_alt_off" size={17} />
                  Limpiar filtros
                </button>
              )}
            />

         {/* Filtros compactos en una sola línea en pantallas grandes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm my-space-md">
            <label className="relative block">
              <span className="sr-only">Buscar por nombre o correo</span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Icon name="search" size={17} /></span>
              <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar nombre o correo" className={`${inputClass} pl-9 py-2 text-body-sm w-full`} />
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por departamento</span>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={`${inputClass} py-2 text-body-sm w-full truncate`}>
                <option value="all">Todos los departamentos</option>
                {allDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}{department.active === false ? " (inactivo)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por rol</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${inputClass} py-2 text-body-sm w-full`}>
                <option value="all">Todos los roles</option>
                {ROLE_OPTIONS.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por estado</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} py-2 text-body-sm w-full`}>
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>
            {directoryError && (
              <p role="alert" className="mb-space-md rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
                {directoryError}
              </p>
            )}

            {users.length === 0 ? (
              <p className="py-space-lg text-center text-body-md text-on-surface-variant">Aún no hay cuentas registradas. Crea la primera con el formulario de arriba.</p>
            ) : filteredUsers.length === 0 ? (
              <p className="py-space-lg text-center text-body-md text-on-surface-variant">No hay cuentas que coincidan con esos filtros.</p>
            ) : (
              <div className="w-full overflow-hidden rounded-md bg-surface-container-lowest">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "21%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "17%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                      <th className="px-space-xs py-space-sm font-semibold">Usuario</th>
                      <th className="px-space-xs py-space-sm font-semibold">Departamento</th>
                      <th className="px-space-xs py-space-sm font-semibold">Rol</th>
                      <th className="px-space-xs py-space-sm font-semibold">Estado</th>
                      <th className="px-space-xs py-space-sm font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.uid;
                      const inactive = u.active === false;
                      return (
                        <tr key={u.id} className="transition-colors hover:bg-surface-container-low">
                          <td className="px-space-xs py-space-sm">
                            <div className="flex items-center gap-space-sm min-w-0">
                              <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-semibold text-on-primary-container ${inactive ? "opacity-50" : ""}`}>
                                {initials(u)}
                              </span>
                              <div className="min-w-0">
                                <p className={`break-words text-body-md font-medium ${inactive ? "text-on-surface-variant" : "text-on-surface"}`}>
                                  {u.displayName || "—"}{isSelf && <span className="ml-2 text-label-sm text-primary">Tú</span>}
                                </p>
                                <p className="break-all text-body-sm text-on-surface-variant">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="break-words px-space-xs py-space-sm text-body-sm text-on-surface-variant">
                            {departmentName(u.departmentId, allDepartments)}
                          </td>
                          <td className="px-space-xs py-space-sm">
                            <span className="break-words rounded-full bg-primary-fixed px-2 py-1 text-label-md text-on-primary-fixed-variant">
                              {ROLE_LABELS[u.role] || u.role || "—"}
                            </span>
                          </td>
                          <td className="px-space-xs py-space-sm">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-label-md ${inactive ? "bg-error-container text-on-error-container" : "bg-success-container text-on-success-container"}`}>
                              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                              {inactive ? "Inactivo" : "Activo"}
                            </span>
                          </td>
                          <td className="px-1 py-space-xs">
                            <div className="flex flex-wrap justify-end gap-0">
                              <IconButton icon="edit" label={`Editar a ${u.displayName || u.email}`} tone="primary" onClick={() => openEditUser(u)} compact />
                              <IconButton
                                icon={inactive ? "toggle_off" : "toggle_on"}
                                label={`${inactive ? "Reactivar" : "Desactivar"} a ${u.displayName || u.email}`}
                                onClick={() => handleToggleActive(u)}
                                compact
                              />
                              <IconButton
                                icon="lock_reset"
                                label={`Restablecer contraseña de ${u.displayName || u.email}`}
                                onClick={() => {
                                  openEditUser(u);
                                  handleResetPassword(u);
                                }}
                                compact
                              />
                              <IconButton
                                icon="delete"
                                label={isSelf ? "No puedes eliminar tu propia cuenta" : `Eliminar a ${u.displayName || u.email}`}
                                tone="danger"
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUserId === u.id || isSelf}
                                compact
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {editingUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-space-md" onClick={() => setEditingUser(null)}>
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-user-title"
                className="motion-card animate-pop max-h-[90vh] w-full max-w-xl overflow-y-auto bg-surface-container-lowest p-space-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-space-md flex items-start justify-between gap-space-sm">
                  <div>
                    <h2 id="edit-user-title" className="text-headline-md text-on-surface">Editar cuenta</h2>
                    <p className="text-body-sm text-on-surface-variant mt-1">Actualiza los datos de acceso y organización.</p>
                  </div>
                  <IconButton icon="close" label="Cerrar" onClick={() => setEditingUser(null)} />
                </div>

                <form onSubmit={handleSaveUser} className="flex flex-col gap-space-md">
                  <Field id="eu-name" label="Nombre completo">
                    <input id="eu-name" value={editForm.displayName} onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))} className={inputClass} required />
                  </Field>
                  <Field id="eu-email" label="Correo electrónico">
                    <input id="eu-email" type="email" value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} className={inputClass} required />
                  </Field>
                  <Field id="eu-dept" label="Departamento">
                    <select id="eu-dept" value={editForm.departmentId} onChange={(e) => setEditForm((prev) => ({ ...prev, departmentId: e.target.value }))} className={inputClass}>
                      <option value="">Sin departamento</option>
                      {allDepartments.map((department) => (
                        <option key={department.id} value={department.id} disabled={department.active === false}>
                          {department.name}{department.active === false ? " (inactivo)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="rounded-xl border border-outline-variant p-space-md flex flex-col gap-space-sm">
                    <div>
                      <h3 className="text-label-lg font-semibold text-on-surface">Acceso</h3>
                      <p className="text-body-sm text-on-surface-variant">Genera una nueva contraseña si la persona no puede iniciar sesión.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetPassword()}
                      disabled={resettingPassword}
                      className="motion-press self-start inline-flex items-center gap-space-xs rounded-full bg-secondary-container px-space-md py-2 text-label-md font-semibold text-on-secondary-container disabled:opacity-50"
                    >
                      <Icon name="key" size={17} />
                      {resettingPassword ? "Generando..." : "Generar contraseña temporal"}
                    </button>

                    {temporaryCredential && (
                      <div className="rounded-xl bg-success-container p-space-md text-on-success-container">
                        <p className="text-body-sm font-semibold">
                          Comparte esta contraseña con {temporaryCredential.email}. Deberá cambiarla al iniciar sesión.
                        </p>
                        <div className="mt-space-sm flex items-center gap-space-sm">
                          <code className="flex-1 rounded-lg bg-surface-container-lowest px-space-md py-2 text-body-md font-bold text-on-surface tracking-wider break-all">
                            {temporaryCredential.password}
                          </code>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(temporaryCredential.password)}
                            className="motion-press inline-flex items-center gap-1 rounded-full bg-success px-space-md py-2 text-label-md font-semibold text-on-success"
                          >
                            <Icon name="content_copy" size={16} />
                            Copiar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {directoryError && <p role="alert" className="text-body-sm text-error">{directoryError}</p>}

                  <div className="flex justify-end gap-space-sm border-t border-outline-variant pt-space-md">
                    <button type="button" onClick={() => setEditingUser(null)} className="motion-press rounded-full bg-surface-container-low px-space-md py-2.5 text-label-md text-on-surface-variant">
                      Cerrar
                    </button>
                    <button type="submit" disabled={savingEdit} className="motion-press rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50">
                      {savingEdit ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}