import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Avatar from "../../components/Avatar";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { useAttendance } from "../../hooks/useAttendance";
import { useDepartments } from "../../hooks/useDepartments";
import { useProfiles } from "../../hooks/useProfiles";
import { useSidebarState } from "../../hooks/useSidebarState";
import {
  classifyAttendance,
  classifyDailyAttendance,
  formatLocalDateInTimeZone,
  isMexicanPublicHoliday,
} from "../../utils/leaveUtils";

const DEFAULT_WORK_DAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const STATUS_CONFIG = {
  present: { label: "Actividad registrada", color: "bg-success-container text-on-success-container" },
  justified_absence: { label: "Permiso justificado", color: "bg-secondary-container text-on-secondary-container" },
  unjustified_absence: { label: "Sin actividad digital", color: "bg-error-container text-on-error-container" },
  in_progress: { label: "Horario en curso", color: "bg-warning-container text-on-warning-container" },
  no_record: { label: "Sin registro", color: "bg-surface-container text-on-surface-variant" },
};

function monthKey(date) {
  return date.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 15).toLocaleDateString("es-MX", { month: "short" });
}

function departmentName(id, departments) {
  return departments.find((department) => department.id === id)?.name || id || "—";
}

function StatCard({ icon, label, value, tone }) {
  const tones = {
    success: "bg-success-container text-on-success-container",
    secondary: "bg-secondary-container text-on-secondary-container",
    error: "bg-error-container text-on-error-container",
    warning: "bg-warning-container text-on-warning-container",
    neutral: "bg-surface-container text-on-surface-variant",
  };
  return (
    <div className={`flex flex-col gap-space-xs rounded-2xl p-space-md ${tones[tone]}`}>
      <span className="flex items-center gap-space-xs text-label-md font-semibold">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{icon}</span>
        {label}
      </span>
      <span className="text-headline-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

export default function Attendance() {
  const { collapsed } = useSidebarState();
  const { employees, records, leaveRequests, loading, error } = useAttendance();
  const { departments } = useDepartments();
  const { profiles } = useProfiles();
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDateInTimeZone());
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");

  const today = formatLocalDateInTimeZone();
  const recordByUserDate = new Map(records.map((record) => [`${record.userId}:${record.date}`, record]));
  const selectedDay = new Date(`${selectedDate}T00:00:00Z`).getUTCDay();
  const weekdayKey = WEEKDAY_KEYS[selectedDay];
  const holiday = isMexicanPublicHoliday(selectedDate);
  const weekdayLabel = new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString("es-MX", {
    weekday: "long",
    timeZone: "UTC",
  });

  const rows = employees
    .filter((employee) => departmentFilter === "all" || employee.departmentId === departmentFilter)
    .filter((employee) => `${employee.displayName || ""} ${employee.employeeId || ""} ${employee.jobTitle || ""}`
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es")))
    .map((employee) => {
      const scheduleDays = employee.workSchedule?.days || DEFAULT_WORK_DAYS;
      const isScheduled = scheduleDays.includes(weekdayKey) && !holiday;
      const record = recordByUserDate.get(`${employee.id}:${selectedDate}`);
      const approvedLeaves = leaveRequests.filter(
        (leave) => leave.userId === employee.id && leave.status === "approved"
      );
      const status = classifyDailyAttendance({
        date: selectedDate,
        today,
        scheduled: isScheduled,
        record,
        approvedLeaves,
      });
      return { ...employee, record, status, scheduled: isScheduled };
    })
    .filter((employee) => employee.scheduled);

  const daySummary = {
    present: rows.filter((row) => row.status === "present").length,
    justified: rows.filter((row) => row.status === "justified_absence").length,
    unjustified: rows.filter((row) => row.status === "unjustified_absence").length,
    inProgress: rows.filter((row) => row.status === "in_progress").length,
    noRecord: rows.filter((row) => row.status === "no_record").length,
  };

  const monthlyTrend = useMemo(() => {
    const months = [];
    const [year, monthNumber] = formatLocalDateInTimeZone().slice(0, 7).split("-").map(Number);
    for (let offset = 5; offset >= 0; offset -= 1) {
      const month = new Date(year, monthNumber - 1 - offset, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, month: monthLabel(key), present: 0, justified: 0, unjustified: 0 });
    }
    const byMonth = new Map(months.map((month) => [month.key, month]));
    const employeeDepartmentById = new Map(employees.map((employee) => [employee.id, employee.departmentId]));
    records.forEach((record) => {
      if (!record.workDay || isMexicanPublicHoliday(record.date) || !byMonth.has(monthKey(record.date))) return;
      const recordDepartmentId = record.departmentId || employeeDepartmentById.get(record.userId);
      if (departmentFilter !== "all" && recordDepartmentId !== departmentFilter) return;
      const result = byMonth.get(monthKey(record.date));
      const approvedLeaves = leaveRequests.filter(
        (leave) => leave.userId === record.userId
          && leave.status === "approved"
          && (departmentFilter === "all" || leave.departmentId === departmentFilter)
      );
      const status = classifyAttendance(record, approvedLeaves);
      if (status === "present") result.present += 1;
      if (status === "justified_absence") result.justified += 1;
      if (status === "unjustified_absence") result.unjustified += 1;
    });
    return months;
  }, [departmentFilter, employees, leaveRequests, records]);

  const statusCounts = Object.values(daySummary).reduce((sum, value) => sum + value, 0);

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-space-lg px-space-xl py-space-lg">
          <header className="flex flex-wrap items-end justify-between gap-space-md">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                Registro digital de actividad
              </span>
              <h1 className="mt-space-sm text-headline-xl text-on-surface">Asistencia</h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Proxy de actividad en la plataforma durante el horario configurado; no mide asistencia física, horas trabajadas ni productividad.
              </p>
            </div>
            <label className="flex flex-col gap-space-xs text-label-sm text-on-surface-variant">
              Fecha
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-full border border-outline-variant bg-surface-container-low px-space-md py-2 text-label-md text-on-surface"
              />
            </label>
          </header>

          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon="person_check" label="Con actividad registrada" value={daySummary.present} tone="success" />
            <StatCard icon="event_available" label="Permisos justificados" value={daySummary.justified} tone="secondary" />
            <StatCard icon="person_off" label="Sin actividad digital" value={daySummary.unjustified} tone="error" />
            <StatCard icon="schedule" label="Horario en curso" value={daySummary.inProgress} tone="warning" />
            <StatCard icon="help" label="Sin registro" value={daySummary.noRecord} tone="neutral" />
          </div>

          <section className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-lg">
            <div>
              <h2 className="text-headline-sm text-on-surface">Actividad digital por mes</h2>
              <p className="text-body-sm text-on-surface-variant">Últimos seis meses · las jornadas sin actividad se separan de los permisos aprobados; “sin registro” no se cuenta como ausencia confirmada.</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--on-surface-variant)", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--on-surface-variant)", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="present" name="Actividad registrada" stackId="attendance" fill="var(--success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="justified" name="Permiso justificado" stackId="attendance" fill="var(--secondary)" />
                  <Bar dataKey="unjustified" name="Sin actividad digital" stackId="attendance" fill="var(--error)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg">
            <div className="flex flex-wrap items-end justify-between gap-space-sm">
              <div>
                <h2 className="text-headline-sm text-on-surface">Registro diario</h2>
                <p className="text-body-sm text-on-surface-variant">
                  {weekdayLabel} · {formatDateForDisplay(selectedDate)}
                  {holiday ? " · Feriado oficial" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-space-sm">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar colaborador"
                  aria-label="Buscar colaborador"
                  className="w-56 rounded-full border border-outline-variant bg-surface-container-low px-space-md py-2 text-body-sm text-on-surface"
                />
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  aria-label="Filtrar por departamento"
                  className="rounded-full border border-outline-variant bg-surface-container-low px-space-md py-2 text-body-sm text-on-surface"
                >
                  <option value="all">Todos los departamentos</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">No se pudo cargar la asistencia. Revisa la conexión y los permisos.</p>}
            {loading ? (
              <div role="status" className="h-32 animate-shimmer rounded-xl" />
            ) : rows.length === 0 || statusCounts === 0 ? (
              <p className="rounded-xl border border-dashed border-outline-variant px-space-md py-space-lg text-center text-body-sm text-on-surface-variant">
                No hay jornadas programadas para esta fecha y filtro.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-surface-container-lowest">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                      <th className="px-space-md py-space-sm">Colaborador</th>
                      <th className="px-space-md py-space-sm">N.º empleado</th>
                      <th className="px-space-md py-space-sm">Puesto</th>
                      <th className="px-space-md py-space-sm">Departamento</th>
                      <th className="px-space-md py-space-sm">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {rows.map((employee) => (
                      <tr key={employee.id} className="hover:bg-surface-container-low">
                        <td className="px-space-md py-space-sm">
                          <span className="flex items-center gap-space-sm">
                            <Avatar
                              name={employee.displayName}
                              photoURL={profiles[employee.id]?.photoURL}
                              size={36}
                            />
                            <span className="font-medium text-on-surface">{employee.displayName || "—"}</span>
                          </span>
                        </td>
                        <td className="px-space-md py-space-sm font-mono text-label-md text-on-surface-variant">
                          {employee.employeeId || `EMP-${employee.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td className="px-space-md py-space-sm text-body-sm text-on-surface-variant">{employee.jobTitle || "—"}</td>
                        <td className="px-space-md py-space-sm text-body-sm text-on-surface-variant">{departmentName(employee.departmentId, departments)}</td>
                        <td className="px-space-md py-space-sm">
                          <span className={`rounded-full px-space-sm py-1 text-label-sm ${STATUS_CONFIG[employee.status]?.color || STATUS_CONFIG.no_record.color}`}>
                            {STATUS_CONFIG[employee.status]?.label || STATUS_CONFIG.no_record.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function formatDateForDisplay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
