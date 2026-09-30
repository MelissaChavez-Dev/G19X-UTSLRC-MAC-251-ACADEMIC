import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { bootstrapAdmin } from "../services/userService";
import LoadingScreen from "./LoadingScreen";

/**
 * Decide a dónde va el usuario después de iniciar sesión:
 * - mustChangePassword → /cambiar-password
 * - admin              → /dashboard
 * - team_lead          → /mi-equipo
 * - employee           → /mi-espacio
 *
 * Si el usuario autenticado no tiene rol ni perfil (cuenta heredada del MVP),
 * intenta el bootstrap de la primera cuenta admin.
 */
export default function RoleBasedRedirect() {
  const { user, loading, role, mustChangePassword, refreshClaims } = useAuth();
  const [bootstrapState, setBootstrapState] = useState("idle"); // idle | working | failed
  const attempted = useRef(false);

  const needsBootstrap = !!user && !loading && !role;

  useEffect(() => {
    if (!needsBootstrap || attempted.current) return;
    attempted.current = true;
    setBootstrapState("working");
    bootstrapAdmin()
      .then(() => refreshClaims())
      .catch(() => setBootstrapState("failed"));
  }, [needsBootstrap, refreshClaims]);

  if (loading || (needsBootstrap && bootstrapState !== "failed")) {
    return <LoadingScreen message="Preparando tu espacio..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/cambiar-password" replace />;

  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "team_lead") return <Navigate to="/mi-equipo" replace />;
  if (role === "employee") return <Navigate to="/mi-espacio" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-space-md">
      <div className="motion-card bg-surface-container-lowest max-w-md w-full p-space-xl text-center flex flex-col items-center gap-space-sm">
        <span className="material-symbols-outlined text-[40px] text-tertiary">lock_person</span>
        <h1 className="text-headline-md text-on-surface">Cuenta sin acceso asignado</h1>
        <p className="text-body-md text-on-surface-variant">
          Tu cuenta aún no ha sido aprovisionada. Pide a la administradora de PluriOne Health
          que la dé de alta desde <strong>Gestión de Usuarios</strong>.
        </p>
      </div>
    </div>
  );
}
