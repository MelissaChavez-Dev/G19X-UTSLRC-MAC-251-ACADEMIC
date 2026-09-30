import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingScreen from "./LoadingScreen";

const ROLE_HOME = {
  admin: "/dashboard",
  team_lead: "/mi-equipo",
  employee: "/mi-espacio",
};

/**
 * Protege rutas por autenticación y (opcionalmente) por rol.
 * - roles: array de roles permitidos, ej. ["admin"].
 * - skipPasswordCheck: úsese solo en la propia pantalla de cambio de contraseña.
 */
export default function ProtectedRoute({ children, roles, skipPasswordCheck = false }) {
  const { user, loading, role, mustChangePassword } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (!skipPasswordCheck && mustChangePassword) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to={ROLE_HOME[role] || "/"} replace />;
  }

  return children;
}