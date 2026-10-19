import { useMemo, useRef, useState } from "react";

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
import LeaveDetailModal from "../../components/LeaveDetailModal";
import Sidebar from "../../components/Sidebar";

import TopBar from "../../components/TopBar";

import { useDepartments } from "../../hooks/useDepartments";

import { useLeaves } from "../../hooks/useLeaves";
import { useHeadcount } from "../../hooks/useHeadcount";

import { useProfiles } from "../../hooks/useProfiles";

import { useSidebarState } from "../../hooks/useSidebarState";

import { LEAVE_STATUS, LEAVE_TYPES, reviewLeaveRequest } from "../../services/leaveService";

import {

  countBusinessDays,

  formatLocalDateInTimeZone,

  getMexicanHolidays,

  isCoveredByApprovedLeave,

} from "../../utils/leaveUtils";



const FILTERS = [

  { id: "pending", label: "Pendientes" },

  { id: "approved", label: "Aprobadas" },

  { id: "rejected", label: "Rechazadas" },

  { id: "all", label: "Todas" },

];



function formatDate(value) {

  if (!value) return "—";

  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



function departmentName(id, departments) {

  return departments.find((department) => department.id === id)?.name || id || "—";

}



function monthBuckets() {

  const buckets = [];

  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {

    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    buckets.push({

      key,

      month: date.toLocaleDateString("es-MX", { month: "short" }),

      vacations: 0,

      sick: 0,

      other: 0,

    });

  }

  return buckets;

}



function businessDaysInMonth(request, month) {

  const [year, monthNumber] = month.key.split("-").map(Number);

  const firstDay = `${month.key}-01`;

  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);

  const startDate = request.startDate > firstDay ? request.startDate : firstDay;

  const endDate = request.endDate < lastDay ? request.endDate : lastDay;

  return startDate <= endDate ? countBusinessDays(startDate, endDate) : 0;

}



export default function LeaveManagement() {

  const { collapsed } = useSidebarState();

  const { requests, loading, error: loadError } = useLeaves();

  const { departments } = useDepartments();

  const { profiles } = useProfiles();
  const { forDepartment } = useHeadcount();

  const [statusFilter, setStatusFilter] = useState("pending");

  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [search, setSearch] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(() => {

    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);

  });

  const [reviewingId, setReviewingId] = useState(null);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");
  const [modalState, setModalState] = useState(null);
  const returnFocusRef = useRef(null);



  const pendingCount = requests.filter((request) => request.status === "pending").length;



  const chartData = useMemo(() => {

    const buckets = monthBuckets();

    requests.filter((request) => request.status === "approved").forEach((request) => {

      const typeKey = request.type === "annual" ? "vacations" : request.type;

      if (!["vacations", "sick", "other"].includes(typeKey)) return;

      buckets.forEach((bucket) => {

        bucket[typeKey] += businessDaysInMonth(request, bucket);

      });

    });

    return buckets;

  }, [requests]);

  const calendarData = useMemo(() => {

    const year = calendarMonth.getFullYear();

    const month = calendarMonth.getMonth();

    const first = new Date(year, month, 1);

    const offset = (first.getDay() + 6) % 7;

    const totalDays = new Date(year, month + 1, 0).getDate();

    const holidays = getMexicanHolidays(year);

    const approved = requests.filter((request) => request.status === "approved");

    const days = Array.from({ length: Math.ceil((offset + totalDays) / 7) * 7 }, (_, index) => {

      const dayNumber = index - offset + 1;

      if (dayNumber < 1 || dayNumber > totalDays) return null;

      const date = formatLocalDateInTimeZone(new Date(year, month, dayNumber, 12));

      return {

        date,

        dayNumber,

        holiday: holidays.has(date),

        leaves: approved.filter((request) => isCoveredByApprovedLeave(date, [request])).length,

      };

    });

    return {

      label: calendarMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),

      days,

    };

  }, [calendarMonth, requests]);



  const normalizedSearch = search.trim().toLocaleLowerCase("es");

  const filteredRequests = requests.filter((request) => {

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    const matchesDepartment = departmentFilter === "all" || request.departmentId === departmentFilter;

    const matchesSearch = !normalizedSearch

      || `${request.employeeName || ""} ${request.employeeId || ""} ${request.reason || ""}`

        .toLocaleLowerCase("es")

        .includes(normalizedSearch);

    return matchesStatus && matchesDepartment && matchesSearch;

  });

  const pendingQueue = filteredRequests.filter((request) => request.status === "pending");
  const modalRequest = modalState
    ? requests.find((request) => request.id === modalState.request.id) || modalState.request
    : null;

  function openRequest(request, mode, trigger) {
    returnFocusRef.current = trigger;
    setError("");
    setNotice("");
    setModalState({ request, initialMode: mode });
  }

  function closeRequest() {
    if (reviewingId) return;
    setModalState(null);
    setError("");
    setTimeout(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }, 0);
  }

  async function handleReview(request, status, reviewNote = "") {
    setReviewingId(request.id);
    setError("");
    setNotice("");
    try {
      await reviewLeaveRequest(request.id, { status, reviewNote });
      setNotice(status === "approved" ? "Solicitud aprobada." : "Solicitud rechazada.");
      const currentIndex = pendingQueue.findIndex((item) => item.id === request.id);
      const nextRequest = currentIndex < 0
        ? pendingQueue[0]
        : pendingQueue[currentIndex + 1] || [...pendingQueue.slice(0, currentIndex)].at(-1);
      if (nextRequest) {
        setModalState({ request: nextRequest, initialMode: "view" });
      } else {
        setModalState(null);
        setTimeout(() => {
          if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
          returnFocusRef.current = null;
        }, 0);
      }
    } catch (reviewError) {
      console.error("No se pudo resolver la solicitud de permiso:", reviewError);
      setError(reviewError.message || "No se pudo guardar la resolución.");

    } finally {

      setReviewingId(null);

    }

  }



  const leaveTypeCounts = [
    { id: "annual", label: "Vacaciones", count: requests.filter((request) => request.type === "annual" && request.status === "approved").length, color: "bg-primary" },
    { id: "sick", label: "Incapacidad", count: requests.filter((request) => request.type === "sick" && request.status === "approved").length, color: "bg-secondary" },
    { id: "other", label: "Otros permisos", count: requests.filter((request) => !["annual", "sick"].includes(request.type) && request.status === "approved").length, color: "bg-tertiary" },
  ];

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-5 py-6 xl:px-8">
          <header className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 flex items-center gap-2 text-label-sm font-medium text-secondary"><span className="h-2 w-2 rounded-full bg-secondary" /> RECURSOS HUMANOS <span className="text-outline">/</span> CONTROL DE AUSENCIAS</p>
              <h1 className="text-headline-xl font-semibold tracking-tight text-on-surface sm:text-display-sm">Gestión de permisos</h1>
              <p className="mt-1 text-body-md text-on-surface-variant">Administra las solicitudes y mantén la disponibilidad del equipo bajo control.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-tertiary/40 bg-tertiary-container px-4 py-3 text-on-tertiary-container">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary text-on-tertiary"><span aria-hidden="true" className="material-symbols-outlined">pending_actions</span></span>
              <div><p className="text-label-sm">Requieren tu atención</p><p className="text-headline-md font-bold tabular-nums">{pendingCount} <span className="text-body-sm font-medium">pendientes</span></p></div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)_minmax(230px,0.65fr)]">
            <article className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-title-lg font-semibold text-on-surface">Resumen de ausencias</h2><p className="mt-1 text-body-sm text-on-surface-variant">Días aprobados durante los últimos seis meses</p></div>
                <span className="rounded-lg bg-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary-container">Últimos 6 meses</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--outline-variant)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--on-surface-variant)", fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", borderRadius: "12px", color: "var(--on-surface)" }} />
                    <Bar dataKey="vacations" name="Vacaciones" stackId="leave" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="sick" name="Incapacidad" stackId="leave" fill="var(--secondary)" />
                    <Bar dataKey="other" name="Otros permisos" stackId="leave" fill="var(--tertiary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-outline-variant pt-3 text-label-sm text-on-surface-variant">
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-primary" />Vacaciones</span>
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-secondary" />Incapacidad</span>
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-tertiary" />Otros</span>
              </div>
            </article>

            <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div><h2 className="text-title-lg font-semibold capitalize text-on-surface">{calendarData.label}</h2><p className="text-body-sm text-on-surface-variant">Calendario de permisos</p></div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Mes anterior" className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined block text-[18px]">chevron_left</span></button>
                  <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Mes siguiente" className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container"><span className="material-symbols-outlined block text-[18px]">chevron_right</span></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-label-sm font-medium text-on-surface-variant" aria-hidden="true">{["L", "M", "X", "J", "V", "S", "D"].map((day, index) => <span className="py-2" key={`${day}-${index}`}>{day}</span>)}</div>
              <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendario de permisos aprobados">
                {calendarData.days.map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
                  return <span key={day.date} title={day.holiday ? "Feriado oficial" : day.leaves ? `${day.leaves} permisos aprobados` : undefined} aria-label={`${day.dayNumber}${day.holiday ? ", feriado oficial" : ""}${day.leaves ? `, ${day.leaves} permisos aprobados` : ""}`} className={`relative flex aspect-square items-center justify-center rounded-lg text-label-sm transition-colors ${day.holiday ? "bg-error-container font-semibold text-on-error-container" : day.leaves ? "bg-secondary-container font-semibold text-on-secondary-container ring-1 ring-inset ring-secondary/20" : "text-on-surface hover:bg-surface-container"}`}>{day.dayNumber}{day.leaves > 1 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}</span>;
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-outline-variant pt-3 text-label-sm text-on-surface-variant"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-secondary" />Permiso aprobado</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-error" />Feriado</span></div>
            </article>

            <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
              <div className="mb-4"><h2 className="text-title-lg font-semibold text-on-surface">Tipos de permiso</h2><p className="mt-1 text-body-sm text-on-surface-variant">Solicitudes aprobadas por categoría</p></div>
              <div className="space-y-5">
                {leaveTypeCounts.map((item) => {
                  const total = leaveTypeCounts.reduce((sum, type) => sum + type.count, 0);
                  const percent = total ? Math.round((item.count / total) * 100) : 0;
                  return <div key={item.id}><div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-body-sm font-medium text-on-surface"><i className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />{item.label}</span><span className="text-label-md font-semibold tabular-nums text-on-surface">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} /></div><p className="mt-1 text-right text-label-sm text-on-surface-variant">{percent}% del total</p></div>;
                })}
              </div>
              <div className="mt-6 rounded-xl bg-secondary-container p-3 text-on-secondary-container"><p className="text-label-sm">Total de permisos aprobados</p><p className="mt-1 text-headline-lg font-bold tabular-nums">{leaveTypeCounts.reduce((sum, item) => sum + item.count, 0)}</p></div>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <div className="border-b border-outline-variant p-5">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><span aria-hidden="true" className="material-symbols-outlined">fact_check</span></span><div><h2 className="text-title-lg font-semibold text-on-surface">Solicitudes de colaboradores</h2><p className="text-body-sm text-on-surface-variant">Revisa los detalles y resuelve las solicitudes pendientes.</p></div></div></div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <label className="relative"><span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-on-surface-variant">search</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar colaborador..." aria-label="Buscar solicitudes" className="w-full rounded-xl border border-outline-variant bg-surface px-10 py-2.5 text-body-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-60" /></label>
                  <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filtrar solicitudes por departamento" className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"><option value="all">Todos los departamentos</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">{FILTERS.map((filter) => { const count = filter.id === "all" ? requests.length : requests.filter((request) => request.status === filter.id).length; const active = statusFilter === filter.id; return <button key={filter.id} type="button" onClick={() => setStatusFilter(filter.id)} className={`rounded-full border px-4 py-2 text-label-md font-medium transition ${active ? "border-primary bg-primary text-on-primary shadow-sm" : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"}`}>{filter.label}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-label-sm ${active ? "bg-white/20 text-current" : "bg-surface-container-high text-on-surface-variant"}`}>{count}</span></button>; })}</div>
                <p className="text-label-sm text-on-surface-variant">Mostrando <span className="font-semibold text-on-surface">{filteredRequests.length}</span> de {requests.length}</p>
              </div>
            </div>

            {(error || loadError) && <p role="alert" className="mx-5 mt-4 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error || "No se pudieron cargar las solicitudes. Revisa la conexión y los permisos."}</p>}
            {notice && <p role="status" className="mx-5 mt-4 rounded-xl border border-secondary/30 bg-secondary-container px-4 py-3 text-body-sm text-on-secondary-container">{notice}</p>}

            {loading ? <div role="status" className="m-5 h-32 animate-shimmer rounded-xl" /> : filteredRequests.length === 0 ? <div className="m-5 flex flex-col items-center rounded-xl border border-dashed border-outline-variant px-4 py-12 text-center"><span className="material-symbols-outlined mb-2 text-4xl text-on-surface-variant">event_busy</span><p className="font-semibold text-on-surface">No hay solicitudes</p><p className="mt-1 text-body-sm text-on-surface-variant">Prueba con otro estado o cambia los filtros.</p></div> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead className="bg-surface-container-low"><tr className="border-b border-outline-variant text-label-md font-semibold text-on-surface-variant"><th className="px-5 py-3">Colaborador</th><th className="px-4 py-3">Departamento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Días</th><th className="px-4 py-3">Motivo</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredRequests.map((request) => {
                      const status = LEAVE_STATUS[request.status] || LEAVE_STATUS.pending;
                      return <tr
                        key={request.id}
                        tabIndex={0}
                        aria-label={`Ver detalle de la solicitud de ${request.employeeName || "colaborador"}`}
                        onClick={(event) => openRequest(request, "view", event.currentTarget)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            openRequest(request, "view", event.currentTarget);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-surface-container-low focus-visible:outline-primary"
                      >
                        <td className="px-5 py-3"><span className="flex items-center gap-3"><Avatar name={request.employeeName} photoURL={profiles[request.userId]?.photoURL} size={38} /><span className="min-w-0"><span className="block font-semibold text-on-surface">{request.employeeName || "—"}</span><span className="block font-mono text-label-sm text-on-surface-variant">{request.employeeId || "Sin ID"}</span></span></span></td>
                        <td className="px-4 py-3 text-body-sm text-on-surface-variant">{departmentName(request.departmentId, departments)}</td>
                        <td className="px-4 py-3"><span className="inline-flex rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm font-medium text-on-surface">{LEAVE_TYPES.find((type) => type.id === request.type)?.label || request.type}</span></td>
                        <td className="whitespace-nowrap px-4 py-3 text-body-sm text-on-surface-variant">{formatDate(request.startDate)} – {formatDate(request.endDate)}</td>
                        <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-lg bg-primary-container px-2 py-1 text-label-md font-bold text-on-primary-container">{request.businessDays}</span></td>
                        <td className="max-w-56 px-4 py-3 text-body-sm text-on-surface-variant"><span className="line-clamp-2">{request.reason || "Sin motivo"}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold ${status.tone === "success" ? "bg-secondary-container text-on-secondary-container" : status.tone === "error" ? "bg-error-container text-on-error-container" : status.tone === "warning" ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container-high text-on-surface-variant"}`}><i className={`h-1.5 w-1.5 rounded-full ${status.tone === "success" ? "bg-secondary" : status.tone === "error" ? "bg-error" : status.tone === "warning" ? "bg-tertiary" : "bg-outline"}`} />{status.label}</span></td>
                        <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openRequest(request, "view", event.currentTarget);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm font-semibold text-on-surface transition hover:bg-surface-container"
                            >
                              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
                              Ver detalle
                            </button>
                            {request.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openRequest(request, "approve", event.currentTarget);
                                  }}
                                  disabled={reviewingId === request.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-label-sm font-semibold text-on-secondary transition hover:brightness-95 disabled:opacity-50"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                                  Aprobar
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openRequest(request, "reject", event.currentTarget);
                                  }}
                                  disabled={reviewingId === request.id}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error-container px-3 py-2 text-label-sm font-semibold text-on-error-container transition hover:border-error disabled:opacity-50"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
                                  Rechazar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      {modalRequest && (
        <LeaveDetailModal
          request={modalRequest}
          allRequests={requests}
          departments={departments}
          profiles={profiles}
          queue={pendingQueue}
          initialMode={modalState.initialMode}
          busy={reviewingId === modalRequest.id}
          error={error}
          headcount={forDepartment(modalRequest.departmentId)}
          returnFocusRef={returnFocusRef}
          onClose={closeRequest}
          notice={notice}
          onNavigate={(request) => {
            setError("");
            setModalState({ request, initialMode: "view" });
          }}
          onApprove={(request) => handleReview(request, "approved")}
          onReject={(request, note) => handleReview(request, "rejected", note)}
        />
      )}
    </div>
  );
}
