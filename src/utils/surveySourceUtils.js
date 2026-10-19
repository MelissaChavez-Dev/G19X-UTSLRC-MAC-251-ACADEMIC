import { COGNITIVE_LOAD_OPTIONS } from "../data/surveyQuestion.js";

const LEGACY_FRICTION_LABELS = {
  "shift-handoff": "Cambios de contexto y entregas entre tareas",
  "emr-integration": "Demoras de herramientas o sistemas",
  "unclear-protocols": "Prioridades o protocolos poco claros",
  balanced: "Ninguno / ritmo balanceado",
};

export function summarizeFrictionSources(responses, templates) {
  const optionLabels = new Map(
    COGNITIVE_LOAD_OPTIONS.map((option) => [`default:${option.value}`, option.label])
  );

  templates.forEach((template) => {
    (template.questions || [])
      .filter((question) => question.mapsTo === "cognitiveLoad")
      .forEach((question) => {
        (question.options || []).forEach((option) => {
          optionLabels.set(`${template.id}:${option.value}`, option.label);
        });
      });
  });

  const counts = new Map();
  responses.forEach((response) => {
    const value = response.cognitiveLoad;
    if (value === null || value === undefined || value === "") return;

    const templateKey = response.templateId || "default";
    const rawValue = String(value);
    const label = optionLabels.get(`${templateKey}:${rawValue}`)
      || LEGACY_FRICTION_LABELS[rawValue]
      || rawValue.replace(/[-_]+/g, " ").trim()
      || "Sin categoría";
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts]
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
}
