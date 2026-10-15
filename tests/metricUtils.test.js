import test from "node:test";
import assert from "node:assert/strict";
import { calculateWeeklyMetrics, computeWeeklyParticipation } from "../src/utils/metricUtils.js";
import { CURRENT_INSTRUMENT_VERSION } from "../src/data/surveyTemplate.js";

test("la participación semanal es cero cuando no hay headcount", () => {
  assert.equal(computeWeeklyParticipation([{ weekId: "2026-W42" }], 0).rate, 0);
  assert.equal(calculateWeeklyMetrics([{ enps: 10 }], 0).activePulseRate, 0);
});

test("la seguridad psicológica semanal queda vacía si faltan respuestas para el factor", () => {
  assert.equal(calculateWeeklyMetrics([{ enps: 8 }], 10).psychSafety, null);
});

test("muestra promedios psicosociales y balance como preliminares con una respuesta actual", () => {
  const metrics = calculateWeeklyMetrics([{
    enps: 8,
    workLifeBalance: 8,
    instrumentVersion: CURRENT_INSTRUMENT_VERSION,
    psychosocialFactors: {
      shiftFatigue: 2,
      emotionalLabor: 2,
      psychSafety: 4.6,
    },
  }], 25);

  assert.equal(metrics.enps, 0);
  assert.equal(metrics.workLifeBalance, 8);
  assert.equal(metrics.attritionRisk, 25);
  assert.equal(metrics.psychSafety, 4.6);
  assert.equal(metrics.activePulseRate, 4);
  assert.equal(metrics.psychosocialSampleSize, 1);
});

test("no usa factores inferidos de versiones anteriores como mediciones directas", () => {
  const oldResponse = {
    enps: 9,
    instrumentVersion: 1,
    psychosocialFactors: { psychSafety: 4.5, shiftFatigue: 3.6, emotionalLabor: 4 },
  };
  const metrics = calculateWeeklyMetrics([oldResponse], 10);
  assert.equal(metrics.attritionRisk, null);
  assert.equal(metrics.psychSafety, null);
});

test("calcula presión y seguridad con respuestas del instrumento actual", () => {
  const responses = Array.from({ length: 5 }, () => ({
    instrumentVersion: CURRENT_INSTRUMENT_VERSION,
    enps: 8,
    psychosocialFactors: { shiftFatigue: 4, emotionalLabor: 3, psychSafety: 4.5 },
  }));
  const metrics = calculateWeeklyMetrics(responses, 0);
  assert.equal(metrics.psychosocialSampleSize, 5);
  assert.equal(metrics.attritionRisk, 63);
  assert.equal(metrics.psychSafety, 4.5);
  assert.equal(metrics.activePulseRate, 0);
});
