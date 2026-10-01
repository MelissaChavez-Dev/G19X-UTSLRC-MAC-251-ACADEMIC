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
  const [taskState, setTaskState] = useState({});
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
    <div className="bg-[var(--mint-soft)] text-[var(--mint-ink)] rounded-[28px] p-6 flex flex-col h-full border-none transition-all duration-200">
      
      {/* Encabezado MD3 Expressive (Sin bordes) */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--mint-deep)] text-[var(--on-accent,#fff)] flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">
            auto_awesome
          </span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--mint-ink)] leading-tight">
            Resumen de las respuestas
          </h2>
        </div>
      </div>

      {/* Chip informativo con tono de capa sin borde */}
      <div className="w-max px-3.5 py-1 rounded-full bg-[var(--mint-deep)]/12 text-[var(--mint-ink)] text-[11px] font-bold uppercase tracking-wider mb-5">
        Modo asesoría ejecutiva
      </div>

      {/* Estado Inicial / Sin Análisis */}
      {!markdown && !loading && (
        <div className="flex-1 flex flex-col">
          <p className="text-[var(--mint-ink)] text-sm mb-5 leading-relaxed opacity-90">
            Convierte los comentarios del personal en necesidades principales y acciones concretas para cada área de la organización.
          </p>
          
          {/* Tarjeta interna tonal sin bordes ni líneas separadoras */}
          <div className="bg-[var(--mint-deep)]/10 rounded-[24px] p-5 mb-6 flex flex-col gap-4">
            <div>
              <span className="text-[11px] font-bold text-[var(--mint-ink)] uppercase tracking-wider block mb-2 opacity-75">
                Base disponible
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="text-3xl font-black text-[var(--mint-ink)]">
                  {openComments.length}
                </strong>
                <span className="text-sm font-semibold text-[var(--mint-ink)] opacity-90">
                  comentarios recientes
                </span>
              </div>
            </div>

            {/* Sub-caja tonal para áreas (Reemplaza la línea border-t) */}
            <div className="bg-[var(--mint-deep)]/8 rounded-[16px] px-3.5 py-2.5">
              <span className="text-xs text-[var(--mint-ink)] block truncate opacity-90">
                <strong className="font-bold">Áreas:</strong>{" "}
                {departmentNames.length > 0 ? departmentNames.join(", ") : "aún no hay comentarios"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Carga */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined text-[var(--mint-deep)] text-4xl animate-spin mb-3">
            progress_activity
          </span>
          <p className="text-sm font-semibold text-[var(--mint-ink)]">
            Analizando comentarios y resultados...
          </p>
        </div>
      )}

      {/* Mensaje de Error */}
      {error && (
        <div className="bg-[var(--mint-deep)]/20 text-[var(--mint-ink)] text-sm p-4 rounded-[20px] mb-4 font-medium">
          {error}
        </div>
      )}

      {/* Resultado Markdown */}
      {markdown && (
        <div className="prose prose-sm max-w-none mb-6 text-[var(--mint-ink)] [&_strong]:text-[var(--mint-ink)] [&_h3]:text-[var(--mint-ink)]">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}

      {/* Acciones Recomendadas / Crear tareas */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          <span className="text-[11px] font-bold text-[var(--mint-ink)] uppercase tracking-wider opacity-75">
            Convertir en tareas de equipo
          </span>
          {recommendations.map((rec, index) => {
            const draft = taskState[index] || {};
            return (
              <div
                key={index}
                className="rounded-[24px] bg-[var(--mint-deep)]/10 p-4 flex flex-col gap-3"
              >
                <span className="text-sm text-[var(--mint-ink)] font-bold leading-snug">
                  {rec.title}
                </span>
                {draft.done ? (
                  <span className="text-xs font-bold text-[var(--mint-ink)] bg-[var(--mint-deep)]/20 px-3.5 py-2 rounded-full inline-flex items-center gap-1.5 w-fit">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Tarea creada
                  </span>
                ) : (
                  <div className="flex gap-2 items-center">
                    <select
                      value={draft.teamId || ""}
                      onChange={(e) =>
                        setTaskState((prev) => ({ ...prev, [index]: { ...draft, teamId: e.target.value } }))
                      }
                      className="flex-1 rounded-full bg-[var(--mint-soft)] text-[var(--mint-ink)] text-xs px-4 py-2.5 border-none outline-none focus:ring-2 focus:ring-[var(--mint-deep)] transition-all font-medium appearance-none"
                    >
                      <option value="" disabled className="bg-[var(--mint-soft)]">
                        Elegir equipo...
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id} className="bg-[var(--mint-soft)] text-[var(--mint-ink)]">
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleConvertToTask(index, rec)}
                      disabled={!draft.teamId || draft.saving}
                      className="whitespace-nowrap rounded-full bg-[var(--mint-deep)] text-[var(--on-accent,#fff)] font-bold px-4 py-2.5 text-xs hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      {draft.saving ? "Creando..." : "Crear"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Principal (FAB Extendido) */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-auto w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-[var(--mint-deep)] text-[var(--on-accent,#fff)] text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[20px]">
          {markdown ? "refresh" : "bolt"}
        </span>
        {loading ? "Preparando resumen..." : markdown ? "Actualizar resumen" : "Ver necesidades y acciones"}
      </button>
    </div>
  );
}