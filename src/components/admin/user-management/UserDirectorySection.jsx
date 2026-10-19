import Avatar from "../../Avatar";
import { EMPLOYMENT_OPTIONS, inputClass, ROLE_LABELS, ROLE_OPTIONS, departmentName, employeeCode, formatDate } from "./userManagementConstants";
import { Icon, IconButton, SectionHeader } from "./UserManagementUi";

export default function UserDirectorySection({ filteredUsers, users, hasFilters, clearFilters, searchTerm, setSearchTerm, departmentFilter, setDepartmentFilter, roleFilter, setRoleFilter, statusFilter, setStatusFilter, allDepartments, directoryError, currentUser, profiles, openEditUser, handleToggleActive, handleResetPassword, handleDeleteUser, deletingUserId }) {
  return (
    <>
          <section className="motion-card keep-card-color bg-surface-container p-space-lg animate-enter">
            <SectionHeader
              title="Directorio de usuarios"

              description={`${filteredUsers.length} de ${users.length} cuentas`}

              aside={
                hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="motion-press inline-flex items-center gap-1 text-label-md text-primary"
                  >
                    <Icon name="filter_alt_off" size={17} />
                    Limpiar filtros
                  </button>
                )
              }
            />

            {/* Filtros compactos en una sola línea en pantallas grandes */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm my-space-md">
              <label className="relative block">
                <span className="sr-only">Buscar por nombre o correo</span>

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Icon name="search" size={17} />
                </span>

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar nombre o correo"
                  className={`${inputClass} pl-9 py-2 text-body-sm w-full`}
                />
              </label>

              <label className="block">
                <span className="sr-only">Filtrar por departamento</span>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className={`${inputClass} py-2 text-body-sm w-full truncate`}
                >
                  <option value="all">Todos los departamentos</option>

                  {allDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                      {department.active === false ? " (inactivo)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Filtrar por rol</span>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`${inputClass} py-2 text-body-sm w-full`}
                >
                  <option value="all">Todos los roles</option>

                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Filtrar por estado</span>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${inputClass} py-2 text-body-sm w-full`}
                >
                  <option value="all">Todos los estados</option>

                  <option value="active">Activos</option>

                  <option value="inactive">Inactivos</option>
                </select>
              </label>
            </div>

            {directoryError && (
              <p
                role="alert"
                className="mb-space-md rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container"
              >
                {directoryError}
              </p>
            )}

            {users.length === 0 ? (
              <p className="py-space-lg text-center text-body-md text-on-surface-variant">
                Aún no hay cuentas registradas. Crea la primera con el formulario de arriba.
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="py-space-lg text-center text-body-md text-on-surface-variant">
                No hay cuentas que coincidan con esos filtros.
              </p>
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
                                <p
                                  className={`break-words text-body-md font-medium ${inactive ? "text-on-surface-variant" : "text-on-surface"}`}
                                >
                                  {u.displayName || "—"}
                                  {isSelf && <span className="ml-2 text-label-sm text-primary">Tú</span>}
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
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-label-md ${inactive ? "bg-error-container text-on-error-container" : "bg-success-container text-on-success-container"}`}
                            >
                              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />

                              {inactive ? "Inactivo" : "Activo"}
                            </span>
                          </td>

                          <td className="px-1 py-space-xs">
                            <div className="flex flex-wrap justify-end gap-0">
                              <IconButton
                                icon="edit"
                                label={`Editar a ${u.displayName || u.email}`}
                                tone="primary"
                                onClick={() => openEditUser(u)}
                                compact
                              />

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

                                label={
                                  isSelf
                                    ? "No puedes eliminar tu propia cuenta"
                                    : `Eliminar a ${u.displayName || u.email}`
                                }

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


    </>
  );
}
