import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { generateStrategy } from "../services/aiService";

export default function AIStrategistPanel({ orgMetrics, departmentRisk, openComments = [] }) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const departmentNames = [...new Set(openComments.map((comment) => comment.departmentName).filter(Boolean))];

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const result = await generateStrategy({
        orgMetrics,
        departmentRisk,
        openComments: openComments.slice(-40),
      });
      setMarkdown(result);
    } catch (err) {
      console.error(err);
      setError("No se pudo generar el análisis. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-primary-container rounded-xl shadow-sm p-space-lg flex flex-col h-full">
      <div className="flex items-center gap-space-sm mb-1">
        <span className="material-symbols-outlined text-secondary-container text-[22px]">
          auto_awesome
        </span>
        <h2 className="text-headline-sm text-on-primary">Resumen de las respuestas</h2>
      </div>
      <span className="text-label-sm text-secondary-container uppercase tracking-widest mb-4">
        Modo asesoría ejecutiva
      </span>

      {!markdown && !loading && (
        <>
          <p className="text-body-sm text-inverse-on-surface opacity-80 mb-4">
            Convierte los comentarios del personal en necesidades principales y acciones
            concretas para cada área de la organización.
          </p>
          <div className="rounded-lg bg-black/15 p-space-sm mb-6">
            <span className="text-label-sm text-secondary-container uppercase tracking-widest block">
              Base disponible
            </span>
            <strong className="text-body-md text-on-primary block mt-1">
              {openComments.length} comentarios recientes
            </strong>
            <span className="text-body-sm text-inverse-on-surface opacity-80 block mt-1">
              Áreas representadas: {departmentNames.length > 0 ? departmentNames.join(", ") : "aún no hay comentarios"}
            </span>
          </div>
        </>
      )}

      {loading && (
        <p className="text-body-sm text-inverse-on-surface opacity-80 mb-6">
          Analizando comentarios y resultados...
        </p>
      )}

      {error && <p className="text-error text-body-sm mb-4">{error}</p>}

      {markdown && (
        <div className="prose prose-sm prose-invert max-w-none mb-6 text-inverse-on-surface [&_strong]:text-on-primary [&_li]:text-body-sm">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-auto w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary-container text-on-secondary-container text-headline-sm font-semibold shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">bolt</span>
        {loading ? "Preparando resumen..." : markdown ? "Actualizar resumen" : "Ver necesidades y acciones"}
      </button>
    </div>
  );
}