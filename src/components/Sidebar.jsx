import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { Link, useNavigate } from "react-router-dom";
import { useSidebarState } from "../hooks/useSidebarState";

const NAV_ITEMS = [
  { icon: "grid_view", label: "Resumen", active: true, to: "/dashboard" },
  { icon: "assignment_add", label: "Constructor de encuestas", active: true, to: "/survey-builder" },
  { icon: "manage_accounts", label: "Gestión de usuarios", active: true, to: "/admin/usuarios" },
  { icon: "groups", label: "Directorio del equipo", active: true, to: "/equipos" },
  { icon: "auto_awesome", label: "Análisis", active: false },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed } = useSidebarState();

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${collapsed ? "w-20" : "w-64"} bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col justify-between transition-[width] duration-300 ease-out`}
    >
      <div className="flex flex-col">
        {/* Marca minimalista, sin degradado pesado */}
        <div className={`mx-space-sm mt-space-sm mb-space-md py-space-md flex items-center gap-space-sm ${collapsed ? "px-space-sm justify-center" : "px-space-md"}`}>
          <div className="h-9 w-9 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-semibold text-lg shrink-0">
            P
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-headline-sm tracking-tight leading-none text-on-surface">PluriOne</span>
              <span className="text-label-sm text-on-surface-variant tracking-wider uppercase leading-none mt-1">
                Health
              </span>
            </div>
          )}
        </div>

        {/* Botón de colapso, posición fija entre la marca y la navegación */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={`motion-press mx-space-sm mb-space-sm flex items-center gap-space-sm px-space-sm py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface ${collapsed ? "justify-center" : ""}`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {collapsed ? "dock_to_right" : "dock_to_left"}
          </span>
          {!collapsed && <span className="text-body-sm">Colapsar</span>}
        </button>

        <nav className="px-space-sm flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const className = `flex items-center gap-space-sm px-space-sm py-2 rounded-full transition-all motion-press ${
              collapsed ? "justify-center" : ""
            } ${
              item.active
                ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold"
                : "text-on-surface-variant opacity-40 cursor-not-allowed"
            }`;
            const content = (
              <>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {!collapsed && <span className="text-body-md">{item.label}</span>}
                {!collapsed && !item.active && <span className="text-label-sm ml-auto">Próx.</span>}
              </>
            );

            return item.active ? (
              <Link key={item.label} to={item.to} title={collapsed ? item.label : undefined} className={className}>
                {content}
              </Link>
            ) : (
              <div key={item.label} title={collapsed ? item.label : undefined} className={className}>
                {content}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-space-sm flex flex-col gap-space-sm">
        <div
          title={collapsed ? "Sincronización activa · Firestore en vivo" : undefined}
          className={`flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-low border border-outline-variant ${collapsed ? "justify-center" : ""}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ambient shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-label-sm text-on-surface leading-tight">Sincronización activa</span>
              <span className="text-label-sm text-on-surface-variant">Firestore en vivo</span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={`motion-press flex items-center gap-space-sm p-space-sm rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface text-left ${collapsed ? "justify-center" : ""}`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span className="text-body-md">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}