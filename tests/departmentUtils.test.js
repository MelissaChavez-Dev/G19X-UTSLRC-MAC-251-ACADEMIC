import test from "node:test";
import assert from "node:assert/strict";
import { departmentName } from "../src/utils/departmentUtils.js";

test("departmentName devuelve el nombre de un departamento conocido", () => {
  assert.equal(
    departmentName("rh", [{ id: "rh", name: "Recursos Humanos" }]),
    "Recursos Humanos",
  );
});

test("departmentName usa el respaldo cuando no hay id", () => {
  assert.equal(departmentName("", [], "Todos los departamentos"), "Todos los departamentos");
});
