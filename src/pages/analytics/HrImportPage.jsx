import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { useSidebarState } from "../../hooks/useSidebarState";
import { syncUserProfilesFromExcel } from "../../services/userService";
import {
  DATASET_SCHEMAS,
  downloadErrorReport,
  downloadSampleTemplate,
  getSavedMappingTemplates,
  isSalaryColumn,
  parseFile,
  autoSuggestMapping,
  saveMappingTemplate,
  validateImportData,
} from "../../analytics/utils/hrImporter";

export default function HrImportPage() {
  const { collapsed } = useSidebarState();

  const selectedDataset = "employees";
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [licenseSheet, setLicenseSheet] = useState(null);
  const [licenseMapping, setLicenseMapping] = useState({});
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [mapping, setMapping] = useState({});
  const [templateName, setTemplateName] = useState("");

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState(null);
  const [importError, setImportError] = useState("");
  const [importIssues, setImportIssues] = useState([]);
  const [successNotice, setSuccessNotice] = useState("");

  const [savedTemplates, setSavedTemplates] = useState(() => getSavedMappingTemplates("employees"));

  // Validate data upon mapping changes
  const validation = useMemo(() => {
    if (!parsedData?.rows || Object.keys(mapping).length === 0) return null;
    return validateImportData(parsedData.rows, mapping, selectedDataset);
  }, [parsedData, mapping, selectedDataset]);

  const leaveValidation = useMemo(() => {
    if (!licenseSheet) return null;
    return validateImportData(
      licenseSheet.rows,
      licenseMapping,
      "leaves"
    );
  }, [licenseSheet, licenseMapping]);

  const unmatchedLicenseRows = useMemo(() => {
    if (!leaveValidation || !validation) return [];
    const employeeIds = new Set(validation.validRecords.map((employee) => String(employee.employeeId)));
    return leaveValidation.validRecords
      .filter((leave) => !employeeIds.has(String(leave.employeeId)))
      .map((leave) => ({
        rowNumber: leave.sourceRowNumber || 0,
        identifier: String(leave.employeeId),
        errors: ["La licencia no coincide con un empleado válido de esta hoja."],
      }));
  }, [leaveValidation, validation]);

  const previewIssues = useMemo(() => importIssues.length
    ? importIssues
    : [
      ...(validation?.invalidRows || []),
      ...(leaveValidation?.invalidRows || []),
      ...unmatchedLicenseRows,
    ], [importIssues, validation, leaveValidation, unmatchedLicenseRows]);

  // Detect any salary columns present in the original file
  const fileSalaryColumns = useMemo(() => {
    const headers = [
      ...(parsedData?.headers || []),
      ...(licenseSheet?.headers || []),
    ];
    return [...new Set(headers.filter(isSalaryColumn))];
  }, [parsedData, licenseSheet]);

  async function handleFileSelect(selectedFile) {
    if (!selectedFile) return;
    setParseError("");
    setSuccessNotice("");
    setImportStats(null);
    setImportIssues([]);
    setFile(selectedFile);
    setParsing(true);

    try {
      const result = await parseFile(selectedFile);
      const sheets = result.sheets || [result];
      const employeeSheet = sheets.find((sheet) => /empleados|employees/i.test(sheet.name)) ||
        sheets.find((sheet) => autoSuggestMapping(sheet.headers, "employees").employeeId) ||
        result;
      const leaves = sheets.find((sheet) => /licencias|leaves/i.test(sheet.name)) || null;
      setParsedData(employeeSheet);
      setLicenseSheet(leaves);
      const suggested = autoSuggestMapping(employeeSheet.headers, "employees");
      setMapping(suggested);
      setLicenseMapping(leaves ? autoSuggestMapping(leaves.headers, "leaves") : {});
    } catch (err) {
      setParseError(err.message);
      setParsedData(null);
      setLicenseSheet(null);
      setMapping({});
      setLicenseMapping({});
      setFile(null);
    } finally {
      setParsing(false);
    }
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    saveMappingTemplate(templateName.trim(), selectedDataset, {
      employee: mapping,
      leaves: licenseMapping,
    });
    setSavedTemplates(getSavedMappingTemplates("employees"));
    setTemplateName("");
  }

  function handleApplyTemplate(savedMapping) {
    if (savedMapping.employee) {
      setMapping(savedMapping.employee);
      setLicenseMapping(savedMapping.leaves || {});
      return;
    }
    setMapping(savedMapping);
  }

  async function handleExecuteImport() {
    if (!validation || validation.validRecords.length === 0) return;
    setImporting(true);
    setImportProgress(5);
    setImportError("");
    setSuccessNotice("");

    try {
      const leavesByEmployee = new Map();
      const leaveErrors = leaveValidation?.invalidRows || [];
      const employeeIds = new Set(validation.validRecords.map((employee) => employee.employeeId));
      const matchedLicenseRecords = (leaveValidation?.validRecords || [])
        .filter((leave) => employeeIds.has(leave.employeeId));
      const unmatchedLicenseRecords = (leaveValidation?.validRecords || [])
        .filter((leave) => !employeeIds.has(leave.employeeId));
      matchedLicenseRecords.forEach((leave) => {
        const items = leavesByEmployee.get(leave.employeeId) || [];
        items.push({ date: leave.date, type: leave.type, days: leave.days });
        leavesByEmployee.set(leave.employeeId, items);
      });
      const importRows = validation.validRecords.map((employee) => {
        const profile = { ...employee };
        const sourceRowNumber = profile.sourceRowNumber;
        delete profile.id;
        delete profile.sourceRowNumber;
        delete profile.days;
        const { startTime, endTime, workDays } = profile;
        delete profile.startTime;
        delete profile.endTime;
        return {
          ...profile,
          displayName: employee.name,
          workSchedule: {
            days: Array.isArray(workDays) ? workDays : ["mon", "tue", "wed", "thu", "fri"],
            startTime: startTime || "09:00",
            endTime: endTime || "18:00",
            timezone: "America/Hermosillo",
          },
          leaveRecords: leavesByEmployee.get(employee.employeeId) || [],
          leaveSummary: {
            annualDays: (leavesByEmployee.get(employee.employeeId) || [])
              .filter((leave) => leave.type === "Annual")
              .reduce((total, leave) => total + leave.days, 0),
            sickDays: (leavesByEmployee.get(employee.employeeId) || [])
              .filter((leave) => leave.type === "Sick")
              .reduce((total, leave) => total + leave.days, 0),
          },
          sourceRowNumber,
        };
      });

      let created = 0;
      let updated = 0;
      const syncErrors = [];
      const batchSize = 50;
      for (let start = 0; start < importRows.length; start += batchSize) {
        const result = await syncUserProfilesFromExcel(importRows.slice(start, start + batchSize));
        created += result.created || 0;
        updated += result.updated || 0;
        syncErrors.push(...(result.errors || []));
        setImportProgress(Math.min(95, Math.round(((start + batchSize) / importRows.length) * 95)));
      }

      setImportProgress(100);
      const combinedErrors = [
        ...validation.invalidRows,
        ...leaveErrors,
        ...syncErrors.map((error) => ({
          rowNumber: error.rowNumber || 0,
          identifier: "Perfil",
          errors: [error.message],
        })),
        ...unmatchedLicenseRecords.map((leave) => ({
          rowNumber: leave.sourceRowNumber || 0,
          identifier: leave.employeeId,
          errors: ["La licencia no coincide con un empleado válido del archivo."],
        })),
      ];

      setImportStats({
        ok: created + updated,
        errors: combinedErrors.length,
      });
      setImportIssues(combinedErrors);

      setSuccessNotice(
        `Perfiles procesados en users: ${created} creados sin cuenta Auth y ${updated} actualizados. ` +
        `${leavesByEmployee.size} empleados recibieron licencias embebidas.`
      );
      if (combinedErrors.length > 0) {
        setImportError(`${combinedErrors.length} filas tienen errores o no se asociaron; consulta o descarga el reporte de incidencias.`);
      }
    } catch (err) {
      setImportError(`Fallo al importar: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  const schema = DATASET_SCHEMAS[selectedDataset] || DATASET_SCHEMAS.employees;

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-space-lg px-space-xl py-space-lg">
          
          {/* Header */}
          <header className="flex flex-wrap items-end justify-between gap-space-md">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-space-sm py-1 text-label-md text-on-surface-variant">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-secondary" />
                HR Analytics · Ingesta Segura
              </span>
              <h1 className="mt-space-sm text-headline-xl text-on-surface">Importación de Datos HR</h1>
              <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">
                Lee las hojas Empleados y Licencias, valida en memoria y sincroniza perfiles en la colección existente users.
                No se guarda el archivo ni se crean cuentas de Firebase Authentication.
              </p>
            </div>
            <div className="flex gap-space-sm">
              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-space-md py-2.5 text-label-md text-on-surface hover:bg-surface-container-low shadow-sm"
              >
                <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
                Ir al Hub HR
              </Link>
            </div>
          </header>

          <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">groups</span>
            Un solo modelo HR: Empleados + Licencias → perfiles en <code className="font-semibold">users</code>
          </div>

          {/* Download Sample Templates Card */}
          <section className="flex flex-wrap items-center justify-between gap-space-md rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm">
            <div className="flex items-center gap-space-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-[22px]">download</span>
              </div>
              <div>
                <h2 className="text-label-lg font-semibold text-on-surface">Plantilla vacía de empleados</h2>
                <p className="text-body-sm text-on-surface-variant">Solo contiene encabezados, sin registros de ejemplo ni información personal.</p>
              </div>
            </div>
            <div className="flex gap-space-xs">
              <button
                type="button"
                onClick={() => downloadSampleTemplate(selectedDataset, "csv")}
                className="rounded-full border border-outline-variant px-space-md py-1.5 text-label-md text-on-surface hover:bg-surface-container-low"
              >
                Descargar CSV
              </button>
              <button
                type="button"
                onClick={() => downloadSampleTemplate(selectedDataset, "xlsx")}
                className="rounded-full bg-primary-container px-space-md py-1.5 text-label-md font-medium text-on-primary-container hover:bg-primary-container/80"
              >
                Descargar Excel (.xlsx)
              </button>
            </div>
          </section>

          {/* Upload Area */}
          <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">1. Cargar Archivo Fuente</h2>
            
            <label
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-space-sm rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low p-space-lg text-center transition-colors hover:border-primary"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files?.[0]);
              }}
            >
              <span className="material-symbols-outlined text-[44px] text-primary" aria-hidden="true">
                {parsing ? "hourglass_top" : "cloud_upload"}
              </span>
              <span className="text-label-lg font-semibold text-on-surface">
                {file ? file.name : "Arrastra y suelta tu archivo CSV o Excel (.xlsx) aquí"}
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Máximo 15,000 filas combinadas y 10 MB. Se actualiza por ID empleado o correo en users; no crea cuentas Auth.
              </span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="sr-only"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>

            {parseError && (
              <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
                {parseError}
              </p>
            )}

            {/* Salary Shield Notification */}
            {fileSalaryColumns.length > 0 && (
              <div className="flex items-start gap-space-sm rounded-xl border border-warning/50 bg-warning-container/30 p-space-md">
                <span className="material-symbols-outlined text-warning" aria-hidden="true">security</span>
                <div className="text-body-sm text-on-warning-container">
                  <strong className="font-semibold">Protección Salarial Activa:</strong> Se detectaron columnas financieras en tu archivo ({fileSalaryColumns.join(", ")}). Conforme a la política del sistema, han sido excluidas y no serán almacenadas en la base de datos.
                </div>
              </div>
            )}
          </section>

          {/* Preview & Mapping Section */}
          <AnimatePresence>
            {parsedData && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-space-md">
                  <div>
                    <h2 className="text-headline-sm text-on-surface">2. Mapeo y Previsualización de Columnas</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      Total en archivo: <strong>{parsedData.totalRows.toLocaleString("es")}</strong> filas. Asigna cada campo del esquema a la columna de tu archivo.
                    </p>
                  </div>

                  {/* Template management */}
                  <div className="flex flex-wrap items-center gap-space-xs">
                    {savedTemplates.length > 0 && (
                      <select
                        onChange={(e) => {
                          const t = savedTemplates.find((item) => item.name === e.target.value);
                          if (t) handleApplyTemplate(t.mapping);
                        }}
                        className="rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-1.5 text-label-sm text-on-surface"
                      >
                        <option value="">Cargar plantilla guardada...</option>
                        {savedTemplates.map((t) => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="Nombre de plantilla"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-1.5 text-label-sm text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      className="rounded-full border border-outline-variant px-space-sm py-1.5 text-label-sm text-primary hover:bg-surface-container disabled:opacity-50"
                    >
                      Guardar Mapeo
                    </button>
                  </div>
                </div>

                {/* Mapping Grid */}
                <div className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                  {schema.map(({ field, label, required }) => (
                    <label key={field} className="flex flex-col gap-1 rounded-xl border border-outline-variant/50 bg-surface-container-low p-space-sm text-label-sm text-on-surface">
                      <span className="flex items-center justify-between">
                        <span>{label}</span>
                        {required && <span className="text-[11px] font-semibold text-error">*Obligatorio</span>}
                      </span>
                      <select
                        value={mapping[field] || ""}
                        onChange={(e) => setMapping((curr) => ({ ...curr, [field]: e.target.value }))}
                        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
                      >
                        <option value="">-- Sin asignar --</option>
                        {parsedData.headers
                          .filter((h) => !isSalaryColumn(h))
                          .map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>

                {licenseSheet && (
                  <details className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-space-md" open>
                    <summary className="cursor-pointer text-label-md font-semibold text-on-surface">
                      Hoja de licencias: {licenseSheet.name} · {licenseSheet.totalRows.toLocaleString("es")} filas
                    </summary>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      Las licencias se guardan dentro del perfil del empleado en <code>users</code>; no se crea otra colección.
                    </p>
                    <div className="mt-space-sm grid gap-space-sm sm:grid-cols-2 lg:grid-cols-4">
                      {DATASET_SCHEMAS.leaves.map(({ field, label, required }) => (
                        <label key={field} className="flex flex-col gap-1 text-label-sm text-on-surface">
                          <span>{label}{required ? " *" : ""}</span>
                          <select
                            value={licenseMapping[field] || ""}
                            onChange={(event) => setLicenseMapping((current) => ({ ...current, [field]: event.target.value }))}
                            className="rounded-lg border border-outline-variant bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="">No asignar</option>
                            {licenseSheet.headers.filter((header) => !isSalaryColumn(header)).map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    {leaveValidation && (
                      <p className={`mt-2 text-xs ${leaveValidation.stats.invalid ? "text-error" : "text-on-surface-variant"}`}>
                        {leaveValidation.stats.valid} licencias válidas · {leaveValidation.stats.invalid} con errores
                        {unmatchedLicenseRows.length ? ` · ${unmatchedLicenseRows.length} no asociadas al archivo de empleados` : ""}
                      </p>
                    )}
                    <div className="mt-2 overflow-x-auto rounded-lg border border-outline-variant/60 bg-white">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-surface-container-low text-on-surface-variant">
                          <tr>{licenseSheet.headers.filter((header) => !isSalaryColumn(header)).map((header) => <th key={header} className="px-2 py-1.5">{header}</th>)}</tr>
                        </thead>
                        <tbody>
                          {licenseSheet.rows.slice(0, 8).map((row, index) => (
                            <tr key={index} className="border-t border-outline-variant/40">
                              {licenseSheet.headers.filter((header) => !isSalaryColumn(header)).map((header) => (
                                <td key={header} className="px-2 py-1.5">{String(row[header] ?? "—")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}

                {/* First 20 Rows Preview Table */}
                <div className="mt-space-sm">
                  <h3 className="mb-2 text-label-md font-semibold text-on-surface">Previsualización de las primeras 20 filas del archivo</h3>
                  <div className="max-h-72 overflow-x-auto rounded-xl border border-outline-variant/60">
                    <table className="min-w-full text-left text-body-sm">
                      <thead className="sticky top-0 bg-surface-container-low text-label-sm text-on-surface-variant">
                        <tr>
                          <th className="px-space-sm py-2">#</th>
                          {parsedData.headers.map((h) => (
                            <th key={h} className={`px-space-sm py-2 ${isSalaryColumn(h) ? "line-through text-error" : ""}`}>
                              {h} {isSalaryColumn(h) && "(Excluido)"}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="border-t border-outline-variant/40">
                            <td className="px-space-sm py-1.5 text-on-surface-variant">{idx + 1}</td>
                            {parsedData.headers.map((h) => (
                              <td key={h} className="max-w-48 truncate px-space-sm py-1.5 text-on-surface">
                                {isSalaryColumn(h) ? "—" : String(row[h] ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Validation Summary Box */}
                {validation && (
                  <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
                    <div className="flex flex-wrap items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-md text-label-md">
                        <span className="flex items-center gap-1.5 text-primary">
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          {validation.stats.valid.toLocaleString("es")} filas válidas
                        </span>
                        <span className="flex items-center gap-1.5 text-error">
                          <span className="material-symbols-outlined text-[20px]">error</span>
                          {(validation.stats.invalid + (leaveValidation?.stats.invalid || 0) + unmatchedLicenseRows.length).toLocaleString("es")} con errores o sin asociación
                        </span>
                      </div>

                      {previewIssues.length > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadErrorReport(previewIssues)}
                          className="rounded-full border border-error/50 bg-error-container/30 px-space-md py-1.5 text-label-sm font-medium text-on-error-container hover:bg-error-container"
                        >
                          Descargar Reporte de Errores (.csv)
                        </button>
                      )}
                    </div>

                    {/* Collapsible Error List */}
                    {previewIssues.length > 0 && (
                      <details className="mt-2 rounded-lg bg-surface-container-lowest p-space-sm text-body-sm text-on-surface-variant">
                        <summary className="cursor-pointer font-medium text-error">
                          Ver detalles de los primeros {Math.min(10, previewIssues.length)} errores
                        </summary>
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          {previewIssues.slice(0, 10).map((r) => (
                            <li key={r.rowNumber}>
                              <strong>Fila {r.rowNumber} ({r.identifier}):</strong> {r.errors.join("; ")}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {/* Execute Button & Progress */}
                <div className="flex flex-col gap-space-sm border-t border-outline-variant/50 pt-space-md">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      disabled={importing || !validation || validation.validRecords.length === 0}
                      onClick={handleExecuteImport}
                      className="rounded-full bg-primary px-space-xl py-3 text-label-lg font-semibold text-on-primary shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {importing ? "Sincronizando perfiles..." : `Sincronizar ${validation?.stats.valid || 0} perfiles válidos`}
                    </button>

                    {importStats && (
                      <span className="text-body-sm text-on-surface-variant">
                        Completado con éxito: {importStats.ok} agregados/actualizados.
                      </span>
                    )}
                  </div>

                  {importing && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-label-sm text-on-surface-variant">
                        <span>Sincronizando perfiles en la colección users por ID de empleado...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${importProgress}%` }}
                          transition={{ ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                  )}

                  {successNotice && (
                    <p role="status" className="rounded-xl bg-primary-container px-space-md py-space-sm text-body-md text-on-primary-container">
                      {successNotice}
                    </p>
                  )}

                  {importError && (
                    <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-md text-on-error-container">
                      {importError}
                    </p>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
