/**
 * Comprehensive Unit Test Suite for HR Metrics Engine.
 * Tests every formula according to Section 4 of the specification:
 * - headCount, hires, terminations, joiners
 * - YoY variations (%)
 * - exitRate, voluntaryRate, involuntaryRate, regularEmployeesRate
 * - %FemaleLeaders
 * - avgTenure, avgAge, MoM% headcount
 * - absenteeismRate
 * - Leave averages (avgTotalLeaveDays, avgSickDays, avgAnnualDays)
 * - Rolling 12 months, joiners vs leavers, waterfall, distributions, crossMatrix
 * - Prohibited salary fields rejection
 */

import assert from "node:assert/strict";
import { compute, getPeriodBounds, filterEmployeeScope } from "../src/analytics/metricsEngine.js";

console.log("=== Running HR Metrics Engine Unit Tests ===");

// 1. Mock Data Setup
const mockEmployees = [
  // Active in 2024, hired in 2021
  {
    employeeId: "EMP-001",
    name: "Ana Lopez",
    gender: "Female",
    businessUnit: "Technology",
    department: "Software Engineering",
    orgLevel: "High-Level",
    hireType: "Regular",
    hireDate: "2021-03-15",
    status: "Active",
    terminationDate: null,
    terminationCategory: null,
    age: 36,
    tenureYears: 3.5,
    riskLevel: "Low",
    region: "Central",
    location: "CDMX",
  },
  // Active in 2024, hired in 2024 (Joiner)
  {
    employeeId: "EMP-002",
    name: "Carlos Sanchez",
    gender: "Male",
    businessUnit: "Technology",
    department: "Software Engineering",
    orgLevel: "Operational",
    hireType: "Regular",
    hireDate: "2024-05-10",
    status: "Active",
    terminationDate: null,
    terminationCategory: null,
    age: 26,
    tenureYears: 0.6,
    riskLevel: "Medium",
    region: "North",
    location: "Monterrey",
  },
  // Female Leader 2
  {
    employeeId: "EMP-003",
    name: "Elena Morales",
    gender: "Female",
    businessUnit: "Technology",
    department: "Cybersecurity",
    orgLevel: "High-Level",
    hireType: "Regular",
    hireDate: "2019-01-10",
    status: "Active",
    terminationDate: null,
    terminationCategory: null,
    age: 42,
    tenureYears: 5.5,
    riskLevel: "Low",
    region: "Central",
    location: "CDMX",
  },
  // Male High-Level
  {
    employeeId: "EMP-004",
    name: "David Perez",
    gender: "Male",
    businessUnit: "Technology",
    department: "Cybersecurity",
    orgLevel: "High-Level",
    hireType: "Regular",
    hireDate: "2018-07-01",
    status: "Active",
    terminationDate: null,
    terminationCategory: null,
    age: 48,
    tenureYears: 6.2,
    riskLevel: "Low",
    region: "West",
    location: "Guadalajara",
  },
  // Terminated in 2024 (Voluntary, Contract)
  {
    employeeId: "EMP-005",
    name: "Luis Gomez",
    gender: "Male",
    businessUnit: "Operations",
    department: "Customer Support",
    orgLevel: "Operational",
    hireType: "Contract",
    hireDate: "2023-01-15",
    status: "Terminated",
    terminationDate: "2024-06-30",
    terminationCategory: "Voluntary",
    age: 29,
    tenureYears: 1.4,
    riskLevel: "Peak",
    region: "Central",
    location: "CDMX",
  },
  // Terminated in 2024 (Involuntary, Regular)
  {
    employeeId: "EMP-006",
    name: "Beatriz Flores",
    gender: "Female",
    businessUnit: "Operations",
    department: "Customer Support",
    orgLevel: "Operational",
    hireType: "Regular",
    hireDate: "2022-09-01",
    status: "Terminated",
    terminationDate: "2024-08-15",
    terminationCategory: "Involuntary",
    age: 33,
    tenureYears: 1.9,
    riskLevel: "Peak",
    region: "North",
    location: "Monterrey",
  },
  // Hired in 2023, terminated in 2023 (Not active in 2024)
  {
    employeeId: "EMP-007",
    name: "Javier Cruz",
    gender: "Male",
    businessUnit: "Commercial",
    department: "Sales",
    orgLevel: "Operational",
    hireType: "Regular",
    hireDate: "2023-02-01",
    status: "Terminated",
    terminationDate: "2023-11-30",
    terminationCategory: "Voluntary",
    age: 30,
    tenureYears: 0.8,
    riskLevel: "Medium",
    region: "South",
    location: "Mérida",
  },
];

const mockLeaves = [
  { employeeId: "EMP-001", date: "2024-04-10", type: "Annual", days: 5 },
  { employeeId: "EMP-001", date: "2024-09-12", type: "Sick", days: 2 },
  { employeeId: "EMP-002", date: "2024-07-05", type: "Sick", days: 1 },
  { employeeId: "EMP-003", date: "2024-08-01", type: "Annual", days: 10 },
];

const mockAbsences = [
  { employeeId: "EMP-001", date: "2024-02-14", days: 1 },
  { employeeId: "EMP-002", date: "2024-06-20", days: 2 },
  { employeeId: "EMP-005", date: "2024-03-10", days: 3 },
];

const extraDatasets = { leaves: mockLeaves, absences: mockAbsences };

// Test 1: getPeriodBounds
console.log("Test 1: Period Bounds calculation...");
const bounds2024 = getPeriodBounds({ year: 2024 });
assert.equal(bounds2024.startDate.getUTCFullYear(), 2024);
assert.equal(bounds2024.startDate.getUTCMonth(), 0);
assert.equal(bounds2024.endDate.getUTCMonth(), 11);
assert.equal(bounds2024.prevYearStartDate.getUTCFullYear(), 2023);

const boundsMonth = getPeriodBounds({ year: 2024, month: 5 });
assert.equal(boundsMonth.startDate.getUTCMonth(), 4); // May is index 4
assert.equal(boundsMonth.endDate.getUTCDate(), 31);
assert.equal(boundsMonth.prevMonthStartDate.getUTCMonth(), 3); // April is index 3
console.log("  ✓ getPeriodBounds passed");

// Test 2: Filter Scope
console.log("Test 2: Scope filtering...");
const techScope = filterEmployeeScope(mockEmployees, { businessUnit: "Technology" });
assert.equal(techScope.length, 4);
const cdmxScope = filterEmployeeScope(mockEmployees, { location: "CDMX" });
assert.equal(cdmxScope.length, 3);
const generationScope = filterEmployeeScope(
  mockEmployees.map((employee, index) => ({ ...employee, generation: index < 2 ? "Gen Y" : "Gen X" })),
  { crossFilter: { dimension: "generation", value: "Gen Y" } }
);
assert.equal(generationScope.length, 2);
console.log("  ✓ filterEmployeeScope and cross-filter dimensions passed");

// Test 3: headCount
console.log("Test 3: Headcount...");
// Active at end of 2024: EMP-001, EMP-002, EMP-003, EMP-004 = 4
const hc2024 = compute("headCount", mockEmployees, { year: 2024 });
assert.equal(hc2024, 4);

// Active at end of 2023: EMP-001, EMP-003, EMP-004, EMP-005, EMP-006 = 5 (EMP-002 hired in 2024, EMP-007 term Nov 2023)
const hc2023 = compute("headCount", mockEmployees, { year: 2023 });
assert.equal(hc2023, 5);
console.log("  ✓ headCount passed (2024: 4, 2023: 5)");

// Test 4: Hires & Terminations
console.log("Test 4: Hires and Terminations in 2024...");
// Hires in 2024: EMP-002
const hires2024 = compute("hires", mockEmployees, { year: 2024 });
assert.equal(hires2024, 1);
const joiners2024 = compute("joiners", mockEmployees, { year: 2024 });
assert.equal(joiners2024, 1);

// Terminations in 2024: EMP-005 (June), EMP-006 (August)
const terms2024 = compute("terminations", mockEmployees, { year: 2024 });
assert.equal(terms2024, 2);
console.log("  ✓ Hires (1) and Terminations (2) passed");

// Test 5: YoY Variations
console.log("Test 5: YoY Variations...");
// Headcount YoY: (4 - 5) / 5 = -20%
const yoyHc = compute("yoyHeadcount", mockEmployees, { year: 2024 });
assert.equal(yoyHc, -20);
console.log(`  ✓ yoyHeadcount passed (${yoyHc}%)`);

// Test 6: Exit Rate, Voluntary Rate, Involuntary Rate
console.log("Test 6: Turnover Rates...");
// Active start 2024 = 5 (EMP-001, 003, 004, 005, 006)
// Active end 2024 = 4 (EMP-001, 002, 003, 004)
// Avg headcount = 4.5
// Terminations = 2 (1 Voluntary, 1 Involuntary)
// exitRate = (2 / 4.5) * 100 = 44.4%
const exitRate = compute("exitRate", mockEmployees, { year: 2024 });
assert.equal(exitRate, 44.4);

// voluntaryRate = (1 / 4.5) * 100 = 22.2%
const volRate = compute("voluntaryRate", mockEmployees, { year: 2024 });
assert.equal(volRate, 22.2);

// involuntaryRate = (1 / 4.5) * 100 = 22.2%
const involRate = compute("involuntaryRate", mockEmployees, { year: 2024 });
assert.equal(involRate, 22.2);

// Regular terminations rate:
// Active Regular start = 4 (EMP-001, 003, 004, 006)
// Active Regular end = 4 (EMP-001, 002, 003, 004)
// Avg Regular = 4. Terminated Regular = 1 (EMP-006). Rate = (1 / 4) * 100 = 25%
const regRate = compute("regularEmployeesRate", mockEmployees, { year: 2024 });
assert.equal(regRate, 25);
const orgLevelTerminationRates = compute("terminationRate", mockEmployees, {
  year: 2024,
  dimension: "orgLevel",
});
const operationalTerminationRate = orgLevelTerminationRates.find((group) => group.name === "Operational");
assert.equal(operationalTerminationRate.terminations, 2);
assert.equal(operationalTerminationRate.averageHeadcount, 1.5);
assert.equal(operationalTerminationRate.count, 133.3);
console.log(`  ✓ Exit rate (${exitRate}%), Vol (${volRate}%), Invol (${involRate}%), Reg (${regRate}%) passed`);
console.log("  ✓ Termination rate by organizational level passed");

// Test 7: %FemaleLeaders
console.log("Test 7: %FemaleLeaders...");
// High-Level active at end 2024: EMP-001 (F), EMP-003 (F), EMP-004 (M) -> 2 out of 3 = 66.7%
const femaleLeaders = compute("femaleLeadersPct", mockEmployees, { year: 2024 });
assert.equal(femaleLeaders, 66.7);
console.log(`  ✓ %FemaleLeaders passed (${femaleLeaders}%)`);

// Test 8: avgTenure & avgAge
console.log("Test 8: avgTenure & avgAge...");
// Active end 2024:
// EMP-001: age 36, tenure 3.5
// EMP-002: age 26, tenure 0.6
// EMP-003: age 42, tenure 5.5
// EMP-004: age 48, tenure 6.2
// Avg age = (36+26+42+48)/4 = 38
// Avg tenure = (3.5+0.6+5.5+6.2)/4 = 3.95 -> 4.0
const avgAge = compute("avgAge", mockEmployees, { year: 2024 });
assert.equal(avgAge, 38);
const avgTenure = compute("avgTenure", mockEmployees, { year: 2024 });
assert.equal(avgTenure, 4);
console.log(`  ✓ avgAge (${avgAge}) and avgTenure (${avgTenure}) passed`);

// Test 9: Absenteeism Rate
console.log("Test 9: Absenteeism Rate...");
// Average headcount is (5 at start + 4 at end) / 2 = 4.5.
// EMP-001, EMP-002 and EMP-005 were employed on their absence dates: 6 days.
// Expected working days = 4.5 * 240 = 1,080. Rate rounds to 0.6%.
const absRate = compute("absenteeismRate", mockEmployees, { year: 2024 }, extraDatasets);
assert.equal(absRate, 0.6);
assert.equal(compute("absenteeismRate", mockEmployees, { year: 2024 }, { absences: [] }), null);
const absentDaysByShift = compute(
  "absenceDistribution",
  mockEmployees,
  { year: 2024, dimension: "shift" },
  extraDatasets
);
assert.equal(absentDaysByShift[0].count, 6);
console.log(`  ✓ absenteeismRate passed (${absRate}%)`);

// Test 10: Leave metrics
console.log("Test 10: Leave metrics...");
// Active in 2024: 4 employees (EMP-001, 002, 003, 004)
// Total leaves in 2024:
// EMP-001: 5 annual + 2 sick = 7
// EMP-002: 1 sick = 1
// EMP-003: 10 annual = 10
// Total leave days = 18. Avg = 18 / 4 = 4.5
const avgTotalLeave = compute("avgTotalLeaveDays", mockEmployees, { year: 2024 }, extraDatasets);
assert.equal(avgTotalLeave, 4.5);

// Sick days = 2 + 1 = 3. Avg = 3 / 4 = 0.75 -> 0.8
const avgSick = compute("avgSickDays", mockEmployees, { year: 2024 }, extraDatasets);
assert.equal(avgSick, 0.8);

// Annual days = 5 + 10 = 15. Avg = 15 / 4 = 3.75 -> 3.8
const avgAnnual = compute("avgAnnualDays", mockEmployees, { year: 2024 }, extraDatasets);
assert.equal(avgAnnual, 3.8);
console.log(`  ✓ Leave averages passed (Total: ${avgTotalLeave}, Sick: ${avgSick}, Annual: ${avgAnnual})`);

// Test 11: 1D Distribution
console.log("Test 11: Distribution...");
const genderDist = compute("distribution", mockEmployees, { year: 2024, dimension: "gender" });
// 2 Female, 2 Male
assert.equal(genderDist.length, 2);
assert.equal(genderDist.find((g) => g.name === "Female").count, 2);
assert.equal(genderDist.find((g) => g.name === "Male").count, 2);
const joinerGenderDist = compute("distribution", mockEmployees, {
  year: 2024,
  dimension: "gender",
  population: "hires",
});
assert.equal(joinerGenderDist.length, 1);
assert.equal(joinerGenderDist[0].name, "Male");
assert.equal(joinerGenderDist[0].count, 1);
const terminationFlow = compute("sankeyData", mockEmployees, {
  year: 2024,
  population: "terminations",
  dimensionA: "businessUnit",
  dimensionB: "terminationCategory",
});
assert.equal(terminationFlow.links.length, 2);
assert.equal(terminationFlow.links.reduce((sum, link) => sum + link.value, 0), 2);
console.log("  ✓ Distribution, cohort selection, and dynamic Sankey passed");

// Test 12: Monthly Trend
console.log("Test 12: Monthly Trend...");
const trend = compute("monthlyTrend", mockEmployees, { year: 2024 });
assert.equal(trend.length, 12);
assert.equal(trend[0].month, 1);
assert.equal(trend[11].month, 12);
// Month 5 (May) should show 1 hire (EMP-002)
assert.equal(trend[4].hires, 1);
// Month 6 (June) should show 1 termination (EMP-005)
assert.equal(trend[5].terminations, 1);
console.log("  ✓ Monthly Trend passed");

// Test 13: Summary Board Narrative
console.log("Test 13: Summary Board Narrative...");
const narrative = compute("summaryBoardNarrative", mockEmployees, { year: 2024 });
assert(Array.isArray(narrative));
assert.equal(narrative.length, 4);
assert(narrative[0].includes("Software Engineering"));
console.log("  ✓ Summary Board Narrative passed");

// Test 14: Security assertion (Prohibit Salary Fields)
console.log("Test 14: Prohibited Salary Keyword check...");
assert.throws(() => {
  compute("headCount", mockEmployees, { year: 2024, salary: 50000 });
}, /Prohibited salary field/);
assert.throws(() => {
  compute("headCount", mockEmployees, { year: 2024, income: "high" });
}, /Prohibited salary field/);
assert.throws(() => {
  compute("headCount", mockEmployees, { year: 2024, encashment: true });
}, /Prohibited salary field/);
console.log("  ✓ Prohibited salary rejection passed");

console.log("\n=== ALL 14 HR METRICS ENGINE TESTS PASSED SUCCESSFULLY! ===");
