/**
 * HR Analytics Global and Page-level Filter Context.
 * Manages active slicers, cross-filtering from visual clicks,
 * dynamic years derived from data, and optional slicer synchronization.
 */

import { useMemo, useState } from "react";
import { assertNoSalaryFields } from "../constants";
import { HrFilterContext } from "./HrFilterContext.js";

export function HrFilterProvider({ children, employees = [], initialFilters = {} }) {
  const [filters, setFilters] = useState(() => {
    const employeeYears = employees.flatMap((employee) => [
      employee.hireDate ? new Date(employee.hireDate).getFullYear() : null,
      employee.terminationDate ? new Date(employee.terminationDate).getFullYear() : null,
    ]).filter((year) => Number.isFinite(year));
    return {
      year: initialFilters.year ?? (employeeYears.length ? Math.max(...employeeYears) : 2024),
      month: initialFilters.month ?? null,
      businessUnit: initialFilters.businessUnit ?? null,
      department: initialFilters.department ?? null,
      region: initialFilters.region ?? null,
      location: initialFilters.location ?? null,
      performanceRating: initialFilters.performanceRating ?? null,
      employeeId: initialFilters.employeeId ?? null,
      crossFilter: null,
    };
  });

  // Dynamic years calculated from employees data (never hardcoded)
  const availableYears = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const years = new Set();
    employees.forEach((emp) => {
      if (emp.hireDate) {
        const y = new Date(emp.hireDate).getFullYear();
        if (Number.isFinite(y) && y >= 2000 && y <= 2030) years.add(y);
      }
      if (emp.terminationDate) {
        const y = new Date(emp.terminationDate).getFullYear();
        if (Number.isFinite(y) && y >= 2000 && y <= 2030) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [employees]);

  // Dynamic lists from active data
  const availableBusinessUnits = useMemo(() => {
    const bus = new Set(employees.map((e) => e.businessUnit).filter(Boolean));
    return Array.from(bus).sort();
  }, [employees]);

  const availableDepartments = useMemo(() => {
    const list = employees
      .filter((e) => !filters.businessUnit || e.businessUnit === filters.businessUnit)
      .map((e) => e.department)
      .filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees, filters.businessUnit]);

  const availableRegions = useMemo(() => {
    const regs = new Set(employees.map((e) => e.region).filter(Boolean));
    return Array.from(regs).sort();
  }, [employees]);

  const availableLocations = useMemo(() => {
    const locs = employees
      .filter((e) => !filters.region || e.region === filters.region)
      .map((e) => e.location)
      .filter(Boolean);
    return Array.from(new Set(locs)).sort();
  }, [employees, filters.region]);

  function setFilter(key, value) {
    assertNoSalaryFields({ [key]: value });
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset department if businessUnit changes and department doesn't belong to it
      if (key === "businessUnit") next.department = null;
      if (key === "region") next.location = null;
      return next;
    });
  }

  function toggleCrossFilter(dimension, value) {
    setFilters((prev) => {
      if (
        prev.crossFilter &&
        prev.crossFilter.dimension === dimension &&
        prev.crossFilter.value === value
      ) {
        // Second click on same item clears the cross-filter
        return { ...prev, crossFilter: null };
      }
      return { ...prev, crossFilter: { dimension, value } };
    });
  }

  function clearAllFilters() {
    setFilters({
      year: availableYears[availableYears.length - 1] ?? filters.year,
      month: null,
      businessUnit: null,
      department: null,
      region: null,
      location: null,
      performanceRating: null,
      employeeId: null,
      crossFilter: null,
    });
  }

  // Combined active context for compute()
  const activeContext = useMemo(() => {
    const ctx = {
      year: filters.year,
      month: filters.month,
      businessUnit: filters.businessUnit,
      department: filters.department,
      region: filters.region,
      location: filters.location,
      performanceRating: filters.performanceRating,
      employeeId: filters.employeeId,
      crossFilter: filters.crossFilter,
    };
    if (filters.crossFilter?.dimension && filters.crossFilter?.value) {
      ctx[filters.crossFilter.dimension] = filters.crossFilter.value;
    }
    return ctx;
  }, [filters]);

  const value = {
    filters,
    activeContext,
    availableYears,
    availableBusinessUnits,
    availableDepartments,
    availableRegions,
    availableLocations,
    setFilter,
    toggleCrossFilter,
    clearAllFilters,
  };

  return (
    <HrFilterContext.Provider value={value}>
      {children}
    </HrFilterContext.Provider>
  );
}
