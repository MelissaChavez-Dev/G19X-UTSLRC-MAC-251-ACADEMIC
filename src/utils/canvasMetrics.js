import { calculateSemanticMetrics, evaluateAggregation } from "./semanticMetrics.js";

export const CUSTOM_AGGREGATIONS = ["AVG", "SUM", "COUNT", "PERCENTAGE"];
export const WIDGET_DATE_RANGES = [7, 14, 30];

function recordDate(record) {
  if (record.date?.toDate) return record.date.toDate();
  if (record.date instanceof Date) return record.date;
  const date = new Date(record.date);
  return Number.isFinite(date.getTime()) ? date : null;
}

function filterByWidgetDate(records, days, now = new Date()) {
  const safeDays = WIDGET_DATE_RANGES.includes(days) ? days : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - safeDays);
  return records.filter((record) => {
    const date = recordDate(record);
    return date && date <= now && date >= start;
  });
}

function groupRecords(records, groupBy) {
  const groups = new Map();
  records.forEach((record) => {
    const date = recordDate(record);
    const key = groupBy === "department"
      ? String(record.department || "Sin departamento")
      : groupBy === "date"
        ? (date ? date.toISOString().slice(0, 10) : "")
        : "total";
    if (!key) return;
    const group = groups.get(key) || { key, records: [], date };
    group.records.push(record);
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => {
    if (groupBy === "date") return a.key.localeCompare(b.key);
    return a.key.localeCompare(b.key, "es");
  });
}

function aggregateCustomGroup(records, definition, metricCatalog) {
  const valueField = definition.metricId;
  const numeratorField = definition.numeratorMetricId;
  const denominatorField = definition.denominatorMetricId;
  const isPercentage = definition.aggregation === "PERCENTAGE";
  const fields = isPercentage ? [numeratorField, denominatorField] : [valueField];
  const valuesByField = new Map(fields.map((field) => [field, []]));
  let invalidCount = 0;

  records.forEach((record) => {
    const recordValues = new Map();
    let recordMissing = false;
    let recordInvalid = false;
    fields.forEach((field) => {
      const value = record.metrics?.[field];
      if (value === null || value === undefined) {
        recordMissing = true;
        return;
      }
      const sourceMetric = metricCatalog.find((metric) => metric.id === field);
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (sourceMetric && (value < sourceMetric.minValue || value > sourceMetric.maxValue))
      ) {
        invalidCount += 1;
        recordInvalid = true;
        return;
      }
      recordValues.set(field, value);
    });
    if (!recordMissing && !recordInvalid) {
      fields.forEach((field) => valuesByField.get(field).push(recordValues.get(field)));
    }
  });

  if (invalidCount) {
    return { value: null, count: 0, invalidCount, error: "Algunos valores no cumplen el tipo o rango de su métrica fuente." };
  }

  try {
    let value;
    let count;
    if (isPercentage) {
      const numerator = evaluateAggregation("SUM", valuesByField.get(numeratorField) || []);
      const denominator = evaluateAggregation("SUM", valuesByField.get(denominatorField) || []);
      value = numerator === null || denominator === null
        ? null
        : evaluateAggregation("PERCENTAGE", [], { numerator, denominator });
      count = Math.min(
        valuesByField.get(numeratorField)?.length || 0,
        valuesByField.get(denominatorField)?.length || 0
      );
    } else {
      const values = valuesByField.get(valueField) || [];
      value = evaluateAggregation(definition.aggregation, values);
      count = values.length;
    }
    return {
      value,
      count,
      invalidCount: 0,
      error: "",
    };
  } catch (error) {
    return {
      value: null,
      count: 0,
      invalidCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatGroupLabel(group, groupBy) {
  if (groupBy === "date" && group.date) {
    return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" }).format(group.date);
  }
  return group.key === "total" ? "Total" : group.key;
}

export function calculateCanvasWidget(records, metric, widget, metricCatalog = []) {
  const filteredRecords = filterByWidgetDate(records, widget.dateRangeDays);
  const definition = widget.metricDefinition;

  if (!definition) {
    const result = calculateSemanticMetrics(filteredRecords, [metric])[0];
    const groups = groupRecords(filteredRecords, "date").map((group) => {
      const calculated = calculateSemanticMetrics(group.records, [metric])[0];
      return {
        label: formatGroupLabel(group, "date"),
        value: calculated.value,
        count: calculated.count,
        date: group.date,
      };
    }).filter((group) => group.value !== null);
    return { ...result, records: filteredRecords, groups };
  }

  if (!CUSTOM_AGGREGATIONS.includes(definition.aggregation)) {
    return {
      value: null,
      count: 0,
      invalidCount: 0,
      error: "La agregación personalizada no está permitida.",
      records: filteredRecords,
      groups: [],
    };
  }

  const groupBy = ["department", "date"].includes(definition.groupBy)
    ? definition.groupBy
    : "date";
  const result = aggregateCustomGroup(filteredRecords, definition, metricCatalog);
  const groups = groupRecords(filteredRecords, groupBy).map((group) => ({
    ...aggregateCustomGroup(group.records, definition, metricCatalog),
    label: formatGroupLabel(group, groupBy),
    date: group.date,
  })).filter((group) => group.value !== null);

  return { ...result, records: filteredRecords, groups };
}
