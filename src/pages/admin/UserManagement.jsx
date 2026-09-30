import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { DEPARTMENTS } from "../../data/surveyQuestion";
import { createEmployeeAccount, listTeams, listUsers, updateUserAccount } from "../../services/userService";
import { useSidebarState } from "../../hooks/useSidebarState";

const DAY_OPTIONS = [
  { id: "mon", label: "L" },
  { id: "tue", label: "M" },
  { id: "wed", label: "X" },
  { id: "thu", label: "J" },
  { id: "fri", label: "V" },
  { id: "sat", label: "S" },
  { id: "sun", label: "D" },
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
  departmentId: DEPARTMENTS[0].id,
  teamId: "",
  days: ["mon", "tue", "wed", "thu", "fri"],
  startTime: "09:00",
  endTime: "18:00",
};

function departmentName(id) {
  return DEPARTMENTS.find((d) => d.id === id)?.name || id || "—";
}

export default function UserManagement() {
  const { collapsed } = useSidebarState();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null); // { email, temporaryPassword }
  const [copied, setCopied] = useState(false);

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
      days: prev.days.includes(dayId)
        ? prev.days.filter((d) => d !== dayId)
        : [...prev.days, dayId],
    }));
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

  const inputClass =
    "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-6xl">
          <div className="animate-enter">
            <span className="text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">
              Administración
            </span>
            <h1 className="text-headline-xl text-on-surface tracking-tight">Gestión de Usuarios</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Solo la administración puede crear cuentas. Comparte la contraseña temporal con el colaborador.
            </p>
          </div>

          {/* Alta de usuario */}
          <form
            onSubmit={handleCreate}
            className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-md animate-enter"
          >
            <h2 className="text-headline-sm text-on-surface">Dar de alta una cuenta</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-name">Nombre completo</label>
                <input
                  id="um-name"
                  className={inputClass}
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  required
                  placeholder="Ana Torres"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-email">Correo electrónico</label>
                <input
                  id="um-email"
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  placeholder="ana.torres@develop.com.mx"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-role">Rol</label>
                <select
                  id="um-role"
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => updateField("role", e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-dept">Departamento</label>
                <select
                  id="um-dept"
                  className={inputClass}
                  value={form.departmentId}
                  onChange={(e) => updateField("departmentId", e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-team">Equipo (opcional)</label>
                <select
                  id="um-team"
                  className={inputClass}
                  value={form.teamId}
                  onChange={(e) => updateField("teamId", e.target.value)}
                >
                  <option value="">Sin equipo asignado</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="text-label-md text-on-surface">Días laborales</span>
                <div className="flex gap-space-xs">
                  {DAY_OPTIONS.map((day) => {
                    const selected = form.days.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        aria-pressed={selected}
                        className={`motion-press w-9 h-9 rounded-full text-label-md ${
                          selected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-low text-on-surface-variant"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-start">Horario de entrada</label>
                <input
                  id="um-start"
                  type="time"
                  className={inputClass}
                  value={form.startTime}
                  onChange={(e) => updateField("startTime", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="text-label-md text-on-surface" htmlFor="um-end">Horario de salida</label>
                <input
                  id="um-end"
                  type="time"
                  className={inputClass}
                  value={form.endTime}
                  onChange={(e) => updateField("endTime", e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-body-sm text-error animate-pop" role="alert">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
              >
                {creating ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </div>
          </form>

          {/* Contraseña temporal generada */}
          {credentials && (
            <div className="motion-card animate-pop bg-secondary-container p-space-lg flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-on-secondary-container">key</span>
                <h2 className="text-headline-sm text-on-secondary-container">Cuenta creada</h2>
              </div>
              <p className="text-body-md text-on-secondary-container">
                Comparte esta contraseña temporal con <strong>{credentials.email}</strong>.
                Se muestra una sola vez; el colaborador deberá cambiarla en su primer acceso.
              </p>
              <div className="flex items-center gap-space-sm">
                <code className="flex-1 rounded-lg bg-surface-container-lowest px-space-md py-2.5 text-body-lg font-semibold text-on-surface tracking-wider">
                  {credentials.temporaryPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="motion-press rounded-full bg-secondary text-on-secondary px-space-md py-2.5 text-label-md"
                >
                  {copied ? "¡Copiada!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Directorio de usuarios */}
          <div className="motion-card bg-surface-container-lowest p-space-lg animate-enter">
            <h2 className="text-headline-sm text-on-surface mb-space-md">Directorio</h2>
            {users.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Aún no hay cuentas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                      <th className="pb-space-sm pr-space-md">Nombre</th>
                      <th className="pb-space-sm pr-space-md">Correo</th>
                      <th className="pb-space-sm pr-space-md">Departamento</th>
                      <th className="pb-space-sm pr-space-md">Rol</th>
                      <th className="pb-space-sm pr-space-md">Estado</th>
                      <th className="pb-space-sm" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-outline-variant/40">
                        <td className="py-space-sm pr-space-md text-body-md text-on-surface font-medium">
                          {u.displayName || "—"}
                        </td>
                        <td className="py-space-sm pr-space-md text-body-sm text-on-surface-variant">{u.email}</td>
                        <td className="py-space-sm pr-space-md text-body-sm text-on-surface-variant">
                          {departmentName(u.departmentId)}
                        </td>
                        <td className="py-space-sm pr-space-md">
                          <span className="text-label-md px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                            {ROLE_LABELS[u.role] || u.role || "—"}
                          </span>
                        </td>
                        <td className="py-space-sm pr-space-md">
                          <span
                            className={`text-label-md px-space-sm py-1 rounded-full ${
                              u.active === false
                                ? "bg-error-container text-on-error-container"
                                : "bg-success-container text-on-success-container"
                            }`}
                          >
                            {u.active === false ? "Inactivo" : "Activo"}
                          </span>
                        </td>
                        <td className="py-space-sm text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            className="motion-press text-label-md text-primary hover:underline"
                          >
                            {u.active === false ? "Reactivar" : "Desactivar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
