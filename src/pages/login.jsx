import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
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
  const [oauthLoading, setOauthLoading] = useState(null); // null | "google" | "facebook" | "apple"
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

  // Google works out of the box once enabled in the Firebase console.
  // Facebook needs an App ID configured on the Facebook provider in Firebase.
  // Apple needs a Services ID + domain verification in Apple Developer, then
  // the same provider enabled in Firebase — it involves more setup than the other two.
  async function handleOAuthSignIn(providerName) {
    setError("");
    setOauthLoading(providerName);
    try {
      const provider =
        providerName === "google"
          ? new GoogleAuthProvider()
          : providerName === "facebook"
          ? new FacebookAuthProvider()
          : new OAuthProvider("apple.com");
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setOauthLoading(null);
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
        <section className="login-story" aria-label="PluriOne Health">
          <img
            className="login-story-image"
            src={illustrationSign}
            alt="Persona trabajando en su laptop junto a un gato, rodeada de gráficos de bienestar organizacional"
          />

          <div className="login-story-logo">
            <span className="login-story-mark" aria-hidden="true">✦</span>
            <span className="login-story-wordmark">
              <strong>PluriOne</strong>
              <span>Health Systems</span>
            </span>
          </div>

          <footer className="login-story-footer">
            <strong>1.600+ profesionales</strong>&nbsp;acompañados cada día
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

              <div className="login-divider"><span>o continúa con</span></div>

              <div className="login-social-row">
                <button
                  type="button"
                  className="login-social-btn"
                  aria-label="Continuar con Facebook"
                  onClick={() => handleOAuthSignIn("facebook")}
                  disabled={oauthLoading !== null}
                >
                  <svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </button>
                <button
                  type="button"
                  className="login-social-btn"
                  aria-label="Continuar con Apple"
                  onClick={() => handleOAuthSignIn("apple")}
                  disabled={oauthLoading !== null}
                >
                  <svg viewBox="0 0 24 24" fill="#0f172a" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.76 1.04-1.81.93-2.86-.9.04-2 .6-2.65 1.36-.57.65-1.07 1.72-.93 2.74 1.01.08 2.03-.49 2.65-1.24z" /></svg>
                </button>
                <button
                  type="button"
                  className="login-social-btn"
                  aria-label="Continuar con Google"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={oauthLoading !== null}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                </button>
              </div>
            </form>

            <p className="login-security-note">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.1 7 10 4.2-1.9 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              Acceso protegido para tu organización
            </p>
          </div>
          <footer className="login-form-footer">PluriOne Health, plataforma de bienestar organizacional</footer>
        </section>
      </div>
    </main>
  );
}
