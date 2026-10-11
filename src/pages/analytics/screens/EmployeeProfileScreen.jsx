import { useMemo, useState } from "react";

const TABS = [
  { id: "personal", label: "Información personal" },
  { id: "job", label: "Datos del puesto" },
  { id: "leave", label: "Licencias" },
  { id: "performance", label: "Desempeño" },
];

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const FIELD =
  `w-full rounded-xl bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none ${FOCUS}`;

function Detail({ label, value }) {
  return (
    <div className="py-2.5">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="mt-0.5 text-body-md font-semibold text-on-surface">{value || "—"}</p>
    </div>
  );
}

function SideField({ label, value, big = false }) {
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className={`${big ? "text-body-lg" : "text-body-md"} font-semibold text-on-surface`}>{value || "—"}</p>
    </div>
  );
}

export default function EmployeeProfileScreen({ employees = [], leaves = [] }) {
  const [selectedId, setSelectedId] = useState(employees[0]?.employeeId || "");
  const [activeTab, setActiveTab] = useState("personal");
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return employees
      .filter((employee) => !normalizedSearch ||
        String(employee.name || "").toLocaleLowerCase().includes(normalizedSearch) ||
        String(employee.employeeId || "").toLocaleLowerCase().includes(normalizedSearch))
      .slice(0, 100);
  }, [employees, search]);

  const employee = useMemo(
    () => employees.find((item) => item.employeeId === selectedId) || filteredEmployees[0] || null,
    [employees, selectedId, filteredEmployees]
  );
  const employeeLeaves = useMemo(
    () => employee ? leaves
      .filter((leave) => leave.employeeId === employee.employeeId)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))) : [],
    [employee, leaves]
  );

  if (!employee) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl bg-surface-container-low p-space-lg text-body-sm text-on-surface-variant">
        No hay empleados reales cargados en Firestore. Importa un archivo HR para consultar perfiles.
      </div>
    );
  }

  const totalLeaveDays = employeeLeaves.reduce((sum, leave) => sum + (Number(leave.days) || 0), 0);
  const isActive = employee.status === "Active";
  const hasRisk = Number.isFinite(Number(employee.riskProbability));

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-space-md lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Ficha lateral */}
      <aside className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl bg-primary-container/50">
        <div
          className={`px-4 py-2.5 text-center text-label-lg font-semibold ${
            isActive ? "bg-primary text-on-primary" : "bg-error-container text-on-error-container"
          }`}
        >
          {isActive ? "Activo" : employee.status || "Sin estado"}
        </div>

        <div className="flex flex-col gap-2 px-5 pt-4">
          <label className="text-label-sm text-on-surface-variant" htmlFor="profile-search">
            ID de empleado o nombre
          </label>
          <input
            id="profile-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar colaborador…"
            className={FIELD}
          />
          <select
            aria-label="Seleccionar empleado"
            value={employee.employeeId}
            onChange={(event) => setSelectedId(event.target.value)}
            className={FIELD}
          >
            {filteredEmployees.map((item) => (
              <option key={item.employeeId} value={item.employeeId}>
                {item.employeeId} · {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
          <span className="material-symbols-outlined text-[96px]" aria-hidden="true">person</span>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 px-5 py-5">
          <SideField label="ID de empleado" value={employee.employeeId} />
          <SideField label="Nombre" value={employee.name} big />
          <SideField label="Puesto" value={employee.designation} />
          <SideField label="Departamento" value={employee.department} />
          <SideField
            label="Orientación de riesgo · no es un diagnóstico individual"
            value={hasRisk ? `${(Number(employee.riskProbability) * 100).toFixed(0)}% · ${employee.riskLevel || "Sin nivel"}` : "Sin estimación"}
          />
        </div>
      </aside>

      {/* Contenido */}
      <section className="flex min-w-0 flex-col gap-space-sm">
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Secciones del perfil">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-14 rounded-2xl px-3 py-2 text-center text-label-lg font-semibold transition-colors ${FOCUS} ${
                activeTab === tab.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-primary-container/60 hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[560px] rounded-3xl bg-surface-container-low p-space-lg">
          {activeTab === "personal" && (
            <div className="grid h-full gap-space-lg md:grid-cols-2">
              <div className="grid content-start gap-x-8 md:grid-cols-2">
                <Detail label="Nombre" value={employee.name} />
                <Detail label="Fecha de nacimiento" value={employee.dob} />
                <Detail label="Género" value={employee.gender} />
                <Detail label="Estado civil" value={employee.maritalStatus} />
                <Detail label="Educación" value={employee.education} />
                <Detail label="Generación" value={employee.generation} />
              </div>
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl bg-primary-container/40 p-space-lg text-center">
                <span className="material-symbols-outlined text-6xl text-primary" aria-hidden="true">public</span>
                <p className="mt-2 text-body-md font-semibold text-on-surface">País de origen</p>
                <p className="mt-1 text-headline-sm font-semibold text-primary">{employee.nativeCountry || "No especificado"}</p>
                <p className="text-body-sm text-on-surface-variant">{employee.region || "—"} · {employee.location || "—"}</p>
              </div>
            </div>
          )}

          {activeTab === "job" && (
            <div className="grid content-start gap-x-8 md:grid-cols-2">
              <Detail label="Puesto" value={employee.designation} />
              <Detail label="Departamento" value={employee.department} />
              <Detail label="Unidad de negocio" value={employee.businessUnit} />
              <Detail label="Nivel organizacional" value={employee.orgLevel} />
              <Detail label="Tipo de contratación" value={employee.hireType} />
              <Detail label="Fecha de ingreso" value={employee.hireDate} />
              <Detail label="Turno" value={employee.shift} />
              <Detail label="Antigüedad" value={`${employee.tenureYears ?? "—"} años · ${employee.tenureBand || "—"}`} />
              {employee.status === "Terminated" && (
                <>
                  <Detail label="Fecha de baja" value={employee.terminationDate} />
                  <Detail label="Categoría / motivo de baja" value={`${employee.terminationCategory || "—"} · ${employee.terminationReason || "—"}`} />
                </>
              )}
            </div>
          )}

          {activeTab === "leave" && (
            <div>
              <div className="mb-3">
                <h3 className="text-headline-sm font-semibold text-on-surface">Licencias</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {employeeLeaves.length} registros · {totalLeaveDays} días totales
                </p>
              </div>
              {employeeLeaves.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl bg-surface-container-lowest text-body-sm text-on-surface-variant">
                  Sin licencias registradas en Firestore para este empleado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-surface-container-lowest">
                  <table className="min-w-full text-left text-body-sm">
                    <thead className="bg-primary-container text-on-primary-container">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                        <th className="px-4 py-3 font-semibold">Tipo</th>
                        <th className="px-4 py-3 font-semibold">Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeLeaves.map((leave, index) => (
                        <tr key={leave.id || index} className="even:bg-surface-container-low/60">
                          <td className="px-4 py-2.5">{String(leave.date || "—")}</td>
                          <td className="px-4 py-2.5">{leave.type === "Sick" ? "Enfermedad" : "Anual"}</td>
                          <td className="px-4 py-2.5">{leave.days ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "performance" && (
            <div className="grid content-start gap-x-8 md:grid-cols-2">
              <Detail label="Calificación de desempeño" value={employee.performanceRating} />
              <Detail label="Origen del registro" value={employee.source || "Firestore"} />
              <Detail
                label="Probabilidad de riesgo · solo orientativa"
                value={hasRisk ? `${(Number(employee.riskProbability) * 100).toFixed(0)}%` : "No disponible"}
              />
              <Detail label="Nivel de riesgo" value={employee.riskLevel || "No disponible"} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}