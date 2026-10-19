import test from "node:test";
import assert from "node:assert/strict";
import { findDepartmentOverlaps } from "../src/utils/leaveUtils.js";

const request = {
  id: "request-current",
  userId: "employee-current",
  employeeId: "E-1",
  departmentId: "logistica",
  startDate: "2026-10-20",
  endDate: "2026-10-23",
};

function approved(overrides = {}) {
  return {
    id: "approved-1",
    userId: "employee-other",
    employeeId: "E-2",
    departmentId: "logistica",
    startDate: "2026-10-22",
    endDate: "2026-10-25",
    status: "approved",
    ...overrides,
  };
}

test("incluye permisos aprobados que se traslapan en el mismo departamento", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [approved()]), [approved()]);
});

test("excluye permisos de otros departamentos", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [approved({ departmentId: "ventas" })]), []);
});

test("excluye a la misma persona", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [approved({ userId: request.userId })]), []);
  assert.deepEqual(findDepartmentOverlaps(request, [approved({ userId: undefined, employeeId: request.employeeId })]), []);
});

test("solo incluye solicitudes aprobadas", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [approved({ status: "pending" }), approved({ id: "rejected", status: "rejected" })]), []);
});

test("detecta traslapes parciales", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [
    approved({ startDate: "2026-10-18", endDate: "2026-10-21" }),
  ]).map(({ id }) => id), ["approved-1"]);
});

test("no incluye periodos sin traslape", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [
    approved({ startDate: "2026-10-24", endDate: "2026-10-26" }),
  ]), []);
});

test("considera traslape cuando los periodos se tocan en un extremo", () => {
  assert.deepEqual(findDepartmentOverlaps(request, [
    approved({ startDate: "2026-10-23", endDate: "2026-10-24" }),
  ]).map(({ id }) => id), ["approved-1"]);
});
