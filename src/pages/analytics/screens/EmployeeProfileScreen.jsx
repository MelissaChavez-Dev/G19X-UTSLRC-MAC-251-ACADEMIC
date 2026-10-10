import { useMemo, useState } from "react";

const TABS = [
  { id: "personal", label: "Personal Information" },
  { id: "job", label: "Job Details" },
  { id: "leave", label: "Leave Status" },
  { id: "performance", label: "Performance Feedback" },
];

const DETAIL_CLASS = "border-b border-[#e8e8e8] py-2.5";
const LABEL_CLASS = "text-xs text-[#777]";
const VALUE_CLASS = "mt-0.5 text-sm font-semibold text-[#292929]";

function Detail({ label, value }) {
  return (
    <div className={DETAIL_CLASS}>
      <p className={LABEL_CLASS}>{label}</p>
      <p className={VALUE_CLASS}>{value || "—"}</p>
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
      <div className="flex min-h-64 items-center justify-center bg-white p-6 text-sm text-[#666] shadow-sm">
        No hay empleados reales cargados en Firestore. Importa un archivo HR para consultar perfiles.
      </div>
    );
  }

  const totalLeaveDays = employeeLeaves.reduce((sum, leave) => sum + (Number(leave.days) || 0), 0);

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-h-[620px] flex-col bg-[#ffdda0] shadow-[0_5px_14px_rgba(0,0,0,0.18)]">
        <div className={`px-4 py-2 text-center text-sm font-bold text-white ${employee.status === "Active" ? "bg-[#45c878]" : "bg-[#b65b50]"}`}>
          {employee.status || "Sin estado"}
        </div>
        <div className="px-4 pb-4 pt-3">
          <label className="mb-1 block text-[11px] font-semibold text-[#555]" htmlFor="profile-search">Employee ID / Nombre</label>
          <input
            id="profile-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar colaborador…"
            className="mb-2 w-full border border-[#d2c39e] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#d1aa00]"
          />
          <select
            aria-label="Seleccionar empleado"
            value={employee.employeeId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full border border-[#d2c39e] bg-white px-2.5 py-2 text-xs text-[#333] outline-none focus:border-[#d1aa00]"
          >
            {filteredEmployees.map((item) => (
              <option key={item.employeeId} value={item.employeeId}>
                {item.employeeId} · {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-[#f28a35] text-white">
          <span className="material-symbols-outlined text-[112px]" aria-hidden="true">person</span>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-5 py-5">
          <div>
            <p className="text-[11px] text-[#796b52]">Employee ID</p>
            <p className="text-sm font-semibold text-[#292929]">{employee.employeeId}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#796b52]">Name</p>
            <p className="text-base font-semibold text-[#292929]">{employee.name}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#796b52]">Designation</p>
            <p className="text-sm font-semibold text-[#292929]">{employee.designation || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#796b52]">Department</p>
            <p className="text-sm font-semibold text-[#292929]">{employee.department || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#796b52]">Risk orientation · no diagnóstico individual</p>
            <p className="text-sm font-semibold text-[#292929]">
              {Number.isFinite(Number(employee.riskProbability))
                ? `${(Number(employee.riskProbability) * 100).toFixed(0)}% · ${employee.riskLevel || "Sin nivel"}`
                : "Sin estimación"}
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-2">
        <nav className="grid grid-cols-2 gap-1 bg-white shadow-sm sm:grid-cols-4" aria-label="Secciones del perfil">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-14 border-b-4 px-2 py-2 text-center text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-[#edc400] bg-[#f5f5f5] text-[#272727]"
                  : "border-transparent bg-[#f7f7f7] text-[#666] hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[566px] bg-white p-4 shadow-[0_5px_14px_rgba(0,0,0,0.16)] sm:p-6">
          {activeTab === "personal" && (
            <div className="grid h-full gap-6 md:grid-cols-2">
              <div className="grid content-start gap-x-8 md:grid-cols-2">
                <Detail label="Name" value={employee.name} />
                <Detail label="Date of Birth" value={employee.dob} />
                <Detail label="Gender" value={employee.gender} />
                <Detail label="Marital Status" value={employee.maritalStatus} />
                <Detail label="Education" value={employee.education} />
                <Detail label="Generation" value={employee.generation} />
              </div>
              <div className="flex min-h-64 flex-col items-center justify-center border border-[#e4e4e4] bg-[#f7f7f7] p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-[#b4a15a]" aria-hidden="true">public</span>
                <p className="mt-2 text-sm font-semibold text-[#444]">Native Country</p>
                <p className="mt-1 text-lg text-[#d0aa00]">{employee.nativeCountry || "No especificado"}</p>
                <p className="text-xs text-[#777]">{employee.region || "—"} · {employee.location || "—"}</p>
              </div>
            </div>
          )}

          {activeTab === "job" && (
            <div className="grid content-start gap-x-8 md:grid-cols-2">
              <Detail label="Designation" value={employee.designation} />
              <Detail label="Department" value={employee.department} />
              <Detail label="Business Unit" value={employee.businessUnit} />
              <Detail label="Organization Level" value={employee.orgLevel} />
              <Detail label="Hire Type" value={employee.hireType} />
              <Detail label="Hire Date" value={employee.hireDate} />
              <Detail label="Shift" value={employee.shift} />
              <Detail label="Tenure" value={`${employee.tenureYears ?? "—"} years · ${employee.tenureBand || "—"}`} />
              {employee.status === "Terminated" && (
                <>
                  <Detail label="Termination Date" value={employee.terminationDate} />
                  <Detail label="Termination Category / Reason" value={`${employee.terminationCategory || "—"} · ${employee.terminationReason || "—"}`} />
                </>
              )}
            </div>
          )}

          {activeTab === "leave" && (
            <div>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[#333]">Leave Status</h3>
                  <p className="text-xs text-[#777]">{employeeLeaves.length} registros · {totalLeaveDays} días totales</p>
                </div>
              </div>
              {employeeLeaves.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center bg-[#f7f7f7] text-sm text-[#777]">
                  Sin licencias registradas en Firestore para este empleado.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#e2e2e2]">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#edc400] text-[#2a2a2a]">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-3 py-2.5">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeLeaves.map((leave, index) => (
                        <tr key={leave.id || index} className="border-t border-[#e5e5e5] odd:bg-white even:bg-[#f5f5f5]">
                          <td className="px-3 py-2">{String(leave.date || "—")}</td>
                          <td className="px-3 py-2">{leave.type === "Sick" ? "Sick" : "Annual"}</td>
                          <td className="px-3 py-2">{leave.days ?? "—"}</td>
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
              <Detail label="Performance Rating" value={employee.performanceRating} />
              <Detail label="Review / Source" value={employee.source || "Firestore"} />
              <Detail
                label="Risk Probability · Orientative only"
                value={Number.isFinite(Number(employee.riskProbability))
                  ? `${(Number(employee.riskProbability) * 100).toFixed(0)}%`
                  : "Not available"}
              />
              <Detail label="Risk Level" value={employee.riskLevel || "Not available"} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
