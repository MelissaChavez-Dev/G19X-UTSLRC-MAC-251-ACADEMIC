import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-body-md text-on-surface-variant">Cargando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}