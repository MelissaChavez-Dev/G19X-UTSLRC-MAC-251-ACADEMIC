import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getDepartmentColor, UNASSIGNED_DEPARTMENT_COLOR } from "./userManagementConstants";
import { Icon, IconButton } from "./UserManagementUi";

export default function DepartmentManagementSection({ allDepartments, departmentDistribution, totalDepartmentEmployees, unassignedCount, newDepartmentName, setNewDepartmentName, handleCreateDepartment, departmentError, setDepartmentError, editingDepartmentId, editingDepartmentName, setEditingDepartmentId, setEditingDepartmentName, handleRenameDepartment, handleToggleDepartment }) {
  return (
    <>
          <section className="motion-card keep-card-color flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm animate-enter sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-on-surface">
                  Distribución y gestión de departamentos
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  Consulta cuántos colaboradores pertenecen a cada área y administra sus departamentos desde un solo
                  lugar.
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

            {departmentError && (
              <p
                role="alert"
                className="rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container"
              >
                {departmentError}
              </p>
            )}
            <div className="h-px bg-surface-container" />

            {/* Resumen visual: leyenda y gráfica circular */}
            <div className="grid grid-cols-1 items-center gap-5 rounded-2xl border border-outline-variant bg-surface-container-low p-4 lg:grid-cols-[minmax(0,1fr)_250px] sm:p-5">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-on-surface">Colaboradores por departamento</h3>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  Distribución de cuentas activas de colaboradores.
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
                            inactive
                              ? "border-outline-variant bg-surface-container-high"
                              : "border-outline-variant bg-surface-container-lowest"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {editingDepartmentId === department.id ? (
                            <form onSubmit={handleRenameDepartment} className="flex min-w-0 flex-1 items-center gap-1">
                              <input
                                autoFocus
                                value={editingDepartmentName}
                                onChange={(e) => setEditingDepartmentName(e.target.value)}
                                aria-label="Editar nombre del departamento"
                                className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="submit"
                                aria-label="Guardar nombre"
                                title="Guardar"
                                className="rounded-lg p-1.5 text-success transition hover:bg-success-container"
                              >
                                <Icon name="check" size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label="Cancelar edición"
                                title="Cancelar"
                                onClick={() => {
                                  setEditingDepartmentId(null);
                                  setEditingDepartmentName("");
                                }}
                                className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container"
                              >
                                <Icon name="close" size={16} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block truncate text-xs font-medium ${inactive ? "text-on-surface-variant" : "text-on-surface"}`}
                                >
                                  {department.name}
                                </span>
                                <span className="block text-[11px] text-on-surface-variant">
                                  {inactive ? "Inactivo" : `${percentage}% del total`}
                                </span>
                              </span>
                              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-container-low px-2 text-xs font-semibold tabular-nums text-on-surface">
                                {count}
                              </span>
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
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: UNASSIGNED_DEPARTMENT_COLOR }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-on-surface">Sin departamento</span>
                          <span className="block text-[11px] text-on-surface-variant">Sin área asignada</span>
                        </span>
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-container-low px-2 text-xs font-semibold tabular-nums text-on-surface">
                          {unassignedCount}
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {departmentDistribution.length > 0 && (
                <div className="flex flex-col items-center">
                  <div
                    className="relative h-56 w-full max-w-[250px]"
                    role="img"
                    aria-label="Gráfica circular de colaboradores por departamento"
                  >
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
                            <Cell key={department.id} fill={getDepartmentColor(department.id, allDepartments)} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => [value, item?.payload?.name || "Colaboradores"]}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid var(--color-outline-variant, #64748b)",
                            backgroundColor: "var(--color-surface-container-lowest, #fff)",
                            color: "var(--color-on-surface, #111827)",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                        Total
                      </span>
                      <span className="mt-1 text-3xl font-bold tracking-tight text-on-surface">
                        {totalDepartmentEmployees}
                      </span>
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
              <span className="text-lg font-bold tabular-nums text-on-secondary-container">
                {totalDepartmentEmployees}
              </span>
            </div>
          </section>

          {/* Alta de usuario */}

    </>
  );
}
