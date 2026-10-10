import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, SMALL_COHORT_THRESHOLD } from "../data/metricsCatalog.js";

const METRIC_FIELDS = ["participationRate", "psychSafety", "attritionRisk"];

function isBlank(value) {
  return value === null || value === undefined || (typeof value === "string" && !value.trim());
}

function parseNumericTransform(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/%$/, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateDerivedValue(left, right, operation) {
  const first = parseNumericTransform(left);
  const second = parseNumericTransform(right);
  if (first === null || second === null) return null;
  if (operation === "add") return first + second;
  if (operation === "subtract") return first - second;
  if (operation === "multiply") return first * second;
  if (operation === "divide") return second === 0 ? null : first / second;
  throw new Error(`Operación de columna derivada no permitida: ${operation}.`);
}

export function applyImportTransforms(parsedFile, {
  columnLabels = {},
  scaleTransforms = {},
  derivedColumns = [],
}) {
  if (!parsedFile || !Array.isArray(parsedFile.columns) || !Array.isArray(parsedFile.rows)) {
    throw new Error("No se puede transformar un archivo con estructura inválida.");
  }

  const columns = [
    ...parsedFile.columns.map((column) => ({
      ...column,
      label: columnLabels[column.id]?.trim() || column.label,
    })),
    ...derivedColumns.map(({ id, name }) => ({ id, label: name })),
  ];
  const rows = parsedFile.rows.map((row) => {
    const values = {};
    parsedFile.columns.forEach((column) => {
      const original = row.values[column.id];
      const clean = typeof original === "string" ? original.trim() : original;
      const transform = scaleTransforms[column.id];
      if (!transform || (transform.scale === "" && transform.offset === "")) {
        values[column.id] = clean;
        return;
      }
      const numeric = parseNumericTransform(clean);
      if (numeric === null) {
        values[column.id] = clean;
        return;
      }
      const scale = transform.scale === "" ? 1 : Number(transform.scale);
      const offset = transform.offset === "" ? 0 : Number(transform.offset);
      values[column.id] = Number.isFinite(scale) && Number.isFinite(offset)
        ? numeric * scale + offset
        : clean;
    });
    derivedColumns.forEach((derived) => {
      values[derived.id] = calculateDerivedValue(
        values[derived.leftColumn],
        values[derived.rightColumn],
        derived.operation
      );
    });
    return { ...row, values };
  });
  return { ...parsedFile, columns, rows };
}

function parseDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return null;

  const text = value.trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
      ? date.toISOString().slice(0, 10)
      : null;
  }

  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
      ? date.toISOString().slice(0, 10)
      : null;
  }
  return null;
}

function parseMetricValue(value, metricId) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  let text = value.trim();
  if (metricId === "participationRate" && text.endsWith("%")) {
    text = text.slice(0, -1).trim();
  }
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateColumnMapping(mapping) {
  const errors = [];
  if (!mapping.dateColumn) errors.push("Selecciona la columna de fecha.");
  if (!mapping.departmentColumn) errors.push("Selecciona la columna de departamento.");
  if (!METRIC_FIELDS.some((field) => mapping.metricColumns[field])) {
    errors.push("Asigna al menos una columna a una métrica.");
  }

  const selectedColumns = [
    mapping.dateColumn,
    mapping.departmentColumn,
    ...METRIC_FIELDS.map((field) => mapping.metricColumns[field]).filter(Boolean),
  ].filter(Boolean);
  if (new Set(selectedColumns).size !== selectedColumns.length) {
    errors.push("Cada campo debe usar una columna distinta.");
  }
  return errors;
}

export function validateImportRows(rows, mapping, metrics) {
  const mappingErrors = validateColumnMapping(mapping);
  if (mappingErrors.length) {
    return { mappingErrors, records: [], issues: [], totalRows: rows.length, smallCohortGroups: 0 };
  }

  const catalogById = new Map(metrics.map((metric) => [metric.id, metric]));
  const records = [];
  const issues = [];

  rows.forEach((row) => {
    const date = parseDate(row.values[mapping.dateColumn]);
    const department = isBlank(row.values[mapping.departmentColumn])
      ? ""
      : String(row.values[mapping.departmentColumn]).trim();
    const metricValues = {};
    const rowIssues = [];

    if (!date) rowIssues.push("fecha inválida");
    if (!department) rowIssues.push("departamento vacío");
    if (department.length > 120) rowIssues.push("departamento supera 120 caracteres");

    METRIC_FIELDS.forEach((metricId) => {
      const columnId = mapping.metricColumns[metricId];
      if (!columnId || isBlank(row.values[columnId])) return;

      const value = parseMetricValue(row.values[columnId], metricId);
      const metric = catalogById.get(metricId);
      if (value === null) {
        rowIssues.push(`valor no numérico para ${metric?.name || metricId}`);
      } else if (!metric || value < metric.minValue || value > metric.maxValue) {
        rowIssues.push(`valor fuera de rango para ${metric?.name || metricId}`);
      } else {
        metricValues[metricId] = value;
      }
    });

    if (Object.keys(metricValues).length === 0) rowIssues.push("sin valores de métricas asignadas");
    if (rowIssues.length) {
      issues.push({ rowNumber: row.rowNumber, reasons: rowIssues });
      return;
    }

    records.push({
      sourceRowNumber: row.rowNumber,
      date,
      department,
      metrics: metricValues,
    });
  });

  return {
    mappingErrors: [],
    records,
    issues,
    totalRows: rows.length,
    smallCohortGroups: countSmallCohortGroups(records),
  };
}

export function countSmallCohortGroups(records) {
  const groupCounts = new Map();
  records.forEach(({ date, department }) => {
    const key = `${date}\u0000${department}`;
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  });
  return [...groupCounts.values()].filter((count) => count < SMALL_COHORT_THRESHOLD).length;
}

export async function readSpreadsheet(file, XLSX) {
  if (!file) throw new Error("Selecciona un archivo para continuar.");
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }
  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    throw new Error("Formato no compatible. Selecciona un archivo CSV o Excel (.xlsx).");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("El archivo no contiene hojas con datos.");

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
  if (matrix.length < 2) throw new Error("El archivo debe incluir encabezados y al menos una fila.");

  const headers = matrix[0].map((value, index) => {
    const label = value === null || value === undefined
      ? ""
      : String(value).replace(/^\uFEFF/, "").trim();
    return label || `Columna ${index + 1}`;
  });
  if (headers.length === 0) throw new Error("No se encontraron columnas en la primera fila.");

  if (matrix.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`El archivo supera el límite de ${MAX_IMPORT_ROWS.toLocaleString("es")} filas.`);
  }

  const dataRows = matrix.slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((value) => !isBlank(value)))
    .map(({ row, rowNumber }) => ({
      rowNumber,
      values: Object.fromEntries(headers.map((_, columnIndex) => [
        `column_${columnIndex}`,
        row[columnIndex] ?? null,
      ])),
    }));

  if (dataRows.length === 0) throw new Error("No se encontraron filas con datos.");
  return {
    sheetName: firstSheetName,
    columns: headers.map((label, index) => ({ id: `column_${index}`, label })),
    rows: dataRows,
  };
}
