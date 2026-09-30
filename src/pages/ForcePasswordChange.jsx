import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export default function ForcePasswordChange() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { mustChangePassword: false });
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.code === "auth/requires-recent-login"
          ? "Por seguridad, cierra sesión y vuelve a entrar para cambiar tu contraseña."
          : "No se pudo actualizar la contraseña. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-space-md">
      <div className="motion-card animate-enter bg-surface-container-lowest max-w-md w-full p-space-xl">
        <div className="flex flex-col items-center text-center gap-space-xs mb-space-lg">
          <span className="material-symbols-outlined text-[40px] text-primary">password</span>
          <h1 className="text-headline-lg text-on-surface">Crea tu nueva contraseña</h1>
          <p className="text-body-md text-on-surface-variant">
            Es tu primer acceso. Por seguridad, define una contraseña personal antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="new-password" className="text-label-md text-on-surface">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 pr-10 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <label htmlFor="confirm-password" className="text-label-md text-on-surface">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              placeholder="Repite tu contraseña"
            />
          </div>

          {error && (
            <p className="text-body-sm text-error animate-pop" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="motion-press w-full rounded-full bg-primary text-on-primary py-3 text-label-md disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </main>
  );
}
