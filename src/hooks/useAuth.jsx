/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { logLogin } from "../services/activityService";
import { syncAdminClaim } from "../services/userService";

const AuthContext = createContext(null);

/**
 * Proveedor de autenticación central.
 * Expone el usuario de Firebase Auth, sus custom claims (rol) y su
 * perfil de Firestore (users/{uid}) en tiempo real.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: undefined, // undefined = cargando, null = no autenticado
    claims: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let unsubscribeProfile = null;
    let authGeneration = 0;
    let syncingAdminClaimFor = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const generation = ++authGeneration;
      syncingAdminClaimFor = null;
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      if (!firebaseUser) {
        setState({ user: null, claims: null, profile: null, loading: false });
        return;
      }

      // Presencia digital: un inicio de sesión por sesión del navegador
      const loginKey = `wellness-dashboard-login-${firebaseUser.uid}`;
      if (!sessionStorage.getItem(loginKey)) {
        sessionStorage.setItem(loginKey, "1");
        logLogin();
      }

      let token;
      try {
        token = await firebaseUser.getIdTokenResult(true);
      } catch (error) {
        console.error("No se pudo confirmar la sesión autenticada:", error);
        if (generation === authGeneration) {
          setState({ user: firebaseUser, claims: null, profile: null, loading: false });
        }
        return;
      }
      if (generation !== authGeneration) return;

      unsubscribeProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          const profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          if (profile?.role === "admin" && token.claims.role !== "admin") {
            setState({ user: firebaseUser, claims: token.claims, profile, loading: true });
            if (syncingAdminClaimFor !== firebaseUser.uid) {
              syncingAdminClaimFor = firebaseUser.uid;
              syncAdminClaim()
                .then(async () => {
                  const refreshedToken = await firebaseUser.getIdTokenResult(true);
                  if (generation !== authGeneration) return;
                  token = refreshedToken;
                  setState({
                    user: firebaseUser,
                    claims: refreshedToken.claims,
                    profile,
                    loading: false,
                  });
                })
                .catch((error) => {
                  console.error("No se pudo sincronizar el rol admin de la cuenta:", error);
                  if (generation === authGeneration) {
                    setState({ user: firebaseUser, claims: token.claims, profile, loading: false });
                  }
                });
            }
            return;
          }

          setState({
            user: firebaseUser,
            claims: token.claims,
            profile,
            loading: false,
          });
        },
        (error) => {
          console.error("No se pudo cargar el perfil privado del usuario:", error);
          // Si el perfil aún no existe, igual resolvemos con los claims
          setState({ user: firebaseUser, claims: token.claims, profile: null, loading: false });
        }
      );
    });

    return () => {
      authGeneration += 1;
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  async function refreshClaims() {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdTokenResult(true);
    setState((prev) => ({ ...prev, claims: token.claims }));
  }

  const role = state.claims?.role || state.profile?.role || null;

  const value = {
    ...state,
    role,
    refreshClaims,
    isAdmin: role === "admin",
    isEmployee: role === "employee",
    mustChangePassword: state.profile?.mustChangePassword === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return context;
}
