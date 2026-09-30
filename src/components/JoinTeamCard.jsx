import { useState } from "react";
import { joinTeamByCode } from "../services/userService";

/**
 * Tarjeta para que el colaborador se una a un equipo escribiendo
 * el código (joinCode) que le compartió la administración.
 */
export default function JoinTeamCard({ onJoined }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinedName, setJoinedName] = useState("");

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await joinTeamByCode(code.trim());
      setJoinedName(result.teamName);
      onJoined?.(result);
    } catch (err) {
      setError(err?.message || "No se pudo unir al equipo. Verifica el código.");
    } finally {
      setLoading(false);
    }
  }

  if (joinedName) {
    return (
      <div className="motion-card animate-pop bg-secondary-container p-space-lg flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-on-secondary-container text-[28px]">celebration</span>
        <p className="text-body-md text-on-secondary-container">
          ¡Listo! Ahora formas parte de <strong>{joinedName}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleJoin}
      className="motion-card bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm"
    >
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[28px]">group_add</span>
        <h3 className="text-headline-sm text-on-surface">Únete a un equipo</h3>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Escribe el código que te compartió tu administradora (formato XXXX-XXXX).
      </p>
      <div className="flex gap-space-sm">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          maxLength={9}
          className="flex-1 rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface tracking-widest uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <button
          type="submit"
          disabled={loading || code.trim().length < 4}
          className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
        >
          {loading ? "Uniendo..." : "Unirme"}
        </button>
      </div>
      {error && (
        <p className="text-body-sm text-error animate-pop" role="alert">{error}</p>
      )}
    </form>
  );
}
