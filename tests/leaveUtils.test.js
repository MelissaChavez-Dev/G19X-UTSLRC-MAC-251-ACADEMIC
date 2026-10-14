import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyAttendance,
  countBusinessDays,
  findLeaveOverlap,
  getCurrentAttendanceStatus,
  getMexicanHolidays,
  getVacationBalance,
  getVacationEntitlement,
  isBusinessDay,
} from "../src/utils/leaveUtils.js";

test("calcula feriados federales mexicanos móviles y fijos", () => {
  const holidays = getMexicanHolidays(2025);
  assert.ok(holidays.has("2025-01-01"));
  assert.ok(holidays.has("2025-02-03"));
  assert.ok(holidays.has("2025-03-17"));
  assert.ok(holidays.has("2025-09-16"));
  assert.ok(holidays.has("2025-11-17"));
  assert.ok(!isBusinessDay("2025-09-16"));
});

test("cuenta días hábiles de forma inclusiva y excluye fines de semana y feriados", () => {
  assert.equal(countBusinessDays("2025-09-15", "2025-09-19"), 4);
  assert.equal(countBusinessDays("2025-09-20", "2025-09-21"), 0);
});

test("calcula los días de vacaciones por antigüedad cumplida", () => {
  assert.equal(getVacationEntitlement("2024-06-01", "2025-05-31"), 0);
  assert.equal(getVacationEntitlement("2024-06-01", "2025-06-01"), 12);
  assert.equal(getVacationEntitlement("2020-06-01", "2025-06-01"), 20);
  assert.equal(getVacationEntitlement("2020-06-01", "2026-06-01"), 22);
  assert.equal(getVacationEntitlement("2016-06-01", "2026-06-01"), 22);
  assert.equal(getVacationEntitlement("2015-06-01", "2026-06-01"), 24);
});

test("descuenta solo vacaciones aprobadas del periodo de antigüedad actual", () => {
  const balance = getVacationBalance("2020-06-01", [
    { type: "annual", status: "approved", startDate: "2025-07-07", endDate: "2025-07-09" },
    { type: "annual", status: "pending", startDate: "2025-07-14", endDate: "2025-07-15" },
    { type: "sick", status: "approved", startDate: "2025-07-21", endDate: "2025-07-22" },
  ], "2025-08-01");

  assert.deepEqual(balance, {
    entitlement: 20,
    used: 3,
    reserved: 2,
    available: 15,
    periodStart: "2025-06-01",
  });
});

test("detecta traslapes activos e ignora solicitudes canceladas o rechazadas", () => {
  const request = { startDate: "2025-06-10", endDate: "2025-06-12" };
  const existing = [
    { status: "cancelled", startDate: "2025-06-10", endDate: "2025-06-12" },
    { status: "approved", startDate: "2025-06-12", endDate: "2025-06-14" },
  ];
  assert.equal(findLeaveOverlap(request, existing), existing[1]);
});

test("clasifica ausencias justificadas solo si existe permiso aprobado", () => {
  const record = { date: "2025-09-16", workDay: true, present: false };
  assert.equal(classifyAttendance(record, [
    { status: "approved", startDate: "2025-09-15", endDate: "2025-09-17" },
  ]), "justified_absence");
  assert.equal(classifyAttendance(record, [
    { status: "pending", startDate: "2025-09-15", endDate: "2025-09-17" },
  ]), "unjustified_absence");
  assert.equal(classifyAttendance({ ...record, present: true }), "present");
});

test("no marca como ausencia una jornada de hoy aún sin actividad", () => {
  assert.equal(getCurrentAttendanceStatus({
    date: "2025-10-13",
    schedule: { days: ["mon", "tue", "wed", "thu", "fri"] },
    activityCount: 0,
  }), "in_progress");
});
