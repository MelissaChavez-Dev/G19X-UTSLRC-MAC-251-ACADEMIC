import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-xl p-8"
      >
        <h1 className="text-headline-lg text-on-surface mb-1">PluriOne Health</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Acceso ejecutivo al dashboard de salud organizacional
        </p>

        <label className="text-label-sm text-on-surface-variant uppercase tracking-widest">
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full rounded-md border border-outline-variant bg-surface p-3 text-body-md text-on-surface"
        />

        <label className="text-label-sm text-on-surface-variant uppercase tracking-widest">
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-6 w-full rounded-md border border-outline-variant bg-surface p-3 text-body-md text-on-surface"
        />

        {error && <p className="text-error text-body-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-primary text-on-primary text-headline-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}