/**
 * HR Analytics Metrics Engine.
 * A single, reusable, pure functional calculation engine.
 * No screen computes metrics on its own.
 *
 * Signature: compute(metricKey, rows, context, extraDatasets)
 */

import { useMemo } from "react";
import { assertNoSalaryFields } from "./constants.js";

/**
 * Returns date boundary objects based on year, month or custom date range in context.
 */
export function getPeriodBounds(context = {}) {
  const currentYear = context.year ? Number(context.year) : 2024;
  const currentMonth = context.month ? Number(context.month) : null;

  let startDate;
  let endDate;

  if (currentMonth) {
    startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
    endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59));
  } else {
    startDate = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0));
    endDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));
  }

  // Previous year boundaries for YoY comparisons
  const prevYear = currentYear - 1;
  let prevYearStartDate;
  let prevYearEndDate;

  if (currentMonth) {
    prevYearStartDate = new Date(Date.UTC(prevYear, currentMonth - 1, 1, 0, 0, 0));
    prevYearEndDate = new Date(Date.UTC(prevYear, currentMonth, 0, 23, 59, 59));
  } else {
    prevYearStartDate = new Date(Date.UTC(prevYear, 0, 1, 0, 0, 0));
    prevYearEndDate = new Date(Date.UTC(prevYear, 11, 31, 23, 59, 59));
  }

  // Previous month boundaries for MoM comparisons
  let prevMonthStartDate;
  let prevMonthEndDate;
  if (currentMonth) {
    const pmYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const pmMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    prevMonthStartDate = new Date(Date.UTC(pmYear, pmMonth - 1, 1, 0, 0, 0));
    prevMonthEndDate = new Date(Date.UTC(pmYear, pmMonth, 0, 23, 59, 59));
  } else {
    prevMonthStartDate = new Date(Date.UTC(currentYear, 10, 1, 0, 0, 0));
    prevMonthEndDate = new Date(Date.UTC(currentYear, 10, 30, 23, 59, 59));
  }

  return {
    year: currentYear,
    month: currentMonth,
    startDate,
    endDate,
    prevYearStartDate,
    prevYearEndDate,
    prevMonthStartDate,
    prevMonthEndDate,
  };
}

/**
 * Filters rows by contextual slicing (businessUnit, region, location, department, rating, etc.)
 * Does NOT filter by hire/term dates (that is handled per-metric according to period rules).
 */
export function filterEmployeeScope(rows = [], context = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return rows.filter((emp) => {
    if (context.employeeId && emp.employeeId !== context.employeeId) return false;
    if (context.businessUnit && emp.businessUnit !== context.businessUnit) return false;
    if (context.department && emp.department !== context.department) return false;
    if (context.region && emp.region !== context.region) return false;
    if (context.location && emp.location !== context.location) return false;
    if (context.orgLevel && emp.orgLevel !== context.orgLevel) return false;
    if (context.hireType && emp.hireType !== context.hireType) return false;
    if (context.gender && emp.gender !== context.gender) return false;
    if (context.shift && emp.shift !== context.shift) return false;
    if (context.performanceRating && emp.performanceRating !== context.performanceRating) return false;
    if (context.status && context.status !== "All" && emp.status !== context.status) return false;
    if (context.crossFilter?.dimension && emp[context.crossFilter.dimension] !== context.crossFilter.value) return false;
    return true;
  });
}

/**
 * Checks whether an employee was active at a specific point in time (asOfDate).
 */
export function isEmployeeActiveAt(emp, asOfDate) {
  const hire = emp.hireDate instanceof Date ? emp.hireDate : new Date(emp.hireDate);
  if (hire > asOfDate) return false;
  if (emp.terminationDate) {
    const term = emp.terminationDate instanceof Date ? emp.terminationDate : new Date(emp.terminationDate);
    if (term <= asOfDate) return false;
  }
  return true;
}

/**
 * Checks whether an employee was hired within the period.
 */
export function isHiredInPeriod(emp, startDate, endDate) {
  const hire = emp.hireDate instanceof Date ? emp.hireDate : new Date(emp.hireDate);
  return hire >= startDate && hire <= endDate;
}

/**
 * Checks whether an employee was terminated within the period.
 */
export function isTerminatedInPeriod(emp, startDate, endDate) {
  if (!emp.terminationDate) return false;
  const term = emp.terminationDate instanceof Date ? emp.terminationDate : new Date(emp.terminationDate);
  return term >= startDate && term <= endDate;
}

function selectPopulation(rows, bounds, population = "active") {
  if (population === "hires" || population === "joiners") {
    return rows.filter((employee) => isHiredInPeriod(employee, bounds.startDate, bounds.endDate));
  }
  if (population === "terminations" || population === "leavers") {
    return rows.filter((employee) => isTerminatedInPeriod(employee, bounds.startDate, bounds.endDate));
  }
  return rows.filter((employee) => isEmployeeActiveAt(employee, bounds.endDate));
}

function inPeriod(value, bounds) {
  const date = value instanceof Date
    ? value
    : (value?.toDate?.() || new Date(value));
  return Number.isFinite(date.getTime()) && date >= bounds.startDate && date <= bounds.endDate;
}

function employeeWasEmployedOn(employee, date) {
  const hireDate = employee.hireDate instanceof Date
    ? employee.hireDate
    : (employee.hireDate?.toDate?.() || new Date(employee.hireDate));
  if (!Number.isFinite(hireDate.getTime()) || hireDate > date) return false;
  if (!employee.terminationDate) return true;
  const terminationDate = employee.terminationDate instanceof Date
    ? employee.terminationDate
    : (employee.terminationDate?.toDate?.() || new Date(employee.terminationDate));
  return !Number.isFinite(terminationDate.getTime()) || terminationDate > date;
}

function getScopedAbsences(scope, absences, bounds) {
  const employeeById = new Map(scope.map((employee) => [employee.employeeId, employee]));
  return absences.flatMap((absence) => {
    if (!inPeriod(absence.date, bounds)) return [];
    const employee = employeeById.get(absence.employeeId);
    if (!employee) return [];
    const date = absence.date instanceof Date ? absence.date : new Date(absence.date);
    return employeeWasEmployedOn(employee, date) ? [{ absence, employee }] : [];
  });
}

/**
 * Master pure compute function.
 *
 * @param {string} metricKey - Key of the metric to compute
 * @param {Array} rows - Array of employee records
 * @param {Object} context - Filter context (year, month, businessUnit, etc.)
 * @param {Object} extraDatasets - { leaves, absences, snapshots }
 */
export function compute(metricKey, rows = [], context = {}, extraDatasets = {}) {
  assertNoSalaryFields(context);

  const scope = filterEmployeeScope(rows, context);
  const bounds = getPeriodBounds(context);

  switch (metricKey) {
    // ----------------- Headcount -----------------
    case "headCount": {
      return scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
    }

    // ----------------- Hires / Joiners -----------------
    case "hires":
    case "joiners": {
      return scope.filter((emp) => isHiredInPeriod(emp, bounds.startDate, bounds.endDate)).length;
    }

    // ----------------- Terminations / Leavers -----------------
    case "terminations":
    case "leavers": {
      return scope.filter((emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)).length;
    }

    // ----------------- YoY Variations (%) -----------------
    case "yoyHeadcount": {
      const current = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
      const prev = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.prevYearEndDate)).length;
      return prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;
    }

    case "yoyHires": {
      const current = scope.filter((emp) => isHiredInPeriod(emp, bounds.startDate, bounds.endDate)).length;
      const prev = scope.filter((emp) => isHiredInPeriod(emp, bounds.prevYearStartDate, bounds.prevYearEndDate)).length;
      return prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;
    }

    case "yoyTerminations": {
      const current = scope.filter((emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)).length;
      const prev = scope.filter((emp) => isTerminatedInPeriod(emp, bounds.prevYearStartDate, bounds.prevYearEndDate)).length;
      return prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;
    }

    // ----------------- Exit / Attrition Rates -----------------
    case "exitRate": {
      const activeStart = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.startDate)).length;
      const activeEnd = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
      const avgHeadcount = (activeStart + activeEnd) / 2;
      const terms = scope.filter((emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)).length;
      return avgHeadcount > 0 ? Math.round((terms / avgHeadcount) * 1000) / 10 : 0;
    }

    case "terminationRate": {
      const dimension = context.dimension || "department";
      const groups = new Map();
      scope.forEach((employee) => {
        const name = String(employee[dimension] || "Unknown");
        const group = groups.get(name) || {
          name,
          activeStart: 0,
          activeEnd: 0,
          terminations: 0,
        };
        if (isEmployeeActiveAt(employee, bounds.startDate)) group.activeStart += 1;
        if (isEmployeeActiveAt(employee, bounds.endDate)) group.activeEnd += 1;
        if (isTerminatedInPeriod(employee, bounds.startDate, bounds.endDate)) group.terminations += 1;
        groups.set(name, group);
      });

      return [...groups.values()]
        .filter((group) => group.activeStart > 0 || group.activeEnd > 0)
        .map((group) => {
          const averageHeadcount = (group.activeStart + group.activeEnd) / 2;
          return {
            name: group.name,
            count: averageHeadcount > 0
              ? Math.round((group.terminations / averageHeadcount) * 1000) / 10
              : 0,
            terminations: group.terminations,
            averageHeadcount,
          };
        })
        .sort((a, b) => b.count - a.count);
    }

    case "voluntaryRate": {
      const activeStart = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.startDate)).length;
      const activeEnd = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
      const avgHeadcount = (activeStart + activeEnd) / 2;
      const volTerms = scope.filter(
        (emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate) && emp.terminationCategory === "Voluntary"
      ).length;
      return avgHeadcount > 0 ? Math.round((volTerms / avgHeadcount) * 1000) / 10 : 0;
    }

    case "involuntaryRate": {
      const activeStart = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.startDate)).length;
      const activeEnd = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
      const avgHeadcount = (activeStart + activeEnd) / 2;
      const involTerms = scope.filter(
        (emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate) && emp.terminationCategory === "Involuntary"
      ).length;
      return avgHeadcount > 0 ? Math.round((involTerms / avgHeadcount) * 1000) / 10 : 0;
    }

    case "regularEmployeesRate": {
      const regularActiveStart = scope.filter(
        (emp) => emp.hireType === "Regular" && isEmployeeActiveAt(emp, bounds.startDate)
      ).length;
      const regularActiveEnd = scope.filter(
        (emp) => emp.hireType === "Regular" && isEmployeeActiveAt(emp, bounds.endDate)
      ).length;
      const avgRegularHc = (regularActiveStart + regularActiveEnd) / 2;
      const regularTerms = scope.filter(
        (emp) => emp.hireType === "Regular" && isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)
      ).length;
      return avgRegularHc > 0 ? Math.round((regularTerms / avgRegularHc) * 1000) / 10 : 0;
    }

    // ----------------- Diversity / Leadership -----------------
    case "femaleLeadersPct": {
      const highLevel = scope.filter(
        (emp) => emp.orgLevel === "High-Level" && isEmployeeActiveAt(emp, bounds.endDate)
      );
      const femaleHighLevel = highLevel.filter((emp) => emp.gender === "Female").length;
      return highLevel.length > 0 ? Math.round((femaleHighLevel / highLevel.length) * 1000) / 10 : 0;
    }

    // ----------------- Averages -----------------
    case "avgTenure": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      if (active.length === 0) return 0;
      const totalTenure = active.reduce((sum, emp) => sum + (emp.tenureYears || 0), 0);
      return Math.round((totalTenure / active.length) * 10) / 10;
    }

    case "avgAge": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      if (active.length === 0) return 0;
      const totalAge = active.reduce((sum, emp) => sum + (emp.age || 0), 0);
      return Math.round((totalAge / active.length) * 10) / 10;
    }

    // ----------------- MoM Headcount (%) -----------------
    case "momHeadcountPct": {
      const current = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;
      const prev = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.prevMonthEndDate)).length;
      return prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;
    }

    // ----------------- Absenteeism Rate (%) -----------------
    case "absenteeismRate": {
      if (!(extraDatasets.absences || []).length) return null;
      const periodEmployees = scope.filter((employee) =>
        isEmployeeActiveAt(employee, bounds.startDate) || isEmployeeActiveAt(employee, bounds.endDate)
      );
      const startHeadcount = scope.filter((employee) => isEmployeeActiveAt(employee, bounds.startDate)).length;
      const endHeadcount = scope.filter((employee) => isEmployeeActiveAt(employee, bounds.endDate)).length;
      const absences = getScopedAbsences(scope, extraDatasets.absences || [], bounds);
      const totalDays = absences.reduce((sum, { absence }) => sum + (Number(absence.days) || 1), 0);
      const averageHeadcount = periodEmployees.length ? (startHeadcount + endHeadcount) / 2 : 0;
      const workingDays = bounds.month ? 20 : 240;
      const expectedDays = Math.max(1, averageHeadcount * workingDays);
      return Math.round((totalDays / expectedDays) * 1000) / 10;
    }

    case "regularJoinerRate": {
      const hires = scope.filter((employee) => isHiredInPeriod(employee, bounds.startDate, bounds.endDate));
      return hires.length
        ? Math.round((hires.filter((employee) => employee.hireType === "Regular").length / hires.length) * 1000) / 10
        : 0;
    }

    case "femaleLeadersJoinersPct": {
      const leaders = scope.filter((employee) =>
        employee.orgLevel === "High-Level" &&
        employee.gender === "Female" &&
        isHiredInPeriod(employee, bounds.startDate, bounds.endDate)
      );
      const joinerLeaders = scope.filter((employee) =>
        employee.orgLevel === "High-Level" &&
        isHiredInPeriod(employee, bounds.startDate, bounds.endDate)
      );
      return joinerLeaders.length ? Math.round((leaders.length / joinerLeaders.length) * 1000) / 10 : 0;
    }

    case "averageJoinersPerDay": {
      const joiners = scope.filter((employee) => isHiredInPeriod(employee, bounds.startDate, bounds.endDate)).length;
      let workingDays = 0;
      for (const date = new Date(bounds.startDate); date <= bounds.endDate; date.setUTCDate(date.getUTCDate() + 1)) {
        const weekday = date.getUTCDay();
        if (weekday !== 0 && weekday !== 6) workingDays += 1;
      }
      return workingDays ? Math.round((joiners / workingDays) * 100) / 100 : 0;
    }

    case "absenceDistribution": {
      const dimension = context.dimension || "shift";
      const groups = new Map();
      getScopedAbsences(scope, extraDatasets.absences || [], bounds).forEach(({ absence, employee }) => {
        const key = String(dimension === "shift" ? absence.shift || employee.shift || "Unknown" : employee[dimension] || "Unknown");
        const group = groups.get(key) || { name: key, count: 0, records: 0 };
        group.count += Number(absence.days) || 1;
        group.records += 1;
        groups.set(key, group);
      });
      return [...groups.values()].sort((a, b) => b.count - a.count);
    }

    case "absenceCrossMatrix": {
      const dimensionA = context.dimensionA || "hireType";
      const dimensionB = context.dimensionB || "ageBand";
      const rowsByGroup = new Map();
      getScopedAbsences(scope, extraDatasets.absences || [], bounds).forEach(({ absence, employee }) => {
        const rowName = String(employee[dimensionA] || "Unknown");
        const columnName = String(dimensionB === "shift" ? absence.shift || employee.shift || "Unknown" : employee[dimensionB] || "Unknown");
        const row = rowsByGroup.get(rowName) || { name: rowName };
        row[columnName] = (row[columnName] || 0) + (Number(absence.days) || 1);
        rowsByGroup.set(rowName, row);
      });
      return [...rowsByGroup.values()];
    }

    // ----------------- Leave Averages -----------------
    case "avgTotalLeaveDays": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      if (active.length === 0) return 0;
      const activeIds = new Set(active.map((e) => e.employeeId));
      const leaves = (extraDatasets.leaves || []).filter((l) => {
        if (!activeIds.has(l.employeeId)) return false;
        const d = new Date(l.date);
        return d >= bounds.startDate && d <= bounds.endDate;
      });
      const totalDays = leaves.reduce((sum, l) => sum + (l.days || 0), 0);
      return Math.round((totalDays / active.length) * 10) / 10;
    }

    case "avgSickDays": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      if (active.length === 0) return 0;
      const activeIds = new Set(active.map((e) => e.employeeId));
      const sickLeaves = (extraDatasets.leaves || []).filter((l) => {
        if (!activeIds.has(l.employeeId) || l.type !== "Sick") return false;
        const d = new Date(l.date);
        return d >= bounds.startDate && d <= bounds.endDate;
      });
      const totalDays = sickLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
      return Math.round((totalDays / active.length) * 10) / 10;
    }

    case "avgAnnualDays": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      if (active.length === 0) return 0;
      const activeIds = new Set(active.map((e) => e.employeeId));
      const annualLeaves = (extraDatasets.leaves || []).filter((l) => {
        if (!activeIds.has(l.employeeId) || l.type !== "Annual") return false;
        const d = new Date(l.date);
        return d >= bounds.startDate && d <= bounds.endDate;
      });
      const totalDays = annualLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
      return Math.round((totalDays / active.length) * 10) / 10;
    }

    // ----------------- Generic 1D Distribution -----------------
    case "distribution": {
      const dimension = context.dimension || "gender";
      const population = selectPopulation(scope, bounds, context.population);
      const counts = {};
      population.forEach((emp) => {
        const val = emp[dimension] || "Unknown";
        counts[val] = (counts[val] || 0) + 1;
      });
      const total = population.length;
      return Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }));
    }

    // ----------------- 2D Cross Matrix -----------------
    case "crossMatrix": {
      const dimA = context.dimensionA || "orgLevel";
      const dimB = context.dimensionB || "hireType";
      const population = selectPopulation(scope, bounds, context.population);
      const matrix = {};

      population.forEach((emp) => {
        const valA = emp[dimA] || "Unknown";
        const valB = emp[dimB] || "Unknown";
        if (!matrix[valA]) matrix[valA] = {};
        matrix[valA][valB] = (matrix[valA][valB] || 0) + 1;
      });

      return Object.entries(matrix).map(([rowKey, colValues]) => ({
        name: rowKey,
        ...colValues,
      }));
    }

    case "sankeyData": {
      const dimensionA = context.dimensionA || "businessUnit";
      const dimensionB = context.dimensionB || "terminationReason";
      const population = selectPopulation(scope, bounds, context.population || "terminations");
      const leftNames = new Set();
      const rightNames = new Set();
      const linkCounts = new Map();

      population.forEach((employee) => {
        const sourceName = String(employee[dimensionA] || "Sin dato");
        const targetName = String(employee[dimensionB] || "Sin dato");
        leftNames.add(sourceName);
        rightNames.add(targetName);
        const key = `${sourceName}\u0000${targetName}`;
        linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
      });

      const names = [...leftNames, ...rightNames];
      const nodeIndex = new Map(names.map((name, index) => [name, index]));
      const nodes = names.map((name) => ({ name }));
      const links = [...linkCounts.entries()].map(([key, value]) => {
        const [sourceName, targetName] = key.split("\u0000");
        return {
          source: nodeIndex.get(sourceName),
          target: nodeIndex.get(targetName),
          value,
        };
      });
      return { nodes, links };
    }

    // ----------------- Monthly Trend (12 Months of Year) -----------------
    case "monthlyTrend": {
      const monthsData = [];
      const year = bounds.year;

      for (let m = 1; m <= 12; m++) {
        const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, m, 0, 23, 59, 59));

        const startPrevYear = new Date(Date.UTC(year - 1, m - 1, 1, 0, 0, 0));
        const endPrevYear = new Date(Date.UTC(year - 1, m, 0, 23, 59, 59));

        const hc = scope.filter((emp) => isEmployeeActiveAt(emp, end)).length;
        const hcPrevYear = scope.filter((emp) => isEmployeeActiveAt(emp, endPrevYear)).length;

        const hires = scope.filter((emp) => isHiredInPeriod(emp, start, end)).length;
        const terms = scope.filter((emp) => isTerminatedInPeriod(emp, start, end)).length;

        const hiresPrev = scope.filter((emp) => isHiredInPeriod(emp, startPrevYear, endPrevYear)).length;
        const termsPrev = scope.filter((emp) => isTerminatedInPeriod(emp, startPrevYear, endPrevYear)).length;

        const attritionRate = hc > 0 ? Math.round((terms / hc) * 1000) / 10 : 0;
        const attritionRateLY = hcPrevYear > 0 ? Math.round((termsPrev / hcPrevYear) * 1000) / 10 : 0;

        const monthLabel = new Intl.DateTimeFormat("es", { month: "short" }).format(start);

        monthsData.push({
          month: m,
          label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace(".", ""),
          headCount: hc,
          headCountLY: hcPrevYear,
          hires,
          hiresLY: hiresPrev,
          terminations: terms,
          terminationsLY: termsPrev,
          attritionRate,
          attritionRateLY,
        });
      }
      return monthsData;
    }

    case "monthlyFemaleLeadersTrend": {
      return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthEnd = new Date(Date.UTC(bounds.year, month, 0, 23, 59, 59));
        const active = scope.filter((employee) =>
          employee.orgLevel === "High-Level" && isEmployeeActiveAt(employee, monthEnd)
        );
        const femaleCount = active.filter((employee) => employee.gender === "Female").length;
        const monthDate = new Date(Date.UTC(bounds.year, index, 1));
        const monthLabel = new Intl.DateTimeFormat("es", { month: "short" }).format(monthDate);
        return {
          month,
          label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace(".", ""),
          value: active.length ? Math.round((femaleCount / active.length) * 1000) / 10 : 0,
        };
      });
    }

    // ----------------- Rolling 12 Months Joiners -----------------
    case "rolling12Joiners": {
      const rollingData = [];
      const anchorDate = bounds.endDate;

      for (let offset = 11; offset >= 0; offset--) {
        const d = new Date(anchorDate);
        d.setUTCMonth(d.getUTCMonth() - offset);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;

        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

        const joiners = scope.filter((emp) => isHiredInPeriod(emp, start, end)).length;
        const monthLabel = new Intl.DateTimeFormat("es", { month: "short" }).format(start);

        rollingData.push({
          period: `${y}-${String(m).padStart(2, "0")}`,
          label: `${monthLabel} ${String(y).slice(2)}`,
          joiners,
        });
      }
      return rollingData;
    }

    // ----------------- Joiners vs Leavers per Month -----------------
    case "joinersVsLeavers": {
      const year = bounds.year;
      const result = [];

      for (let m = 1; m <= 12; m++) {
        const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, m, 0, 23, 59, 59));

        const joiners = scope.filter((emp) => isHiredInPeriod(emp, start, end)).length;
        const leavers = scope.filter((emp) => isTerminatedInPeriod(emp, start, end)).length;
        const monthLabel = new Intl.DateTimeFormat("es", { month: "short" }).format(start);

        result.push({
          month: m,
          label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace(".", ""),
          joiners,
          leavers,
          netChange: joiners - leavers,
        });
      }
      return result;
    }

    // ----------------- MoM Waterfall -----------------
    case "waterfall": {
      const prevHc = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.prevMonthEndDate)).length;
      const joiners = scope.filter((emp) => isHiredInPeriod(emp, bounds.startDate, bounds.endDate)).length;
      const leavers = scope.filter((emp) => isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)).length;
      const currentHc = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate)).length;

      return [
        { stage: "Inicial", count: prevHc, isTotal: true },
        { stage: "Altas (+)", count: joiners, isIncrease: true },
        { stage: "Bajas (-)", count: -leavers, isDecrease: true },
        { stage: "Final", count: currentHc, isTotal: true },
      ];
    }

    // ----------------- Department Summary -----------------
    case "departmentSummary": {
      const deptMap = {};
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));

      active.forEach((emp) => {
        const d = emp.department || "Unknown";
        if (!deptMap[d]) {
          deptMap[d] = {
            department: d,
            headcount: 0,
            hires: 0,
            terminations: 0,
            femaleLeaders: 0,
            highLevelCount: 0,
          };
        }
        deptMap[d].headcount++;
        if (emp.orgLevel === "High-Level") {
          deptMap[d].highLevelCount++;
          if (emp.gender === "Female") deptMap[d].femaleLeaders++;
        }
      });

      scope.forEach((emp) => {
        const d = emp.department || "Unknown";
        if (!deptMap[d]) return;
        if (isHiredInPeriod(emp, bounds.startDate, bounds.endDate)) {
          deptMap[d].hires++;
        }
        if (isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)) {
          deptMap[d].terminations++;
        }
      });

      return Object.values(deptMap).map((d) => ({
        ...d,
        femaleLeadersPct:
          d.highLevelCount > 0 ? Math.round((d.femaleLeaders / d.highLevelCount) * 1000) / 10 : 0,
        attritionRate:
          d.headcount > 0 ? Math.round((d.terminations / d.headcount) * 1000) / 10 : 0,
      }));
    }

    // ----------------- Region Summary -----------------
    case "regionSummary": {
      const regMap = {};
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));

      active.forEach((emp) => {
        const reg = emp.region || "Central";
        if (!regMap[reg]) regMap[reg] = { region: reg, headcount: 0, hires: 0, terminations: 0 };
        regMap[reg].headcount++;
      });

      scope.forEach((emp) => {
        const reg = emp.region || "Central";
        if (!regMap[reg]) return;
        if (isHiredInPeriod(emp, bounds.startDate, bounds.endDate)) regMap[reg].hires++;
        if (isTerminatedInPeriod(emp, bounds.startDate, bounds.endDate)) regMap[reg].terminations++;
      });

      return Object.values(regMap);
    }

    // ----------------- Attrition Prediction Summary -----------------
    case "attritionPredictionSummary": {
      const active = scope.filter((emp) => isEmployeeActiveAt(emp, bounds.endDate));
      const low = active.filter((emp) => emp.riskLevel === "Low").length;
      const medium = active.filter((emp) => emp.riskLevel === "Medium").length;
      const peak = active.filter((emp) => emp.riskLevel === "Peak").length;
      const total = active.length;

      return {
        total,
        low: { count: low, pct: total > 0 ? Math.round((low / total) * 1000) / 10 : 0 },
        medium: { count: medium, pct: total > 0 ? Math.round((medium / total) * 1000) / 10 : 0 },
        peak: { count: peak, pct: total > 0 ? Math.round((peak / total) * 1000) / 10 : 0 },
      };
    }

    // ----------------- Summary Board Narrative -----------------
    case "summaryBoardNarrative": {
      const deptSummary = compute("departmentSummary", rows, context, extraDatasets);
      const joinersLeavers = compute("joinersVsLeavers", rows, context, extraDatasets);

      if (deptSummary.length === 0) {
        return ["No hay datos suficientes para el periodo seleccionado."];
      }

      // Dept with highest & lowest headcount
      const sortedByHc = [...deptSummary].sort((a, b) => b.headcount - a.headcount);
      const highestDept = sortedByHc[0];
      const lowestDept = sortedByHc[sortedByHc.length - 1];

      // Month with highest joiners
      const sortedByJoiners = [...joinersLeavers].sort((a, b) => b.joiners - a.joiners);
      const peakJoinersMonth = sortedByJoiners[0];

      // Month with largest divergence between joiners and leavers
      const sortedByDivergence = [...joinersLeavers].sort(
        (a, b) => Math.abs(b.netChange) - Math.abs(a.netChange)
      );
      const maxDivergenceMonth = sortedByDivergence[0];

      // Dominant gender
      const genderDist = compute("distribution", rows, { ...context, dimension: "gender" });
      const dominantGender = [...genderDist].sort((a, b) => b.count - a.count)[0];

      const statements = [
        `El departamento con mayor plantilla es ${highestDept.department} (${highestDept.headcount} colaboradores), mientras que ${lowestDept.department} registra la menor dotación (${lowestDept.headcount} colaboradores).`,
        `La distribución de talento presenta preponderancia de género ${dominantGender?.name || "Homogénea"} (${dominantGender?.pct || 0}% de la dotación activa).`,
        `El mes con mayor incorporación de talento fue ${peakJoinersMonth?.label} con ${peakJoinersMonth?.joiners} nuevos ingresos.`,
        `La mayor divergencia entre altas y bajas ocurrió en ${maxDivergenceMonth?.label}, con una variación neta de ${maxDivergenceMonth?.netChange > 0 ? "+" : ""}${maxDivergenceMonth?.netChange} colaboradores.`,
      ];

      return statements;
    }

    default:
      throw new Error(`Métrica no soportada en HR Metrics Engine: "${metricKey}"`);
  }
}

/**
 * Custom React hook for memoized HR metric computation.
 */
export function useHrMetric(metricKey, rows = [], context = {}, extraDatasets = {}) {
  return useMemo(() => {
    return compute(metricKey, rows, context, extraDatasets);
  }, [metricKey, rows, context, extraDatasets]);
}
