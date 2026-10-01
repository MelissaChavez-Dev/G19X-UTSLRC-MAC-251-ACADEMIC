import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "../services/firebase";
import illustrationSign from "../assets/ilustracion_sign.webp";
import "./login.css";

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
  "auth/user-not-found": "No encontramos una cuenta con ese correo.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
  "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
  "auth/too-many-requests": "Demasiados intentos. Intenta de nuevo en unos minutos.",
  "auth/popup-closed-by-user": "Cerraste la ventana antes de completar el acceso.",
  "auth/network-request-failed": "Sin conexión. Revisa tu red e intenta de nuevo.",
};

function getAuthErrorMessage(code) {
  return AUTH_ERROR_MESSAGES[code] || "Ocurrió un error inesperado. Intenta de nuevo.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // null | "sending" | "sent"
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Ingresa tu correo para enviarte instrucciones de recuperación.");
      return;
    }
    setError("");
    setResetStatus("sending");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetStatus("sent");
    } catch (err) {
      setResetStatus(null);
      setError(getAuthErrorMessage(err.code));
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-story" aria-label="Bienestar organizacional">
          <img
            className="login-story-image"
            src={illustrationSign}
            alt="Persona trabajando en su laptop junto a un gato, rodeada de gráficos de bienestar organizacional"
          />

          <div className="login-story-logo">
            <span className="login-story-mark" aria-hidden="true">✦</span>
            <span className="login-story-wordmark">
              <strong>Bienestar</strong>
              <span>Organizacional</span>
            </span>
          </div>

          <footer className="login-story-footer">
            <strong>Bienestar laboral</strong>&nbsp;con información para decidir mejor
          </footer>
        </section>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-form-heading">
              <h2>Inicia sesión</h2>
              <p>Tu cuenta es creada por la administración de tu organización.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="login-email">Correo electrónico</label>
                <div className="login-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5 10.8 13a2 2 0 0 0 2.3 0L21 7.5M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" /></svg>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder="Ingresa tu correo electrónico"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Contraseña</label>
                <div className="login-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm5 5v2" /></svg>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c4.5 0 8.3 2.9 9.5 7a10.8 10.8 0 0 1-3 4.5M6.2 6.2A10.8 10.8 0 0 0 2.5 12c1.2 4.1 5 7 9.5 7 1 0 2-.2 2.9-.5" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="login-row-between">
                  <label className="login-checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    className="login-link-btn"
                    onClick={handleForgotPassword}
                    disabled={resetStatus === "sending"}
                  >
                    {resetStatus === "sending" ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                  </button>
                </div>

              {resetStatus === "sent" && (
                <p className="login-success" role="status">
                  Te enviamos un enlace a {email} para restablecer tu contraseña.
                </p>
              )}

              {error && <p className="login-error" role="alert">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <p className="login-security-note">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              Acceso protegido para tu organización
            </p>
          </div>
          <footer className="login-form-footer">Plataforma de bienestar organizacional</footer>
        </section>
      </div>
    </main>
  );
}
