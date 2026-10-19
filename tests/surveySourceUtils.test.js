import test from "node:test";
import assert from "node:assert/strict";
import { summarizeFrictionSources } from "../src/utils/surveySourceUtils.js";

test("resume opciones de fuente de fricción usando sus etiquetas de plantilla", () => {
  const templates = [{
    id: "pulse-1",
    questions: [{
      mapsTo: "cognitiveLoad",
      options: [
        { value: "priority-changes", label: "Cambios de prioridad" },
        { value: "slow-tools", label: "Herramientas lentas" },
      ],
    }],
  }];
  const responses = [
    { templateId: "pulse-1", cognitiveLoad: "priority-changes" },
    { templateId: "pulse-1", cognitiveLoad: "priority-changes" },
    { templateId: "pulse-1", cognitiveLoad: "slow-tools" },
    { templateId: "pulse-1", cognitiveLoad: "unknown_option" },
    { templateId: "pulse-1" },
  ];

  assert.deepEqual(summarizeFrictionSources(responses, templates), [
    { label: "Cambios de prioridad", count: 2, percentage: 50 },
    { label: "Herramientas lentas", count: 1, percentage: 25 },
    { label: "unknown option", count: 1, percentage: 25 },
  ]);
});

test("usa las etiquetas de las opciones de la encuesta predeterminada", () => {
  assert.deepEqual(
    summarizeFrictionSources([{ cognitiveLoad: "no-friction" }], []),
    [{ label: "Ninguno / ritmo balanceado", count: 1, percentage: 100 }]
  );
});

test("conserva etiquetas legibles para respuestas históricas", () => {
  assert.deepEqual(
    summarizeFrictionSources([{ cognitiveLoad: "balanced" }], []),
    [{ label: "Ninguno / ritmo balanceado", count: 1, percentage: 100 }]
  );
});
