import test from "node:test";
import assert from "node:assert/strict";
import { calculateDepartmentRisk } from "../src/utils/departmentRiskUtils.js";
import { CURRENT_INSTRUMENT_VERSION } from "../src/data/surveyTemplate.js";

test("calcula y muestra valores preliminares de una respuesta actual sin asignar nivel de riesgo", () => {
  const row = calculateDepartmentRisk([{
    enps: 8,
    workLifeBalance: 8,
    templateId: "weekly-pulse",
    weekId: "2026-W42",
    instrumentVersion: CURRENT_INSTRUMENT_VERSION,
    psychosocialFactors: {
      cognitiveLoad: 4,
      roleAmbiguity: 2,
      emotionalLabor: 2,
      shiftFatigue: 2,
      autonomy: 5,
      psychSafety: 4.6,
    },
  }], 25, [{
    id: "weekly-pulse",
    questions: [{
      type: "scale",
      mapsTo: "workLifeBalance",
      min: 1,
      max: 10,
    }],
  }]);

  assert.equal(row.enps, 0);
  assert.equal(row.workLifeBalance, 8);
  assert.equal(row.workLifeBalanceFivePoint, 4.1);
  assert.equal(row.factors.cognitiveLoad, 4);
  assert.equal(row.factors.psychSafety, 4.6);
  assert.equal(row.attritionRisk, 25);
  assert.equal(row.activePulseRate, 4);
  assert.equal(row.psychosocialSampleSize, 1);
  assert.equal(row.tier.tone, "no-data");
});

test("normaliza el balance a la misma escala cuando la encuesta ya usa 1 a 5", () => {
  const row = calculateDepartmentRisk([{
    templateId: "short-scale",
    workLifeBalance: 4,
  }], 10, [{
    id: "short-scale",
    questions: [{
      type: "scale",
      mapsTo: "workLifeBalance",
      min: 1,
      max: 5,
    }],
  }]);

  assert.equal(row.workLifeBalance, 4);
  assert.equal(row.workLifeBalanceFivePoint, 4);
});
