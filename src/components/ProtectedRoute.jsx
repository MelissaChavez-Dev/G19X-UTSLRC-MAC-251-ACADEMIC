import { Navigate } from "react-router-dom";
import { useState } from "react";
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
  const { user, loading, role, claims, mustChangePassword, refreshClaims } = useAuth();
  const [claimRefreshError, setClaimRefreshError] = useState("");

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (!skipPasswordCheck && mustChangePassword) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (roles?.includes("admin") && role === "admin" && claims?.role !== "admin") {
    async function handleRefreshClaims() {
      setClaimRefreshError("");
      try {
        const refreshedClaims = await refreshClaims();
        if (refreshedClaims?.role !== "admin") {
          setClaimRefreshError("El token sigue sin el rol admin. Cierra sesión y vuelve a entrar; si persiste, pide que se vuelva a aprovisionar tu rol.");
        }
      } catch (error) {
        setClaimRefreshError(`No se pudieron actualizar los permisos: ${error.message}`);
      }
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-space-md">
        <section className="motion-card flex w-full max-w-xl flex-col items-center gap-space-sm rounded-3xl bg-surface-container-lowest p-space-xl text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-warning">lock</span>
          <h1 className="text-headline-md text-on-surface">Falta actualizar los permisos de administrador</h1>
          <p className="text-body-md text-on-surface-variant">
            Tu perfil muestra acceso de administrador, pero el token de Firebase que autoriza Firestore aún no lo confirma. Se intentó renovarlo automáticamente.
          </p>
          {claimRefreshError && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{claimRefreshError}</p>}
          <button
            type="button"
            onClick={handleRefreshClaims}
            className="motion-press rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary"
          >
            Actualizar permisos
          </button>
        </section>
      </main>
    );
  }

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to={ROLE_HOME[role] || "/"} replace />;
  }

  return children;
}