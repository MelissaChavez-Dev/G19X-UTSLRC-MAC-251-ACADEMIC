/**
 * HR Analytics File Importer & Validator.
 * Handles parsing (CSV/XLSX), auto-suggested column mappings,
 * catalog validations, rejection of salary fields, and error reporting.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  assertNoSalaryFields,
  computeDerivedEmployeeFields,
  GENDERS,
  HIRE_TYPES,
  ORG_LEVELS,
  PROHIBITED_SALARY_KEYWORDS,
  SHIFTS,
} from "../constants.js";

export const HR_DATASETS = [
  { id: "employees", label: "Empleados y licencias", icon: "badge" },
];
const MAX_HR_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_HR_IMPORT_ROWS = 15000;

export const DATASET_SCHEMAS = {
  employees: [
    { field: "employeeId", label: "ID Empleado", required: true, pattern: /c[oó]digo.?empleado|^id empleado$|employee.?id|num.?emp|id.?empleado|c[oó]d.?emp/i },
    { field: "name", label: "Nombre Completo", required: true, pattern: /nombre|full.?name|^colaborador$|^name$/i },
    { field: "email", label: "Correo electrónico", required: true, pattern: /correo|e.?mail/i },
    { field: "gender", label: "Género", required: false, pattern: /g[eé]nero|gender|sexo/i },
    { field: "dob", label: "Fecha Nacimiento", required: false, pattern: /nacimiento|birth|dob/i },
    { field: "maritalStatus", label: "Estado Civil", required: false, pattern: /civil|marital/i },
    { field: "education", label: "Nivel Educativo", required: false, pattern: /educaci[oó]n|escolaridad|education/i },
    { field: "nativeCountry", label: "País de Origen", required: false, pattern: /pa[ií]s|country|nacionalidad/i },
    { field: "region", label: "Región", required: false, pattern: /^regi[oó]n$|^region$/i },
    { field: "location", label: "Ubicación / Ciudad", required: false, pattern: /ubicaci[oó]n|ciudad|city|location/i },
    { field: "businessUnit", label: "Unidad de Negocio (BU)", required: false, pattern: /unidad.?negocio|business.?unit|^bu$|divisi[oó]n/i },
    { field: "department", label: "Departamento", required: true, pattern: /departamento|department|[aá]rea/i },
    { field: "designation", label: "Puesto / Cargo", required: false, pattern: /puesto|cargo|designation|title|job/i },
    { field: "orgLevel", label: "Nivel Organizacional", required: false, pattern: /nivel|org.?level|jerarqu[ií]a/i },
    { field: "hireType", label: "Tipo de Contratación", required: false, pattern: /tipo.?contrataci[oó]n|hire.?type|tipo.?contrato/i },
    { field: "workDays", label: "Días laborales", required: false, pattern: /d[ií]as.?laborales|work.?days/i },
    { field: "startTime", label: "Hora de entrada", required: false, pattern: /hora.?de.?entrada|start.?time/i },
    { field: "endTime", label: "Hora de salida", required: false, pattern: /hora.?de.?salida|end.?time/i },
    { field: "workHours", label: "Horas de jornada", required: false, pattern: /horas.?de.?jornada|work.?hours/i },
    { field: "hireDate", label: "Fecha de Contratación", required: true, pattern: /fecha.?de.?ingreso|fecha.?ingreso|fecha.?contrataci[oó]n|hire.?date|alta/i },
    { field: "status", label: "Estado (Active/Terminated)", required: false, pattern: /estado|status|estatus/i },
    { field: "terminationDate", label: "Fecha de Baja", required: false, pattern: /fecha.?de.?baja|fecha.?baja|fecha.?salida|termination.?date|exit.?date/i },
    { field: "terminationCategory", label: "Categoría de Baja", required: false, pattern: /categor[ií]a.?baja|termination.?category/i },
    { field: "terminationReason", label: "Motivo de Baja", required: false, pattern: /motivo|reason|causa/i },
    { field: "shift", label: "Turno", required: false, pattern: /turno|shift/i },
    { field: "performanceRating", label: "Calificación Desempeño", required: false, pattern: /desempe[nñ]o|rating|performance/i },
    { field: "riskProbability", label: "Probabilidad de Riesgo (0-1)", required: false, pattern: /riesgo|risk|probabilidad/i },
  ],
  leaves: [
    { field: "id", label: "ID Registro", required: false, pattern: /^id$|c[oó]digo.?reg/i },
    { field: "employeeId", label: "ID Empleado", required: true, pattern: /employee.?id|empleado|id.?emp|c[oó]digo/i },
    { field: "date", label: "Fecha", required: true, pattern: /fecha|date/i },
    { field: "type", label: "Tipo (Annual / Sick)", required: true, pattern: /tipo|type/i },
    { field: "days", label: "Días de Licencia", required: true, pattern: /d[ií]as|days|duraci[oó]n/i },
  ],
  absences: [
    { field: "id", label: "ID Registro", required: false, pattern: /^id$|c[oó]digo.?reg/i },
    { field: "employeeId", label: "ID Empleado", required: true, pattern: /employee.?id|empleado|id.?emp|c[oó]digo/i },
    { field: "date", label: "Fecha", required: true, pattern: /fecha|date/i },
    { field: "days", label: "Días de Falta", required: false, pattern: /d[ií]as|days/i },
    { field: "hours", label: "Horas de Falta", required: false, pattern: /horas|hours/i },
    { field: "shift", label: "Turno", required: false, pattern: /turno|shift/i },
  ],
};

/**
 * Checks if a column name corresponds to a prohibited salary term.
 */
export function isSalaryColumn(columnName) {
  if (!columnName) return false;
  const norm = String(columnName).toLowerCase().replace(/[_\-\s]/g, "");
  return PROHIBITED_SALARY_KEYWORDS.some((kw) => norm.includes(kw));
}

/**
 * Parses an uploaded file into rows and column headers.
 */
export async function parseFile(file) {
  if (!file) throw new Error("Selecciona un archivo válido.");
  if (file.size > MAX_HR_IMPORT_BYTES) throw new Error("El archivo supera el límite de 10 MB.");
  const isCsv = /\.csv$/i.test(file.name);
  const isXlsx = /\.(xlsx|xls)$/i.test(file.name);

  if (!isCsv && !isXlsx) {
    throw new Error("Formato no soportado. Sube un archivo CSV o Excel (.xlsx).");
  }

  if (isCsv) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`Error al leer CSV en fila ${(results.errors[0].row ?? 0) + 2}: ${results.errors[0].message}`));
            return;
          }
          if (results.data.length > MAX_HR_IMPORT_ROWS) {
            reject(new Error(`El CSV supera el límite de ${MAX_HR_IMPORT_ROWS.toLocaleString("es")} filas.`));
            return;
          }
          const headers = (results.meta.fields || []).map((header) => header.replace(/^\uFEFF/, "").trim());
          const normalizedData = results.data.map((row) => Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, "").trim(), value])
          ));
          const sheet = {
            name: file.name,
            headers,
            rows: normalizedData,
            totalRows: normalizedData.length,
          };
          resolve({
            sheetName: file.name,
            headers,
            rows: normalizedData,
            totalRows: normalizedData.length,
            sheets: [sheet],
          });
        },
        error: (err) => reject(new Error(`Fallo al analizar CSV: ${err.message}`)),
      });
    });
  }

  // Excel (.xlsx) parsing via SheetJS
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) throw new Error("El archivo Excel no contiene hojas de datos.");
  const sheets = workbook.SheetNames
    .filter((sheetName) => !/leeme|read.?me|catalogos?/i.test(sheetName))
    .map((sheetName) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: true });
      return {
        name: sheetName,
        headers: rows.length ? Object.keys(rows[0]) : [],
        rows,
        totalRows: rows.length,
      };
    })
    .filter((sheet) => sheet.headers.length > 0 && sheet.rows.length > 0);
  const parsedRowCount = sheets.reduce((total, sheet) => total + sheet.totalRows, 0);
  if (parsedRowCount > MAX_HR_IMPORT_ROWS) {
    throw new Error(`El libro supera el límite combinado de ${MAX_HR_IMPORT_ROWS.toLocaleString("es")} filas.`);
  }
  if (!sheets.length) throw new Error("No se encontraron hojas de datos para importar.");

  const employeeSheet = sheets.find((sheet) => /empleados|employees/i.test(sheet.name)) ||
    sheets.find((sheet) => Boolean(autoSuggestMapping(sheet.headers, "employees").employeeId)) ||
    sheets[0];
  return {
    sheetName: employeeSheet.name,
    headers: employeeSheet.headers,
    rows: employeeSheet.rows,
    totalRows: employeeSheet.totalRows,
    sheets,
  };
}

/**
 * Auto-suggests column mappings based on headers and dataset schema.
 */
export function autoSuggestMapping(headers, dataset = "employees") {
  const schema = DATASET_SCHEMAS[dataset] || DATASET_SCHEMAS.employees;
  const mapping = {};
  const usedHeaders = new Set();

  schema.forEach(({ field, pattern }) => {
    const matched = headers.find((header) => {
      if (usedHeaders.has(header)) return false;
      if (isSalaryColumn(header)) return false;
      return pattern.test(header);
    });
    if (matched) {
      mapping[field] = matched;
      usedHeaders.add(matched);
    } else {
      mapping[field] = "";
    }
  });

  return mapping;
}

/**
 * Parses and normalizes dates (YYYY-MM-DD or standard Date strings).
 */
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date && Number.isFinite(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (!s) return null;

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date.toISOString().slice(0, 10);
  }

  // Check DD/MM/YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)) {
    const parts = s.split(/[/-]/).map(Number);
    const [d, m, y] = parts;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(s);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function normalizeCategory(value, choices, aliases = {}) {
  if (!value) return null;
  const normalized = _normaliseText(value);
  const alias = aliases[normalized];
  if (alias) return alias;
  return choices.find((choice) => _normaliseText(choice) === normalized) || null;
}

function _normaliseText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseTimeValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  const normalized = String(value ?? "").trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(normalized);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const GENDER_ALIASES = { femenino: "Female", mujer: "Female", masculino: "Male", hombre: "Male", otro: "Other" };
const LEVEL_ALIASES = { operativo: "Operational", medio: "Mid-Level", alto: "High-Level", "nivel medio": "Mid-Level", "nivel alto": "High-Level" };
const HIRE_TYPE_ALIASES = { regular: "Regular", "por contrato": "Contract", contrato: "Contract" };
const SHIFT_ALIASES = { diurno: "Day", vespertino: "Evening", nocturno: "Night" };
const STATUS_ALIASES = { activo: "Active", activa: "Active", baja: "Terminated", terminado: "Terminated", terminada: "Terminated" };
const RATING_ALIASES = {
  "aceptable minimo": "Minimum Acceptable",
  "cumple expectativas": "Met",
  "expectativa ideal": "Ideal",
  "supera expectativas": "Exceeded Expectation",
};
const LEAVE_TYPE_ALIASES = { anual: "Annual", "vacaciones": "Annual", enfermedad: "Sick", "licencia medica": "Sick" };

/**
 * Validates parsed rows against the mapping and schema.
 */
export function validateImportData(rows, mapping, dataset = "employees") {
  const schema = DATASET_SCHEMAS[dataset] || DATASET_SCHEMAS.employees;
  const validRecords = [];
  const invalidRows = [];
  const seenIds = new Set();
  const seenEmails = new Set();
  const salaryColumnsDetected = [];

  // Check if any mapped column or target field is salary
  Object.entries(mapping).forEach(([field, colName]) => {
    if (isSalaryColumn(field) || isSalaryColumn(colName)) {
      salaryColumnsDetected.push({ field, column: colName || field });
    }
  });

  if (salaryColumnsDetected.length > 0) {
    const salaryNames = salaryColumnsDetected.map((c) => c.column).join(", ");
    rows.forEach((row, index) => {
      const rowNum = index + 2;
      invalidRows.push({
        rowNumber: rowNum,
        identifier: row[mapping.employeeId] || `Fila ${rowNum}`,
        errors: [`Columna salarial prohibida detectada: "${salaryNames}". El sistema prohíbe estrictamente datos salariales.`],
      });
    });
    return {
      validRecords: [],
      invalidRows,
      salaryColumnsDetected,
      stats: {
        total: rows.length,
        valid: 0,
        invalid: rows.length,
      },
    };
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    const rowErrors = [];
    const record = {};

    schema.forEach(({ field, label, required }) => {
      const colName = mapping[field];
      const rawVal = colName ? row[colName] : undefined;
      const cleanVal = typeof rawVal === "string" ? rawVal.trim() : rawVal;

      if (required && (cleanVal === undefined || cleanVal === null || cleanVal === "")) {
        rowErrors.push(`Campo obligatorio "${label}" está vacío`);
        return;
      }

      record[field] = cleanVal ?? null;
    });

    // Check prohibited salary in the row itself
    try {
      assertNoSalaryFields(record);
    } catch {
      rowErrors.push("El registro contiene campos salariales prohibidos");
    }

    // Specific Dataset Validations
    if (dataset === "employees") {
      const empId = record.employeeId === null || record.employeeId === undefined
        ? ""
        : String(record.employeeId).trim().replace(/\.0$/, "");
      record.employeeId = empId;
      if (!empId) {
        rowErrors.push("ID de empleado ausente");
      } else if (seenIds.has(empId)) {
        rowErrors.push(`ID de empleado duplicado en el archivo: "${empId}"`);
      } else {
        seenIds.add(empId);
      }
      const email = String(record.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push("Correo electrónico inválido");
      else if (seenEmails.has(email)) rowErrors.push(`Correo duplicado en el archivo: "${email}"`);
      else seenEmails.add(email);
      record.email = email;

      // Date parsing
      if (record.dob) {
        const parsedDob = parseDateValue(record.dob);
        if (!parsedDob) rowErrors.push("Fecha de nacimiento inválida");
        else record.dob = parsedDob;
      }

      const parsedHire = parseDateValue(record.hireDate);
      if (!parsedHire) {
        rowErrors.push("Fecha de contratación inválida");
      } else {
        record.hireDate = parsedHire;
      }

      if (record.terminationDate) {
        const parsedTerm = parseDateValue(record.terminationDate);
        if (!parsedTerm) rowErrors.push("Fecha de baja inválida");
        else record.terminationDate = parsedTerm;
      }

      // Catalog validations / Normalizations
      record.gender = normalizeCategory(record.gender, GENDERS, GENDER_ALIASES) || "Other";
      record.orgLevel = normalizeCategory(record.orgLevel, ORG_LEVELS, LEVEL_ALIASES) || "Operational";
      record.hireType = normalizeCategory(record.hireType, HIRE_TYPES, HIRE_TYPE_ALIASES) || "Regular";
      record.shift = normalizeCategory(record.shift, SHIFTS, SHIFT_ALIASES) || "Day";
      const importedStatus = normalizeCategory(record.status, ["Active", "Terminated"], STATUS_ALIASES);
      if (record.status && !importedStatus) rowErrors.push("Estatus debe ser Activo o Baja");
      record.status = importedStatus || (record.terminationDate ? "Terminated" : "Active");
      record.maritalStatus = String(record.maritalStatus || "").trim();
      record.education = String(record.education || "").trim();
      record.nativeCountry = String(record.nativeCountry || "").trim();
      record.region = String(record.region || "").trim();
      record.location = String(record.location || "").trim();
      record.businessUnit = String(record.businessUnit || "").trim();
      record.department = String(record.department || "").trim();
      record.designation = String(record.designation || "").trim();
      const rawTerminationCategory = record.terminationCategory;
      record.terminationCategory = normalizeCategory(
        rawTerminationCategory,
        ["Voluntary", "Involuntary", "Death"],
        { voluntaria: "Voluntary", involuntaria: "Involuntary", defuncion: "Death" }
      );
      if (rawTerminationCategory && !record.terminationCategory) {
        rowErrors.push("Categoría de baja no reconocida");
      }
      record.performanceRating = normalizeCategory(
        record.performanceRating,
        ["Minimum Acceptable", "Met", "Ideal", "Exceeded Expectation"],
        RATING_ALIASES
      ) || String(record.performanceRating || "").trim();

      if (record.workDays) {
        const workDaysText = _normaliseText(record.workDays);
        record.workDays = /sabado/.test(workDaysText)
          ? ["mon", "tue", "wed", "thu", "fri", "sat"]
          : ["mon", "tue", "wed", "thu", "fri"];
      }
      if (record.startTime) {
        const parsedTime = parseTimeValue(record.startTime);
        if (!parsedTime) rowErrors.push("Hora de entrada inválida");
        else record.startTime = parsedTime;
      }
      if (record.endTime) {
        const parsedTime = parseTimeValue(record.endTime);
        if (!parsedTime) rowErrors.push("Hora de salida inválida");
        else record.endTime = parsedTime;
      }
      if (record.workHours !== null && record.workHours !== undefined && record.workHours !== "") {
        const hours = Number(record.workHours);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 24) rowErrors.push("Horas de jornada deben ser un número entre 0 y 24");
        else record.workHours = hours;
      }

      if (record.status === "Terminated" && !record.terminationCategory) {
        record.terminationCategory = "Voluntary";
      }

      if (record.riskProbability !== null && record.riskProbability !== undefined) {
        const num = Number(String(record.riskProbability).replace(",", "."));
        if (!Number.isFinite(num) || num < 0 || num > 1) rowErrors.push("Probabilidad de riesgo debe estar entre 0 y 1");
        else record.riskProbability = num;
      } else {
        record.riskProbability = 0.2;
      }

      record.source = "import";
      record.sourceRowNumber = rowNum;

      // Compute derived fields if no critical errors
      if (rowErrors.length === 0) {
        try {
          const enriched = computeDerivedEmployeeFields(record);
          validRecords.push(enriched);
        } catch (e) {
          rowErrors.push(e.message);
        }
      }
    } else if (dataset === "leaves") {
      record.employeeId = String(record.employeeId ?? "").trim().replace(/\.0$/, "");
      if (!record.employeeId) rowErrors.push("ID de empleado ausente");
      const parsedDate = parseDateValue(record.date);
      if (!parsedDate) rowErrors.push("Fecha inválida");
      else record.date = parsedDate;

      const days = Number(String(record.days).replace(",", "."));
      if (!Number.isFinite(days) || days <= 0) rowErrors.push("Días de licencia debe ser número > 0");
      else record.days = days;

      record.employeeId = String(record.employeeId || "").trim().replace(/\.0$/, "");
      const normalizedLeaveType = _normaliseText(record.type);
      const leaveType = /sick|enfermedad/.test(normalizedLeaveType)
        ? "Sick"
        : /annual|anual|vacacion/.test(normalizedLeaveType)
          ? "Annual"
          : normalizeCategory(record.type, ["Annual", "Sick"], LEAVE_TYPE_ALIASES);
      if (!leaveType) rowErrors.push("Tipo de licencia debe ser Anual o Enfermedad");
      record.type = leaveType;
      record.id = record.id || `LEAVE-${record.employeeId}-${Date.now()}-${index}`;
      record.source = "import";
      record.sourceRowNumber = rowNum;

      if (rowErrors.length === 0) validRecords.push(record);
    } else if (dataset === "absences") {
      if (!record.employeeId) rowErrors.push("ID de empleado ausente");
      const parsedDate = parseDateValue(record.date);
      if (!parsedDate) rowErrors.push("Fecha inválida");
      else record.date = parsedDate;

      const days = Number(String(record.days || 1).replace(",", "."));
      record.days = Number.isFinite(days) ? days : 1;
      const hours = Number(String(record.hours || record.days * 8).replace(",", "."));
      record.hours = Number.isFinite(hours) ? hours : record.days * 8;
      record.shift = record.shift || "Day";
      record.id = record.id || `ABS-${record.employeeId}-${Date.now()}-${index}`;
      record.source = "import";

      if (rowErrors.length === 0) validRecords.push(record);
    }

    if (rowErrors.length > 0) {
      invalidRows.push({
        rowNumber: rowNum,
        identifier: record.employeeId || record.id || `Fila ${rowNum}`,
        errors: rowErrors,
      });
    }
  });

  return {
    validRecords,
    invalidRows,
    salaryColumnsDetected,
    stats: {
      total: rows.length,
      valid: validRecords.length,
      invalid: invalidRows.length,
    },
  };
}

/**
 * Generates an empty sample template for download (CSV or XLSX).
 */
export function downloadSampleTemplate(dataset = "employees", format = "csv") {
  const schema = DATASET_SCHEMAS[dataset] || DATASET_SCHEMAS.employees;
  const headers = schema.map((s) => s.field);
  const emptyRows = [];

  const fileName = `plantilla_${dataset}_sin_salarios.${format}`;

  if (format === "csv") {
    const csvContent = Papa.unparse({
      fields: headers,
      data: emptyRows,
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dataset);
    XLSX.writeFile(wb, fileName);
  }
}

/**
 * Downloads a CSV error report for invalid rows.
 */
export function downloadErrorReport(invalidRows, fileName = "reporte_errores_importacion.csv") {
  const data = invalidRows.map((r) => ({
    "Fila": r.rowNumber,
    "Identificador": r.identifier,
    "Errores": r.errors.join("; "),
  }));
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------- Mapping Templates in LocalStorage ----------------

const TEMPLATE_KEY = "hr_mapping_templates_v1";

export function getSavedMappingTemplates(dataset = "employees") {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[dataset] || [];
  } catch {
    return [];
  }
}

export function saveMappingTemplate(name, dataset = "employees", mapping = {}) {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[dataset]) all[dataset] = [];
    const filtered = all[dataset].filter((t) => t.name !== name);
    filtered.push({
      name,
      mapping,
      updatedAt: new Date().toISOString(),
    });
    all[dataset] = filtered;
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("No se pudo guardar la plantilla de mapeo:", e);
  }
}
