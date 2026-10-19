import { DAY_OPTIONS, EMPLOYMENT_OPTIONS, ROLE_OPTIONS, accountInputClass } from "./userManagementConstants";
import { Icon, Field, SectionHeader } from "./UserManagementUi";

export default function EmployeeAccountForm({ form, updateField, handleCreate, creating, departments, teams, toggleDay, error }) {
  return (
    <>
          <form
            onSubmit={handleCreate}
            className="motion-card animate-enter flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6 lg:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20"
          >
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
                  <input
                    id="um-name"
                    className={accountInputClass}
                    value={form.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
                    required
                    placeholder="Ana Torres"
                  />
                </Field>

                <Field id="um-email" label="Correo electrónico">
                  <input
                    id="um-email"
                    type="email"
                    className={accountInputClass}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                    placeholder="persona@empresa.example"
                  />
                </Field>

                <Field id="um-employee-id" label="Número de empleado (opcional)">
                  <input
                    id="um-employee-id"
                    className={accountInputClass}
                    value={form.employeeId}
                    onChange={(e) => updateField("employeeId", e.target.value)}
                    placeholder="Automático si se deja vacío"
                  />
                </Field>

                <Field id="um-job-title" label="Puesto">
                  <input
                    id="um-job-title"
                    className={accountInputClass}
                    value={form.jobTitle}
                    onChange={(e) => updateField("jobTitle", e.target.value)}
                    placeholder="Analista"
                    maxLength={100}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="um-employment-type" label="Tipo de contratación">
                    <select
                      id="um-employment-type"
                      className={accountInputClass}
                      value={form.employmentType}
                      onChange={(e) => updateField("employmentType", e.target.value)}
                    >
                      {EMPLOYMENT_OPTIONS.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="um-hire-date" label="Fecha de ingreso">
                    <input
                      id="um-hire-date"
                      type="date"
                      className={accountInputClass}
                      value={form.hireDate}
                      onChange={(e) => updateField("hireDate", e.target.value)}
                    />
                  </Field>
                </div>

                <Field id="um-role" label="Rol">
                  <select
                    id="um-role"
                    className={accountInputClass}
                    value={form.role}
                    onChange={(e) => updateField("role", e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
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
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="um-team" label="Equipo (opcional)">
                    <select
                      id="um-team"
                      className={accountInputClass}
                      value={form.teamId}
                      onChange={(e) => updateField("teamId", e.target.value)}
                    >
                      <option value="">Sin equipo asignado</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="um-start" label="Hora de entrada">
                    <input
                      id="um-start"
                      type="time"
                      className={accountInputClass}
                      value={form.startTime}
                      onChange={(e) => updateField("startTime", e.target.value)}
                    />
                  </Field>

                  <Field id="um-end" label="Hora de salida">
                    <input
                      id="um-end"
                      type="time"
                      className={accountInputClass}
                      value={form.endTime}
                      onChange={(e) => updateField("endTime", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="mt-auto flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Días laborales
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      Selecciona los días habituales de trabajo
                    </span>
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

            {error && (
              <p
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-pop dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Los campos obligatorios están marcados en el formulario.
              </p>
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


    </>
  );
}
