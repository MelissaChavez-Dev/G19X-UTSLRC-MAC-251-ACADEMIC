import ThemeToggle from "./ThemeToggle";
import { AdminNotificationBell } from "./NotificationBell";
import { useSidebarState } from "../hooks/useSidebarState";
import { useDepartments } from "../hooks/useDepartments";

export default function TopBar({ departmentId, onDepartmentChange }) {
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();

  return (
    <header className={`fixed top-0 ${collapsed ? "left-20" : "left-64"} right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-sm z-40 flex items-center justify-end px-space-xl transition-[left] duration-300 ease-out`}>
      <div className="flex items-center gap-space-md">
        {onDepartmentChange && (
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-full text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">domain</span>
            <select
              value={departmentId || ""}
              onChange={(e) => onDepartmentChange(e.target.value || null)}
              className="theme-select bg-transparent border-none outline-none text-label-md text-on-surface cursor-pointer"
              aria-label="Filtrar por departamento"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-full text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          <span className="text-label-md text-on-surface">Últimos 30 días</span>
        </div>
        <AdminNotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}