import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSidebarState } from "../hooks/useSidebarState";
import WelfareLogo from "./WelfareLogo";

const NAV_ITEMS = [
  { icon: "grid_view", label: "Resumen", to: "/dashboard" },
  { icon: "assignment_add", label: "Constructor de encuestas", to: "/survey-builder" },
  { icon: "manage_accounts", label: "Gestión de usuarios", to: "/admin/usuarios" },
  { icon: "event_available", label: "Asistencia", to: "/admin/asistencia" },
  { icon: "beach_access", label: "Gestión de permisos", to: "/admin/permisos" },
  { icon: "groups", label: "Directorio del equipo", to: "/equipos" },
  { icon: "fact_check", label: "Calidad de datos", to: "/admin/calidad" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useSidebarState();

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  const isItemActive = (to) => {
    if (!to) return false;
    return location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full ${
        collapsed ? "w-20" : "w-64"
      } bg-surface-container-lowest border-r border-outline-variant z-50 flex flex-col justify-between transition-[width] duration-300 ease-out select-none`}
    >
      {/* Sección Superior: Marca + Navegación */}
      <div className="flex flex-col">
        
        {/* Cabecera de la plataforma y control del menú */}
        <div
          className="mx-1 mt-space-sm mb-space-sm flex min-h-10 items-center justify-center py-space-sm"
        >
          <div className="flex min-w-0 items-center">
            <WelfareLogo
              compact={collapsed}
              className={collapsed ? "h-10 w-10 shrink-0 object-contain" : "h-auto w-36 max-w-full object-contain"}
            />
          </div>
        </div>

        <hr className="border-outline-variant/40 mx-space-sm mb-space-sm" />

        {/* Menú de Navegación */}
        <nav className="px-space-sm flex flex-col gap-1" aria-label="Navegación principal">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Desplegar menú" : "Colapsar menú"}
            aria-label={collapsed ? "Desplegar menú" : "Colapsar menú"}
            className={`motion-press group flex w-full items-center gap-space-sm rounded-full px-3 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="material-symbols-outlined block shrink-0 text-[20px]">
              {collapsed ? "side_navigation" : "menu_open"}
            </span>
            {!collapsed && <span className="text-body-md">Colapsar menú</span>}
          </button>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item.to);

            const baseStyles = `group relative flex items-center gap-space-sm px-3 py-2.5 rounded-full transition-all duration-200 motion-press ${
              collapsed ? "justify-center" : ""
            }`;

            const activeStyles = active
              ? "bg-primary-container text-on-primary-container font-semibold"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

            return (
              <Link
                key={item.label}
                to={item.to}
                target="_self"
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`${baseStyles} ${activeStyles}`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] shrink-0 ${
                    active ? "text-primary" : ""
                  }`}
                >
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="text-body-md truncate flex-1">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sección Inferior: Estado de Sincronización + Logout */}
      <div className="p-space-sm flex flex-col gap-space-sm">
        {/* Widget de Estado de Sincronización */}
        <div
          title={collapsed ? "Sincronización activa · Firestore en vivo" : undefined}
          className={`flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-low border border-outline-variant/60 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse shrink-0"
            aria-hidden="true"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-label-sm text-on-surface font-medium leading-tight truncate">
                Sincronización activa
              </span>
              <span className="text-label-sm text-on-surface-variant/80 truncate">
                Firestore en vivo
              </span>
            </div>
          )}
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          aria-label="Cerrar sesión"
          className={`motion-press flex items-center gap-space-sm p-space-sm rounded-xl text-on-surface-variant hover:bg-error-container hover:text-on-error-container text-left transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
          {!collapsed && <span className="text-body-md font-medium truncate">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}