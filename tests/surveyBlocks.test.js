import test from "node:test";
import assert from "node:assert/strict";
import { BLOCK_TYPES } from "../src/data/blockLibrary.js";

test("la biblioteca incluye un bloque Likert 1-5 compatible con escalas", () => {
  const block = BLOCK_TYPES.find(({ id }) => id === "likert-1-5");

  assert.ok(block);
  assert.equal(block.type, "scale");
  assert.equal(block.label, "Likert 1-5");
  assert.equal(block.defaults.min, 1);
  assert.equal(block.defaults.max, 5);
});
