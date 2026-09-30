/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { logLogin } from "../services/activityService";

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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      if (!firebaseUser) {
        setState({ user: null, claims: null, profile: null, loading: false });
        return;
      }

      // Presencia digital: un inicio de sesión por sesión del navegador
      const loginKey = `plurione-login-${firebaseUser.uid}`;
      if (!sessionStorage.getItem(loginKey)) {
        sessionStorage.setItem(loginKey, "1");
        logLogin();
      }

      unsubscribeProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        async (snap) => {
          const token = await firebaseUser.getIdTokenResult();
          setState({
            user: firebaseUser,
            claims: token.claims,
            profile: snap.exists() ? { id: snap.id, ...snap.data() } : null,
            loading: false,
          });
        },
        async () => {
          // Si el perfil aún no existe, igual resolvemos con los claims
          const token = await firebaseUser.getIdTokenResult();
          setState({ user: firebaseUser, claims: token.claims, profile: null, loading: false });
        }
      );
    });

    return () => {
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
    isTeamLead: role === "team_lead",
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
