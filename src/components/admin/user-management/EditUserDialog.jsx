import { EMPLOYMENT_OPTIONS, inputClass } from "./userManagementConstants";
import { Field, Icon, IconButton } from "./UserManagementUi";

export default function EditUserDialog({ editingUser, setEditingUser, editForm, setEditForm, handleSaveUser, allDepartments, handleResetPassword, resettingPassword, temporaryCredential, directoryError, savingEdit }) {
  return (
    <>
          {editingUser && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-space-md"
              onClick={() => setEditingUser(null)}
            >
              <section
                role="dialog"

                aria-modal="true"

                aria-labelledby="edit-user-title"

                className="motion-card animate-pop max-h-[90vh] w-full max-w-xl overflow-y-auto bg-surface-container-lowest p-space-lg"

                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-space-md flex items-start justify-between gap-space-sm">
                  <div>
                    <h2 id="edit-user-title" className="text-headline-md text-on-surface">
                      Editar cuenta
                    </h2>

                    <p className="text-body-sm text-on-surface-variant mt-1">
                      Actualiza los datos de acceso y organización.
                    </p>
                  </div>

                  <IconButton icon="close" label="Cerrar" onClick={() => setEditingUser(null)} />
                </div>

                <form onSubmit={handleSaveUser} className="flex flex-col gap-space-md">
                  <Field id="eu-name" label="Nombre completo">
                    <input
                      id="eu-name"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field id="eu-email" label="Correo electrónico">
                    <input
                      id="eu-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field id="eu-employee-id" label="Número de empleado">
                    <input
                      id="eu-employee-id"
                      value={editForm.employeeId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field id="eu-job-title" label="Puesto">
                    <input
                      id="eu-job-title"
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                      className={inputClass}
                      maxLength={100}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <Field id="eu-employment-type" label="Tipo de contratación">
                      <select
                        id="eu-employment-type"
                        value={editForm.employmentType}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, employmentType: e.target.value }))}
                        className={inputClass}
                      >
                        {EMPLOYMENT_OPTIONS.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="eu-hire-date" label="Fecha de ingreso">
                      <input
                        id="eu-hire-date"
                        type="date"
                        value={editForm.hireDate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, hireDate: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field id="eu-dept" label="Departamento">
                    <select
                      id="eu-dept"
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Sin departamento</option>

                      {allDepartments.map((department) => (
                        <option key={department.id} value={department.id} disabled={department.active === false}>
                          {department.name}
                          {department.active === false ? " (inactivo)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="rounded-xl border border-outline-variant p-space-md flex flex-col gap-space-sm">
                    <div>
                      <h3 className="text-label-lg font-semibold text-on-surface">Acceso</h3>

                      <p className="text-body-sm text-on-surface-variant">
                        Genera una nueva contraseña si la persona no puede iniciar sesión.
                      </p>
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

                  {directoryError && (
                    <p role="alert" className="text-body-sm text-error">
                      {directoryError}
                    </p>
                  )}

                  <div className="flex justify-end gap-space-sm border-t border-outline-variant pt-space-md">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="motion-press rounded-full bg-surface-container-low px-space-md py-2.5 text-label-md text-on-surface-variant"
                    >
                      Cerrar
                    </button>

                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="motion-press rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
                    >
                      {savingEdit ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
    </>
  );
}
