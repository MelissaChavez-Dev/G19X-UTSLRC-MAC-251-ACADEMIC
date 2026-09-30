import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { generateStrategy } from "../services/aiService";
import { createTask } from "../services/taskService";
import { useTeams } from "../hooks/useTeams";

/** Extrae las 3 acciones recomendadas del Markdown que genera Gemini. */
function parseRecommendations(markdown) {
  if (!markdown) return [];
  const results = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (match) {
      results.push({ title: match[1].trim(), description: match[2].trim() });
    }
  }
  return results;
}

export default function AIStrategistPanel({ orgMetrics, departmentRisk, openComments = [], onAnalysisChange }) {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskState, setTaskState] = useState({}); // índice -> { teamId, saving, done }
  const { teams } = useTeams();
  const departmentNames = [...new Set(openComments.map((comment) => comment.departmentName).filter(Boolean))];

  const recommendations = useMemo(() => parseRecommendations(markdown), [markdown]);

  useEffect(() => {
    onAnalysisChange?.(markdown);
  }, [markdown, onAnalysisChange]);

  async function handleConvertToTask(index, rec) {
    const draft = taskState[index] || {};
    if (!draft.teamId) return;
    setTaskState((prev) => ({ ...prev, [index]: { ...draft, saving: true } }));
    try {
      await createTask(draft.teamId, {
        title: rec.title,
        description: rec.description,
        origin: "ai_recommendation",
        sourceMetric: "attritionRisk",
      });
      setTaskState((prev) => ({ ...prev, [index]: { ...draft, saving: false, done: true } }));
    } catch (err) {
      console.error(err);
      setTaskState((prev) => ({ ...prev, [index]: { ...draft, saving: false } }));
    }
  }

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
        <span className="material-symbols-outlined text-secondary text-[22px]">
          auto_awesome
        </span>
        <h2 className="text-headline-sm text-on-primary-container">Resumen de las respuestas</h2>
      </div>
      <span className="text-label-sm text-secondary uppercase tracking-widest mb-4">
        Modo asesoría ejecutiva
      </span>

      {!markdown && !loading && (
        <>
          <p className="text-body-sm text-on-primary-container opacity-80 mb-4">
            Convierte los comentarios del personal en necesidades principales y acciones
            concretas para cada área de la organización.
          </p>
          <div className="rounded-lg bg-black/15 p-space-sm mb-6">
            <span className="text-label-sm text-secondary uppercase tracking-widest block">
              Base disponible
            </span>
            <strong className="text-body-md text-on-primary-container block mt-1">
              {openComments.length} comentarios recientes
            </strong>
            <span className="text-body-sm text-on-primary-container opacity-80 block mt-1">
              Áreas representadas: {departmentNames.length > 0 ? departmentNames.join(", ") : "aún no hay comentarios"}
            </span>
          </div>
        </>
      )}

      {loading && (
        <p className="text-body-sm text-on-primary-container opacity-80 mb-6">
          Analizando comentarios y resultados...
        </p>
      )}

      {error && <p className="text-error text-body-sm mb-4">{error}</p>}

      {markdown && (
        <div className="prose prose-sm prose-invert max-w-none mb-6 text-on-primary-container [&_strong]:text-on-primary-container [&_li]:text-body-sm">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="flex flex-col gap-space-sm mb-6">
          <span className="text-label-sm text-secondary uppercase tracking-widest">
            Convierte cada acción en una tarea de equipo
          </span>
          {recommendations.map((rec, index) => {
            const draft = taskState[index] || {};
            return (
              <div
                key={index}
                className="rounded-lg bg-black/15 p-space-sm flex flex-col gap-space-xs animate-enter"
              >
                <span className="text-body-sm text-on-primary-container font-semibold">{rec.title}</span>
                {draft.done ? (
                  <span className="text-label-md text-secondary inline-flex items-center gap-1 animate-pop">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Tarea creada en el tablero
                  </span>
                ) : (
                  <div className="flex gap-space-xs">
                    <select
                      value={draft.teamId || ""}
                      onChange={(e) =>
                        setTaskState((prev) => ({ ...prev, [index]: { ...draft, teamId: e.target.value } }))
                      }
                      className="flex-1 rounded-lg bg-surface-container-lowest text-on-surface text-body-sm px-space-sm py-1.5 border border-outline-variant outline-none"
                    >
                      <option value="" disabled>
                        Elegir equipo...
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id} className="text-on-surface">
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleConvertToTask(index, rec)}
                      disabled={!draft.teamId || draft.saving}
                      className="motion-press rounded-full bg-secondary-container text-on-secondary-container px-space-sm py-1.5 text-label-md disabled:opacity-40"
                    >
                      {draft.saving ? "Creando..." : "Convertir en tarea"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-auto w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary text-on-secondary text-headline-sm font-semibold shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">bolt</span>
        {loading ? "Preparando resumen..." : markdown ? "Actualizar resumen" : "Ver necesidades y acciones"}
      </button>
    </div>
  );
}