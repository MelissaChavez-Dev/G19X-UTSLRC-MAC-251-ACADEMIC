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

import { useProfiles } from "../../hooks/useProfiles";

import Avatar from "../../components/Avatar";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";



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

const EMPLOYMENT_OPTIONS = [

  { id: "full_time", label: "Tiempo completo" },

  { id: "part_time", label: "Medio tiempo" },

  { id: "temporary", label: "Temporal" },

  { id: "contract", label: "Contrato" },

  { id: "intern", label: "Prácticas" },

];

// Paleta de alto contraste: cada departamento conserva su color aunque cambie el conteo.
const DEPARTMENT_COLORS = [
  "#4F46E5", // Índigo
  "#0F766E", // Verde azulado
  "#D97706", // Ámbar
  "#DB2777", // Rosa
  "#0284C7", // Azul cielo
  "#7C3AED", // Violeta
  "#65A30D", // Verde
  "#64748B", // Gris azulado
];

const UNASSIGNED_DEPARTMENT_COLOR = "#94A3B8";

function getDepartmentColor(departmentId, allDepartments = []) {
  if (departmentId === "unassigned") return UNASSIGNED_DEPARTMENT_COLOR;

  const index = allDepartments.findIndex(
    (department) => department.id === departmentId
  );

  return DEPARTMENT_COLORS[(index < 0 ? 0 : index) % DEPARTMENT_COLORS.length];
}



const EMPTY_FORM = {

  displayName: "",

  email: "",

  employeeId: "",

  jobTitle: "",

  employmentType: "full_time",

  hireDate: "",

  role: "employee",

  departmentId: "",

  teamId: "",

  days: ["mon", "tue", "wed", "thu", "fri"],

  startTime: "09:00",

  endTime: "18:00",

};



const inputClass =

  "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

const accountInputClass = inputClass;



function departmentName(id, departments) {

  return departments.find((department) => department.id === id)?.name || id || "—";

}



function employeeCode(user) {

  return user.employeeId || `EMP-${String(user.id || "").slice(0, 8).toUpperCase()}`;

}



function formatDate(value) {

  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";

  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

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

  const { profiles } = useProfiles();

  const [users, setUsers] = useState([]);

  const [teams, setTeams] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [newDepartmentName, setNewDepartmentName] = useState("");

  const [departmentError, setDepartmentError] = useState("");

  const [editingDepartmentId, setEditingDepartmentId] = useState(null);

  const [editingDepartmentName, setEditingDepartmentName] = useState("");

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [credentials, setCredentials] = useState(null); // { email, employeeId, temporaryPassword }

  const [copied, setCopied] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [roleFilter, setRoleFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  const [editingUser, setEditingUser] = useState(null);

  const [editForm, setEditForm] = useState({

    displayName: "",

    email: "",

    departmentId: "",

    employeeId: "",

    jobTitle: "",

    employmentType: "full_time",

    hireDate: "",

  });

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

        employeeId: form.employeeId.trim(),

        jobTitle: form.jobTitle.trim(),

        employmentType: form.employmentType,

        hireDate: form.hireDate || null,

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

      setCredentials({

        email: form.email.trim(),

        employeeId: result.employeeId,

        temporaryPassword: result.temporaryPassword,

      });

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

      employeeId: user.employeeId || employeeCode(user),

      jobTitle: user.jobTitle || "",

      employmentType: user.employmentType || "full_time",

      hireDate: user.hireDate || "",

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

        employeeId: editForm.employeeId.trim(),

        jobTitle: editForm.jobTitle.trim(),

        employmentType: editForm.employmentType,

        hireDate: editForm.hireDate || null,

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

      `${user.displayName || ""} ${user.email || ""} ${user.employeeId || ""} ${user.jobTitle || ""}`

        .toLocaleLowerCase("es")

        .includes(normalizedSearch);

    const matchesDepartment = departmentFilter === "all" || user.departmentId === departmentFilter;

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus = statusFilter === "all" ||

      (statusFilter === "active" ? user.active !== false : user.active === false);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;

  });



  const activeCount = users.filter((u) => u.active !== false).length;

  const employeeUsers = users.filter(

    (user) => (user.role === "employee" || user.role === "team_lead") && user.active !== false

  );

  const monthStart = new Date();

  const monthStartIso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;

  const todayIso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(monthStart.getDate()).padStart(2, "0")}`;

  const newHiresThisMonth = employeeUsers.filter(

    (user) => user.hireDate && user.hireDate >= monthStartIso && user.hireDate <= todayIso

  ).length;

  const departmentDistribution = departments

    .map((department) => ({

      id: department.id,

      name: department.name,

      count: employeeUsers.filter((user) => user.departmentId === department.id).length,

    }))

    .filter((department) => department.count > 0);

  const unassignedCount = employeeUsers.filter((user) => !user.departmentId).length;

  if (unassignedCount > 0) {

    departmentDistribution.push({ id: "unassigned", name: "Sin departamento", count: unassignedCount });

  }

  const totalDepartmentEmployees = departmentDistribution.reduce(
    (total, department) => total + department.count,
    0
  );

  const hasFilters = searchTerm || departmentFilter !== "all" || roleFilter !== "all" || statusFilter !== "all";



  function clearFilters() {

    setSearchTerm("");

    setDepartmentFilter("all");

    setRoleFilter("all");

    setStatusFilter("all");

  }


  return (

    <div className="app-canvas zone-dashboard min-h-screen">

      <Sidebar />

      <TopBar />

      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* Encabezado + resumen */}

          <div className="flex flex-wrap items-end justify-between gap-space-md animate-enter">

            <div>

              <h1 className="text-headline-xl text-on-surface tracking-tight">Gestión de usuarios</h1>

              <p className="text-body-md text-on-surface-variant mt-1 max-w-prose">

                Solo la administración puede crear cuentas. Comparte la contraseña temporal con el colaborador.

              </p>

            </div>

            <div className="flex flex-wrap gap-space-sm">

              <Stat label="Colaboradores" value={employeeUsers.length} />

              <Stat label="Nuevos este mes" value={newHiresThisMonth} />

              <Stat label="Activas" value={activeCount} />

              <Stat label="Departamentos" value={departments.length} />

            </div>

          </div>



          {/* Distribución y gestión de departamentos */}
          <section className="motion-card keep-card-color flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm animate-enter sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-on-surface">Distribución y gestión de departamentos</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  Consulta cuántos colaboradores pertenecen a cada área y administra sus departamentos desde un solo lugar.
                </p>
              </div>
              <form onSubmit={handleCreateDepartment} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="Ingresar nombre"
                  aria-label="Nombre del nuevo departamento"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-4 focus:ring-primary/15 sm:w-64"
                />
                <button
                  type="submit"
                  disabled={!newDepartmentName.trim()}
                  className="motion-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="add" size={18} />
                  Nuevo departamento
                </button>
              </form>
            </div>

            {departmentError && <p role="alert" className="rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container">{departmentError}</p>}
            <div className="h-px bg-surface-container" />

            {/* Resumen visual: leyenda y gráfica circular */}
            <div className="grid grid-cols-1 items-center gap-5 rounded-2xl border border-outline-variant bg-surface-container-low p-4 lg:grid-cols-[minmax(0,1fr)_250px] sm:p-5">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-on-surface">Colaboradores por departamento</h3>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  Distribución de cuentas activas de colaboradores y líderes de equipo.
                </p>
                {allDepartments.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-3 py-4 text-sm text-on-surface-variant">
                    Aún no hay departamentos. Crea uno para comenzar.
                  </p>
                ) : (
                  <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {allDepartments.map((department) => {
                      const inactive = department.active === false;
                      const distributionItem = departmentDistribution.find((item) => item.id === department.id);
                      const count = distributionItem?.count || 0;
                      const percentage = totalDepartmentEmployees
                        ? Math.round((count / totalDepartmentEmployees) * 100)
                        : 0;
                      const color = getDepartmentColor(department.id, allDepartments);

                      return (
                        <li
                          key={department.id}
                          className={`flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 shadow-sm ${
                            inactive ? "border-outline-variant bg-surface-container-high" : "border-outline-variant bg-surface-container-lowest"
                          }`}
                        >
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          {editingDepartmentId === department.id ? (
                            <form onSubmit={handleRenameDepartment} className="flex min-w-0 flex-1 items-center gap-1">
                              <input
                                autoFocus
                                value={editingDepartmentName}
                                onChange={(e) => setEditingDepartmentName(e.target.value)}
                                aria-label="Editar nombre del departamento"
                                className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              />
                              <button type="submit" aria-label="Guardar nombre" title="Guardar" className="rounded-lg p-1.5 text-success transition hover:bg-success-container">
                                <Icon name="check" size={16} />
                              </button>
                              <button type="button" aria-label="Cancelar edición" title="Cancelar" onClick={() => { setEditingDepartmentId(null); setEditingDepartmentName(""); }} className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container">
                                <Icon name="close" size={16} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-xs font-medium ${inactive ? "text-on-surface-variant" : "text-on-surface"}`}>{department.name}</span>
                                <span className="block text-[11px] text-on-surface-variant">
                                  {inactive ? "Inactivo" : `${percentage}% del total`}
                                </span>
                              </span>
                              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-container-low px-2 text-xs font-semibold tabular-nums text-on-surface">{count}</span>
                              <div className="flex shrink-0 items-center gap-0">
                                <IconButton
                                  icon="edit"
                                  label={`Renombrar ${department.name}`}
                                  tone="primary"
                                  compact
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
                                  compact
                                  onClick={() => handleToggleDepartment(department)}
                                />
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                    {unassignedCount > 0 && (
                      <li className="flex min-w-0 items-center gap-2 rounded-full border border-dashed border-outline-variant bg-surface-container-low px-3 py-2">
                        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: UNASSIGNED_DEPARTMENT_COLOR }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-on-surface">Sin departamento</span>
                          <span className="block text-[11px] text-on-surface-variant">Sin área asignada</span>
                        </span>
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-container-low px-2 text-xs font-semibold tabular-nums text-on-surface">{unassignedCount}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {departmentDistribution.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="relative h-56 w-full max-w-[250px]" role="img" aria-label="Gráfica circular de colaboradores por departamento">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentDistribution}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={57}
                          outerRadius={83}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {departmentDistribution.map((department) => (
                            <Cell
                              key={department.id}
                              fill={getDepartmentColor(department.id, allDepartments)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => [value, item?.payload?.name || "Colaboradores"]}
                          contentStyle={{ borderRadius: 12, border: "1px solid var(--color-outline-variant, #64748b)", backgroundColor: "var(--color-surface-container-lowest, #fff)", color: "var(--color-on-surface, #111827)", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Total</span>
                      <span className="mt-1 text-3xl font-bold tracking-tight text-on-surface">{totalDepartmentEmployees}</span>
                      <span className="text-xs text-on-surface-variant">colaboradores</span>
                    </div>
                  </div>
                  <p className="-mt-1 text-center text-[11px] text-on-surface-variant">Cuentas activas por área</p>
                </div>
              )}
            </div>

            <div className="h-px bg-surface-container" />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant bg-secondary-container px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                <Icon name="groups" size={20} />
                <span className="font-medium">Colaboradores activos distribuidos</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-on-secondary-container">{totalDepartmentEmployees}</span>
            </div>
          </section>

{/* Alta de usuario */}
          <form onSubmit={handleCreate} className="motion-card animate-enter flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6 lg:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">

            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <SectionHeader
                title="Dar de alta una cuenta"
                description="Completa los datos del colaborador, su área y su horario de trabajo."
              />
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Icon name="lock" size={15} /> Acceso con contraseña temporal
              </span>
            </div>

            {/* Grid principal con h-full para emparejar alturas */}
            <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">

              {/* Bloque Izquierdo: Datos de la persona */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100">
                  Datos de la persona
                </h3>

                <Field id="um-name" label="Nombre completo">
                  <input id="um-name" className={accountInputClass} value={form.displayName} onChange={(e) => updateField("displayName", e.target.value)} required placeholder="Ana Torres" />
                </Field>

                <Field id="um-email" label="Correo electrónico">
                  <input id="um-email" type="email" className={accountInputClass} value={form.email} onChange={(e) => updateField("email", e.target.value)} required placeholder="persona@empresa.example" />
                </Field>

                <Field id="um-employee-id" label="Número de empleado (opcional)">
                  <input id="um-employee-id" className={accountInputClass} value={form.employeeId} onChange={(e) => updateField("employeeId", e.target.value)} placeholder="Automático si se deja vacío" />
                </Field>

                <Field id="um-job-title" label="Puesto">
                  <input id="um-job-title" className={accountInputClass} value={form.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} placeholder="Analista" maxLength={100} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="um-employment-type" label="Tipo de contratación">
                    <select id="um-employment-type" className={accountInputClass} value={form.employmentType} onChange={(e) => updateField("employmentType", e.target.value)}>
                      {EMPLOYMENT_OPTIONS.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </select>
                  </Field>

                  <Field id="um-hire-date" label="Fecha de ingreso">
                    <input id="um-hire-date" type="date" className={accountInputClass} value={form.hireDate} onChange={(e) => updateField("hireDate", e.target.value)} />
                  </Field>
                </div>

                <Field id="um-role" label="Rol">
                  <select id="um-role" className={accountInputClass} value={form.role} onChange={(e) => updateField("role", e.target.value)}>
                    {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Bloque Derecho: Organización y horario */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100">
                  Organización y horario
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="um-dept" label="Departamento">
                    <select
                      id="um-dept"
                      className={accountInputClass}
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
                    <select id="um-team" className={accountInputClass} value={form.teamId} onChange={(e) => updateField("teamId", e.target.value)}>
                      <option value="">Sin equipo asignado</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>

                  <Field id="um-start" label="Hora de entrada">
                    <input id="um-start" type="time" className={accountInputClass} value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} />
                  </Field>

                  <Field id="um-end" label="Hora de salida">
                    <input id="um-end" type="time" className={accountInputClass} value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} />
                  </Field>
                </div>

                <div className="mt-auto flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Días laborales</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Selecciona los días habituales de trabajo</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                              ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                              : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/50"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-pop dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300" role="alert">{error}</p>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Los campos obligatorios están marcados en el formulario.</p>
              <button
                type="submit"
                disabled={creating || !form.departmentId}
                className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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

              <p className="text-label-md text-on-secondary-container">

                Número de empleado: <strong>{credentials.employeeId}</strong>

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

              <div className="w-full overflow-x-auto rounded-md bg-surface-container-lowest">

                <table className="w-full min-w-[1120px] border-collapse text-left">

                  <thead>

                    <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">

                      <th className="px-space-xs py-space-sm font-semibold">Usuario</th>

                      <th className="px-space-xs py-space-sm font-semibold">N.º empleado</th>

                      <th className="px-space-xs py-space-sm font-semibold">Puesto</th>

                      <th className="px-space-xs py-space-sm font-semibold">Departamento</th>

                      <th className="px-space-xs py-space-sm font-semibold">Contratación</th>

                      <th className="px-space-xs py-space-sm font-semibold">Ingreso</th>

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

                              <Avatar

                                name={u.displayName || u.email}

                                photoURL={profiles[u.id]?.photoURL}

                                size={40}

                                className={inactive ? "opacity-50" : ""}

                              />

                              <div className="min-w-0">

                                <p className={`break-words text-body-md font-medium ${inactive ? "text-on-surface-variant" : "text-on-surface"}`}>

                                  {u.displayName || "—"}{isSelf && <span className="ml-2 text-label-sm text-primary">Tú</span>}

                                </p>

                                <p className="break-all text-body-sm text-on-surface-variant">{u.email}</p>

                              </div>

                            </div>

                          </td>

                          <td className="px-space-xs py-space-sm font-mono text-label-md text-on-surface-variant">

                            {employeeCode(u)}

                          </td>

                          <td className="break-words px-space-xs py-space-sm text-body-sm text-on-surface-variant">

                            {u.jobTitle || "—"}

                          </td>

                          <td className="break-words px-space-xs py-space-sm text-body-sm text-on-surface-variant">

                            {departmentName(u.departmentId, allDepartments)}

                          </td>

                          <td className="px-space-xs py-space-sm text-body-sm text-on-surface-variant">

                            {EMPLOYMENT_OPTIONS.find((option) => option.id === u.employmentType)?.label || "—"}

                          </td>

                          <td className="px-space-xs py-space-sm text-body-sm text-on-surface-variant">

                            {formatDate(u.hireDate)}

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

                  <Field id="eu-employee-id" label="Número de empleado">

                    <input id="eu-employee-id" value={editForm.employeeId} onChange={(e) => setEditForm((prev) => ({ ...prev, employeeId: e.target.value }))} className={inputClass} required />

                  </Field>

                  <Field id="eu-job-title" label="Puesto">

                    <input id="eu-job-title" value={editForm.jobTitle} onChange={(e) => setEditForm((prev) => ({ ...prev, jobTitle: e.target.value }))} className={inputClass} maxLength={100} />

                  </Field>

                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">

                    <Field id="eu-employment-type" label="Tipo de contratación">

                      <select id="eu-employment-type" value={editForm.employmentType} onChange={(e) => setEditForm((prev) => ({ ...prev, employmentType: e.target.value }))} className={inputClass}>

                        {EMPLOYMENT_OPTIONS.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}

                      </select>

                    </Field>

                    <Field id="eu-hire-date" label="Fecha de ingreso">

                      <input id="eu-hire-date" type="date" value={editForm.hireDate} onChange={(e) => setEditForm((prev) => ({ ...prev, hireDate: e.target.value }))} className={inputClass} />

                    </Field>

                  </div>

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