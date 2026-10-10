const SUPPORTED_AGGREGATIONS = new Set(["AVG", "SUM", "COUNT", "PERCENTAGE"]);

function validNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function evaluateAggregation(aggregation, values, { numerator = 0, denominator = 0 } = {}) {
  if (!SUPPORTED_AGGREGATIONS.has(aggregation)) {
    throw new Error(`Operación semántica no permitida: ${aggregation}.`);
  }
  if (!Array.isArray(values) || values.some((value) => !validNumber(value))) {
    throw new Error("La operación recibió valores que no son números finitos.");
  }

  switch (aggregation) {
    case "AVG":
      return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
    case "SUM":
      return values.length ? values.reduce((total, value) => total + value, 0) : null;
    case "COUNT":
      return values.length;
    case "PERCENTAGE":
      if (!validNumber(numerator) || !validNumber(denominator) || numerator < 0 || denominator <= 0 || numerator > denominator) {
        throw new Error("El porcentaje requiere numerador y denominador válidos, con numerador no mayor al denominador.");
      }
      return (numerator / denominator) * 100;
    default:
      throw new Error(`Operación semántica no permitida: ${aggregation}.`);
  }
}

export function combineEqualWeightSources(firstValue, secondValue, metric) {
  if (!validNumber(firstValue) || !validNumber(secondValue)) return null;
  if (
    firstValue < metric.minValue || firstValue > metric.maxValue ||
    secondValue < metric.minValue || secondValue > metric.maxValue
  ) {
    throw new Error(`Una de las fuentes está fuera del rango válido para ${metric.name}.`);
  }
  const combined = (firstValue + secondValue) / 2;
  return Number.isFinite(combined) && combined >= metric.minValue && combined <= metric.maxValue
    ? combined
    : null;
}

function applyMetricFilters(records, metric, filters) {
  const validFilters = new Set(metric.validFilters || []);
  return records.filter((record) => {
    if (validFilters.has("dateRange") && filters.dateRange) {
      const date = record.date?.toDate?.();
      if (!date || date < filters.dateRange.start || date > filters.dateRange.end) return false;
    }
    if (validFilters.has("departmentId") && filters.departments?.length) {
      if (!filters.departments.includes(record.department)) return false;
    }
    return true;
  });
}

export function calculateSemanticMetrics(records, catalog, filters = {}) {
  return catalog.map((metric) => {
    const metricRecords = applyMetricFilters(records, metric, filters);
    const values = metricRecords
      .map((record) => record.metrics?.[metric.id])
      .filter((value) => value !== null && value !== undefined);
    const invalidCount = values.filter((value) =>
      !validNumber(value) || value < metric.minValue || value > metric.maxValue
    ).length;

    if (invalidCount) {
      return {
        metric,
        value: null,
        count: values.length,
        invalidCount,
        error: `${invalidCount} valores incumplen el tipo o rango definido en el catálogo.`,
      };
    }

    try {
      const value = metric.aggregation === "PERCENTAGE"
        ? evaluateAggregation("PERCENTAGE", [], {
          numerator: metricRecords.reduce((total, record) => total + (record.metrics?.[metric.numeratorField] || 0), 0),
          denominator: metricRecords.reduce((total, record) => total + (record.metrics?.[metric.denominatorField] || 0), 0),
        })
        : evaluateAggregation(metric.aggregation, values);
      if (value !== null && (value < metric.minValue || value > metric.maxValue)) {
        return {
          metric,
          value: null,
          count: values.length,
          invalidCount: 0,
          error: "El resultado calculado incumple el rango definido en el catálogo.",
        };
      }
      return { metric, value, count: values.length, invalidCount: 0, error: "" };
    } catch (error) {
      return {
        metric,
        value: null,
        count: values.length,
        invalidCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
