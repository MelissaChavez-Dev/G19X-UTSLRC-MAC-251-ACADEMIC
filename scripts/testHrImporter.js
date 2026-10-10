/**
 * Unit Test Suite for HR Importer & Validator (Phase 3).
 * Tests:
 * - autoSuggestMapping
 * - isSalaryColumn & salary rejection
 * - validateImportData for employees, leaves, absences
 * - duplicate detection and required field checks
 * - error report generation
 */

import assert from "node:assert/strict";
import {
  autoSuggestMapping,
  isSalaryColumn,
  validateImportData,
} from "../src/analytics/utils/hrImporter.js";
import { computeDerivedEmployeeFields } from "../src/analytics/constants.js";

console.log("=== Running HR Importer Unit Tests ===");

// 1. isSalaryColumn test
console.log("Test 1: isSalaryColumn...");
assert.equal(isSalaryColumn("salary"), true);
assert.equal(isSalaryColumn("Base_Pay"), true);
assert.equal(isSalaryColumn("gross_income"), true);
assert.equal(isSalaryColumn("encashment"), true);
assert.equal(isSalaryColumn("sueldo_mensual"), true);
assert.equal(isSalaryColumn("department"), false);
assert.equal(isSalaryColumn("employeeId"), false);
console.log("  ✓ isSalaryColumn passed");

// 2. autoSuggestMapping
console.log("Test 2: autoSuggestMapping...");
const headers = [
  "Código Empleado",
  "Nombre Completo",
  "Correo electrónico",
  "Género",
  "Fecha Ingreso",
  "Departamento",
  "Sueldo Base", // Salary header should be skipped!
  "Puesto",
];
const mapping = autoSuggestMapping(headers, "employees");
assert.equal(mapping.employeeId, "Código Empleado");
assert.equal(mapping.name, "Nombre Completo");
assert.equal(mapping.email, "Correo electrónico");
assert.equal(mapping.gender, "Género");
assert.equal(mapping.hireDate, "Fecha Ingreso");
assert.equal(mapping.department, "Departamento");
assert.equal(mapping.designation, "Puesto");
// Verify Sueldo Base was not mapped to anything
assert.equal(Object.values(mapping).includes("Sueldo Base"), false);
console.log("  ✓ autoSuggestMapping passed (and excluded salary column)");

// 3. validateImportData - Employees
console.log("Test 3: validateImportData for employees...");
const mockRows = [
  {
    "Código": "EMP-8001",
    "Nombre": "Mariana Rios",
    "Correo": "mariana@example.com",
    "Sexo": "Femenino",
    "Alta": "2022-04-10",
    "Área": "Software Engineering",
    "Cargo": "Frontend Dev",
    "Nacimiento": "1994-08-20",
    "Nivel": "Alto",
    "Tipo Contrato": "Regular",
    "Turno": "Diurno",
    "Días": "Lunes a Sábado",
    "Entrada": new Date(Date.UTC(1899, 11, 30, 7, 30)),
    "Salida": new Date(Date.UTC(1899, 11, 30, 16, 0)),
  },
  {
    "Código": "EMP-8002",
    "Nombre": "Gabriel Silva",
    "Correo": "gabriel@example.com",
    "Sexo": "Male",
    "Alta": "2023-01-15",
    "Área": "Customer Support",
    "Cargo": "Support Agent",
    "Nacimiento": "1998-11-05",
  },
  // Invalid row: missing employeeId
  {
    "Código": "",
    "Nombre": "Invalido Sin Id",
    "Correo": "sinid@example.com",
    "Sexo": "Male",
    "Alta": "2023-01-15",
    "Área": "Sales",
    "Cargo": "Sales Rep",
  },
  // Duplicate ID row
  {
    "Código": "EMP-8001",
    "Nombre": "Duplicado de Mariana",
    "Correo": "duplicado@example.com",
    "Sexo": "Female",
    "Alta": "2023-02-01",
    "Área": "Software Engineering",
    "Cargo": "Backend Dev",
  },
];

const empMapping = {
  employeeId: "Código",
  name: "Nombre",
  email: "Correo",
  gender: "Sexo",
  hireDate: "Alta",
  department: "Área",
  designation: "Cargo",
  dob: "Nacimiento",
  orgLevel: "Nivel",
  hireType: "Tipo Contrato",
  shift: "Turno",
  workDays: "Días",
  startTime: "Entrada",
  endTime: "Salida",
};

const validation = validateImportData(mockRows, empMapping, "employees");
assert.equal(validation.stats.total, 4);
assert.equal(validation.stats.valid, 2);
assert.equal(validation.stats.invalid, 2);

// Check derived fields on valid records
const emp1 = validation.validRecords[0];
assert.equal(emp1.employeeId, "EMP-8001");
assert.equal(emp1.status, "Active");
assert.equal(emp1.gender, "Female");
assert.equal(emp1.ageBand, "30-40"); // Born in 1994
assert.equal(emp1.generation, "Gen Y");
assert.equal(emp1.source, "import");
assert.equal(emp1.orgLevel, "High-Level");
assert.equal(emp1.shift, "Day");
assert.deepEqual(emp1.workDays, ["mon", "tue", "wed", "thu", "fri", "sat"]);
assert.equal(emp1.startTime, "07:30");
assert.equal(emp1.endTime, "16:00");
console.log("  ✓ validateImportData for employees passed");

const invalidCalendarDate = validateImportData(
  [{ ...mockRows[0], "Código": "EMP-8004", "Correo": "calendario@example.com", "Alta": "2024-02-31" }],
  empMapping,
  "employees",
);
assert.equal(invalidCalendarDate.stats.valid, 0);
assert.equal(invalidCalendarDate.stats.invalid, 1);
console.log("  ✓ invalid calendar dates are rejected");

// Tenure is derived from hire date even when the date of birth is unavailable.
const tenureOnly = computeDerivedEmployeeFields({
  employeeId: "EMP-ONLY-HIRE-DATE",
  dob: null,
  hireDate: "2020-01-01",
  riskProbability: 0.2,
}, new Date("2025-01-01T00:00:00Z"));
assert.equal(tenureOnly.age, null);
assert.equal(tenureOnly.generation, null);
assert.equal(tenureOnly.tenureYears, 5);
assert.equal(tenureOnly.tenureBand, "3-5");
assert.equal(computeDerivedEmployeeFields({
  employeeId: "EMP-NO-HIRE-DATE",
  dob: null,
  hireDate: null,
}).tenureYears, null);
console.log("  ✓ missing dates stay unknown while tenure derives from hire date");

// 4. validateImportData - Leaves
console.log("Test 4: validateImportData for leaves...");
const mockLeaveRows = [
  { emp_id: "EMP-8001", fecha: "2024-05-10", tipo: "Vacaciones (Annual)", dias: "5" },
  { emp_id: "EMP-8002", fecha: "2024-06-12", tipo: "Enfermedad (Sick)", dias: "2" },
  { emp_id: "EMP-8003", fecha: "fecha_mala", tipo: "Annual", dias: "-1" }, // Invalid
];
const leaveMapping = {
  employeeId: "emp_id",
  date: "fecha",
  type: "tipo",
  days: "dias",
};
const leaveVal = validateImportData(mockLeaveRows, leaveMapping, "leaves");
assert.equal(leaveVal.stats.valid, 2);
assert.equal(leaveVal.stats.invalid, 1);
assert.equal(leaveVal.validRecords[0].type, "Annual");
assert.equal(leaveVal.validRecords[1].type, "Sick");
console.log("  ✓ validateImportData for leaves passed");

// 5. validateImportData - Absences
console.log("Test 5: validateImportData for absences...");
const mockAbsRows = [
  { id_emp: "EMP-8001", f: "2024-03-04", d: "1", t: "Day" },
  { id_emp: "EMP-8002", f: "2024-04-18", d: "2", t: "Night" },
];
const absMapping = {
  employeeId: "id_emp",
  date: "f",
  days: "d",
  shift: "t",
};
const absVal = validateImportData(mockAbsRows, absMapping, "absences");
assert.equal(absVal.stats.valid, 2);
assert.equal(absVal.validRecords[0].days, 1);
assert.equal(absVal.validRecords[0].hours, 8);
assert.equal(absVal.validRecords[1].hours, 16);
console.log("  ✓ validateImportData for absences passed");

// 6. Prohibited Salary Injected into Mapped Values
console.log("Test 6: Rejecting salary field in record...");
const salaryRow = [
  {
    "Código": "EMP-9999",
    "Nombre": "Peligro Salario",
    "Correo": "peligro@example.com",
    "Alta": "2024-01-01",
    "Área": "Finance",
    "Sueldo": "50000",
  },
];
const salaryMapping = {
  employeeId: "Código",
  name: "Nombre",
  email: "Correo",
  hireDate: "Alta",
  department: "Área",
  salary: "Sueldo", // mapped to prohibited key
};
const salaryVal = validateImportData(salaryRow, salaryMapping, "employees");
assert.equal(salaryVal.stats.valid, 0);
assert.equal(salaryVal.stats.invalid, 1);
console.log("  ✓ Prohibited salary field rejected in validation");

console.log("\n=== ALL HR IMPORTER UNIT TESTS PASSED SUCCESSFULLY! ===");
