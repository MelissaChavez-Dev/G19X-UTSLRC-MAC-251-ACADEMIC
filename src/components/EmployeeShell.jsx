import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import ThemeToggle from "./ThemeToggle";
import WelfareLogo from "./WelfareLogo";
import { EmployeeNotificationBell } from "./NotificationBell";
import { Icon } from "./EmployeeUi";
import { useSidebarState } from "../hooks/useSidebarState";

/**
 * Estructura de escritorio para colaboradores:
 * cabecera a todo el ancho (logo a la izquierda, acciones a la derecha),
 * menú lateral opcional (`nav`, solo en pantallas grandes) y contenido que aprovecha el ancho.
 * `badge` muestra el rol y `actions` agrega accesos en la cabecera.
 */
export default function EmployeeShell({ badge, actions, nav, children }) {
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed } = useSidebarState();

  async function handleLogout() {
    if (!window.confirm("¿Deseas cerrar sesión?")) return;

    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  return (
    <div className="employee-shell-canvas min-h-screen bg-surface app-canvas">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-space-md focus:top-space-md focus:z-50 focus:rounded-full focus:bg-primary focus:px-space-md focus:py-2 focus:text-label-md focus:text-on-primary"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-space-sm border-b border-outline-variant/40 bg-surface/80 px-space-md backdrop-blur-xl sm:px-space-xl">
        <div className="flex min-w-0 items-center gap-space-sm">
          <WelfareLogo className="h-9 w-32 shrink-0 object-contain" />
          {badge && (
            <span className="hidden rounded-full bg-tertiary-fixed px-space-sm py-1 text-label-md text-on-tertiary-fixed-variant sm:inline">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-space-xs sm:gap-space-sm">
          {actions}
          <EmployeeNotificationBell />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="motion-press flex items-center gap-space-xs rounded-full px-3 py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="logout" size={20} />
            <span className="hidden text-body-md sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {nav && (
          <aside
            className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col gap-space-xs overflow-y-auto border-r border-outline-variant/40 bg-surface-container-lowest/60 py-space-md transition-[width,padding] duration-300 ease-out lg:flex ${
              collapsed ? "w-20 px-2" : "w-64 px-space-md"
            }`}
          >
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expandir menú" : "Colapsar menú"}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
              className={`motion-press flex min-h-12 items-center gap-space-sm rounded-full px-space-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface ${
                collapsed ? "justify-center px-0" : ""
              }`}
            >
              <Icon name={collapsed ? "left_panel_open" : "left_panel_close"} size={20} />
              {!collapsed && <span>Colapsar menú</span>}
            </button>
            {typeof nav === "function" ? nav({ collapsed }) : nav}
          </aside>
        )}
        <main
          id="contenido"
          className="relative z-10 min-w-0 flex-1 px-space-md py-space-lg sm:px-space-xl"
        >
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-space-lg">{children}</div>
        </main>
      </div>
    </div>
  );
}