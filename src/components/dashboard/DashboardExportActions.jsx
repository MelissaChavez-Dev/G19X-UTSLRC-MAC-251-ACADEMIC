export default function ExportActions({ onExport, exporting, disabled }) {
  const base =
    "motion-press inline-flex items-center gap-space-xs rounded-full px-space-md py-2 text-label-md font-medium transition-colors disabled:brightness-90";
  return (
    <div className="flex flex-col items-end gap-space-xs">
      <span id="export-actions-label" className="text-label-sm text-on-surface-variant">
        Presiona para descargar el reporte PDF o Excel
      </span>
      <div className="flex flex-wrap gap-space-xs" role="group" aria-labelledby="export-actions-label">
        <button
          type="button"
          onClick={() => onExport("pdf")}
          disabled={disabled || exporting !== null}
          className={`${base} bg-error-container text-on-error-container hover:brightness-95 dark:bg-error-container dark:text-on-error-container dark:hover:brightness-110`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            picture_as_pdf
          </span>
          {exporting === "pdf" ? "Generando..." : "Reporte PDF"}
        </button>
        <button
          type="button"
          onClick={() => onExport("excel")}
          disabled={disabled || exporting !== null}
          className={`${base} bg-success-container text-on-success-container hover:brightness-95 dark:bg-success-container dark:text-on-success-container dark:hover:brightness-110`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            table
          </span>
          {exporting === "excel" ? "Generando..." : "Excel"}
        </button>
      </div>
    </div>
  );
}

