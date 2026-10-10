import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import GenericWidgetRenderer from "./GenericWidgetRenderer";
import SlicerWidget from "./widgets/SlicerWidget";
import PowerBiEditorDrawer from "./editor/PowerBiEditorDrawer";
import { useHrFilters } from "../context/useHrFilters";

const NEXT_WIDTH = {
  3: 4,
  4: 6,
  6: 8,
  8: 9,
  9: 12,
  12: 3,
};

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendWidgetLayout(widgets, widget) {
  const lastRow = widgets.reduce((bottom, item) => {
    const row = Number(item.layout?.y) || 0;
    const height = Number(item.layout?.h) || 2;
    return Math.max(bottom, row + height);
  }, 0);
  return {
    ...widget,
    layout: { ...(widget.layout || {}), x: 0, y: lastRow },
  };
}

function reflowWidgets(widgets) {
  let row = 0;
  let column = 0;
  let rowHeight = 1;

  return widgets.map((widget) => {
    const width = Math.min(12, Math.max(1, Number(widget.layout?.w) || 6));
    const height = Math.min(8, Math.max(1, Number(widget.layout?.h) || 2));
    if (column + width > 12) {
      row += rowHeight;
      column = 0;
      rowHeight = 1;
    }
    const result = {
      ...widget,
      layout: { ...(widget.layout || {}), x: column, y: row, w: width, h: height },
    };
    column += width;
    rowHeight = Math.max(rowHeight, height);
    if (column >= 12) {
      row += rowHeight;
      column = 0;
      rowHeight = 1;
    }
    return result;
  });
}

function safeFileName(value) {
  return value.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "hr_analytics";
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la imagen del reporte."));
    image.src = dataUrl;
  });
}

async function addReportToPdf(pdf, dataUrl) {
  const image = await loadImage(dataUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageSliceHeight = Math.floor((image.width * pageHeight) / pageWidth);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no permite preparar las páginas PDF.");
  canvas.width = image.width;
  let pageNumber = 0;

  for (let sourceY = 0; sourceY < image.height; sourceY += pageSliceHeight) {
    const sliceHeight = Math.min(pageSliceHeight, image.height - sourceY);
    canvas.height = sliceHeight;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, sourceY, image.width, sliceHeight, 0, 0, image.width, sliceHeight);
    if (pageNumber > 0) pdf.addPage("a4", "landscape");
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      pageWidth,
      (sliceHeight * pageWidth) / image.width
    );
    pageNumber += 1;
  }
}

export default function HrPageViewer({
  dashboard = {},
  currentPageIndex = 0,
  onSelectPage,
  onNavigateHome,
  onToggleEditMode,
  isEditMode = false,
  employees = [],
  extraDatasets = {},
  onAskGemini,
  geminiExplanation = "",
  loadingGemini = false,
  onUpdateDashboard,
  onOpenDashboardManager,
  activeDashboardId = null,
  dashboardSaveStatus = "saved",
}) {
  const { filters, clearAllFilters } = useHrFilters();
  const reportRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [drillEmployee, setDrillEmployee] = useState(null);
  const [isNarrowCanvas, setIsNarrowCanvas] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const pageMenuRef = useRef(null);

  // Edit Mode state
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [editorDrawerOpen, setEditorDrawerOpen] = useState(true);
  const [savingStatus, setSavingStatus] = useState("saved");

  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const dragWidgetIndex = useRef(null);
  const dragPageIndex = useRef(null);

  const pages = dashboard.pages || [];
  const currentPage = pages[currentPageIndex] || pages[0] || { title: "Página Principal", widgets: [], slicers: [] };
  const widgets = currentPage.widgets || [];
  const slicers = currentPage.slicers || [];
  const isCompactReport = currentPageIndex > 0 || Boolean(currentPage.grid);
  const isDenseLayout = Boolean(currentPage.grid);
  const configuredColumns = Math.max(1, Math.min(24, Number(currentPage.grid?.columns) || 12));
  const gridColumns = isNarrowCanvas && configuredColumns > 12 ? 12 : configuredColumns;
  const gridRowHeight = isNarrowCanvas ? 56 : Number(currentPage.grid?.rowHeight) || 112;
  const gridGap = Number(currentPage.grid?.gap ?? 12);
  const filterSummary = [
    `Año: ${filters.year ?? "—"}`,
    filters.month ? `Mes: ${filters.month}` : null,
    filters.businessUnit ? `Unidad: ${filters.businessUnit}` : null,
    filters.department ? `Departamento: ${filters.department}` : null,
    filters.region ? `Región: ${filters.region}` : null,
    filters.location ? `Ubicación: ${filters.location}` : null,
    filters.performanceRating ? `Desempeño: ${filters.performanceRating}` : null,
    filters.crossFilter ? `${filters.crossFilter.dimension}: ${filters.crossFilter.value}` : null,
  ].filter(Boolean);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || configuredColumns <= 12 || typeof ResizeObserver === "undefined") {
      setIsNarrowCanvas(false);
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrowCanvas(entry.contentRect.width < 960);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [currentPage.id, configuredColumns]);

  useEffect(() => {
    if (!pageMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!pageMenuRef.current?.contains(event.target)) setPageMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPageMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [pageMenuOpen]);

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId) || null;

  function recordDashboardChange(updatedDash) {
    const baseHistory = history.length === 0 ? [dashboard] : history.slice(0, historyIndex + 1);
    const nextHistory = [...baseHistory, updatedDash];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setSavingStatus("saving");
    onUpdateDashboard?.(updatedDash);
  }

  function applyPageChange(newWidgets, newSlicers = slicers) {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      widgets: newWidgets,
      slicers: newSlicers,
    };
    const updatedDash = { ...dashboard, pages: updatedPages };

    recordDashboardChange(updatedDash);
  }

  useEffect(() => {
    if (savingStatus === "saving") {
      const timer = setTimeout(() => {
        setSavingStatus("saved");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [savingStatus]);

  function handleUndo() {
    if (historyIndex > 0) {
      const prevDash = history[historyIndex - 1];
      setHistoryIndex((curr) => curr - 1);
      setSavingStatus("saving");
      onUpdateDashboard?.(prevDash);
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const nextDash = history[historyIndex + 1];
      setHistoryIndex((curr) => curr + 1);
      setSavingStatus("saving");
      onUpdateDashboard?.(nextDash);
    }
  }

  function handleUpdateWidget(updated) {
    const nextWidgets = widgets.map((w) => (w.id === updated.id ? updated : w));
    applyPageChange(nextWidgets);
  }

  function handleAddWidget(defaultType = "kpi") {
    const newWidget = appendWidgetLayout(widgets, {
      id: `w-${createId()}`,
      type: defaultType,
      title: defaultType === "kpi" ? "Nuevo Indicador" : "Nuevo Gráfico",
      measure: "headCount",
      dimension: "department",
      options: { unit: "" },
      layout: { x: 0, y: 0, w: defaultType === "kpi" ? 3 : 6, h: 2 },
    });
    const nextWidgets = [...widgets, newWidget];
    applyPageChange(nextWidgets);
    setSelectedWidgetId(newWidget.id);
    setEditorDrawerOpen(true);
  }

  function handleAddSlicer() {
    const newSlicer = {
      id: `slicer-${createId()}`,
      type: "dropdown",
      filterKey: "businessUnit",
      label: "Filtro BU",
      options: [],
    };
    const nextSlicers = [...slicers, newSlicer];
    applyPageChange(widgets, nextSlicers);
  }

  function handleDeleteWidget(widgetId) {
    const nextWidgets = widgets.filter((w) => w.id !== widgetId);
    applyPageChange(nextWidgets);
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
  }

  function handleDuplicateWidget(targetWidget) {
    const dup = appendWidgetLayout(widgets, {
      ...targetWidget,
      id: `w-${createId()}`,
      title: `${targetWidget.title} (Copia)`,
    });
    const nextWidgets = [...widgets, dup];
    applyPageChange(nextWidgets);
    setSelectedWidgetId(dup.id);
  }

  function handleCycleWidth(widget) {
    const currentW = widget.layout?.w || 6;
    const nextW = NEXT_WIDTH[currentW] || 6;
    handleUpdateWidget({
      ...widget,
      layout: { ...(widget.layout || {}), w: nextW },
    });
  }

  function handleMoveWidget(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;
    handleReorderWidget(index, targetIdx);
  }

  function handleReorderWidget(fromIndex, toIndex) {
    if (
      fromIndex === null ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= widgets.length ||
      toIndex >= widgets.length
    ) return;
    const reordered = [...widgets];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    applyPageChange(reflowWidgets(reordered));
  }

  function handleUpdateSlicer(slicerId, updates) {
    const nextSlicers = slicers.map((slicer, index) =>
      (slicer.id || `slicer-${index}`) === slicerId ? { ...slicer, ...updates } : slicer
    );
    applyPageChange(widgets, nextSlicers);
  }

  function handleDeleteSlicer(slicerId) {
    applyPageChange(widgets, slicers.filter((slicer, index) =>
      (slicer.id || `slicer-${index}`) !== slicerId
    ));
  }

  function handleReorderPage(fromIndex, toIndex) {
    if (
      fromIndex === null ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pages.length ||
      toIndex >= pages.length
    ) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    recordDashboardChange({ ...dashboard, pages: reordered });
    if (currentPageIndex === fromIndex) onSelectPage?.(toIndex);
    else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) onSelectPage?.(currentPageIndex - 1);
    else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) onSelectPage?.(currentPageIndex + 1);
  }

  function handleAddPage() {
    const newPage = {
      id: `page-${createId()}`,
      title: `Página ${pages.length + 1}`,
      widgets: [],
      slicers: [],
    };
    const updatedDash = { ...dashboard, pages: [...pages, newPage] };
    recordDashboardChange(updatedDash);
    onSelectPage?.(pages.length);
  }

  function handleRenamePage(newName) {
    if (!newName.trim()) return;
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = { ...currentPage, title: newName.trim() };
    recordDashboardChange({ ...dashboard, pages: updatedPages });
  }

  function handleDeleteCurrentPage() {
    if (pages.length <= 1) {
      alert("El dashboard debe tener al menos una página.");
      return;
    }
    if (window.confirm(`¿Eliminar la página "${currentPage.title}"?`)) {
      const updatedPages = pages.filter((_, idx) => idx !== currentPageIndex);
      recordDashboardChange({ ...dashboard, pages: updatedPages });
      onSelectPage?.(Math.max(0, currentPageIndex - 1));
    }
  }

  // Export current report page to PDF
  async function handleExportPdf() {
    if (!reportRef.current) return;
    setCaptureError("");
    setCapturing(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.dataset.captureIgnore === "true"),
      });
      const pdf = new jsPDF("landscape", "mm", "a4");
      await addReportToPdf(pdf, dataUrl);
      pdf.save(`${safeFileName(dashboard.name || "HR_Analytics")}_${safeFileName(currentPage.title)}_${filters.year}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      setCaptureError(`No se pudo generar el PDF. ${err.message}`);
    } finally {
      setCapturing(false);
    }
  }

  // Export current report page to PNG
  async function handleExportPng() {
    if (!reportRef.current) return;
    setCaptureError("");
    setCapturing(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        filter: (node) => !(node instanceof HTMLElement && node.dataset.captureIgnore === "true"),
      });
      const link = document.createElement("a");
      link.download = `${safeFileName(dashboard.name || "HR_Analytics")}_${safeFileName(currentPage.title)}_${filters.year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al exportar PNG:", err);
      setCaptureError(`No se pudo generar la imagen PNG. ${err.message}`);
    } finally {
      setCapturing(false);
    }
  }

  const hasActiveFilters = Boolean(
    filters.month ||
    filters.businessUnit ||
    filters.department ||
    filters.region ||
    filters.location ||
    filters.performanceRating ||
    filters.crossFilter
  );

  return (
    <div className={`flex w-full flex-col ${
      isDenseLayout ? "gap-2" : isCompactReport ? "gap-space-sm" : "gap-space-md"
    } ${isEditMode ? "xl:pr-[21rem] transition-all" : ""}`}>
      {/* Top Action Bar */}
      {!isCompactReport && <div className={`flex flex-wrap items-center justify-between gap-space-sm border border-outline-variant/50 border-b-2 border-b-secondary bg-surface-container-lowest shadow-xs ${
        isCompactReport ? "rounded-xl px-space-md py-1" : "rounded-3xl px-space-lg py-space-md"
      }`}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className={`${isCompactReport ? "hidden" : "mr-2 hidden items-center gap-2 sm:flex"}`} aria-hidden="true">
            <span className="text-3xl font-black tracking-tight text-primary">HR</span>
            <span className="h-9 border-l-2 border-secondary" />
          </div>
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              title="Volver a Inicio (Ciclo de Vida)"
              className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-space-md py-1.5 text-label-sm text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
            </button>
          )}

          <div className="min-w-0">
            <h1 className={`${isCompactReport ? "sr-only" : "truncate text-headline-lg font-medium tracking-tight text-on-surface"}`}>{currentPage.title}</h1>
            {dashboard.id && <p className="truncate text-body-xs text-on-surface-variant">{dashboard.name || "HR Analytics"}</p>}
          </div>

          {onOpenDashboardManager && !isCompactReport && (
            <button
              type="button"
              onClick={onOpenDashboardManager}
              className="rounded-full border border-outline-variant bg-surface-container-low px-space-sm py-1.5 text-label-sm text-on-surface hover:bg-surface-container"
            >
              Dashboards
            </button>
          )}

          {activeDashboardId && dashboardSaveStatus !== "saved" && (
            <span role="status" className={`text-[11px] ${dashboardSaveStatus === "error" ? "text-[#a33e35]" : "text-[#777]"}`}>
              {dashboardSaveStatus === "saving" ? "Guardando…" : "No se guardaron los cambios"}
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded border border-[#e0bb00] bg-[#fff6cb] px-2.5 py-1 text-[11px] font-semibold text-[#6f5a00] hover:bg-[#ffefaa]"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              {filters.crossFilter
                ? `Filtro: ${filters.crossFilter.dimension}=${filters.crossFilter.value}`
                : "Limpiar filtros"}
            </button>
          )}
        </div>

        {/* Right actions: Export and Mode toggle */}
        <div className="flex items-center gap-space-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={capturing}
              onClick={handleExportPng}
              title="Descargar imagen PNG"
              className="rounded-full border border-outline-variant bg-surface-container-lowest px-space-sm py-1.5 text-label-sm text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              <span className="material-symbols-outlined mr-1 align-middle text-[16px]">image</span>
              PNG
            </button>
            <button
              type="button"
              disabled={capturing}
              onClick={handleExportPdf}
              title="Descargar reporte formal en PDF"
              className="rounded-full bg-secondary-container px-space-sm py-1.5 text-label-sm font-semibold text-on-secondary-container hover:bg-secondary-container/80 disabled:opacity-50"
            >
              <span className="material-symbols-outlined mr-1 align-middle text-[16px]">picture_as_pdf</span>
              {capturing ? "Generando..." : "PDF"}
            </button>
          </div>

          {onToggleEditMode && (
            <button
              type="button"
              onClick={onToggleEditMode}
              className={`rounded-full px-space-md py-1.5 text-label-sm font-semibold transition-all ${
                isEditMode
                  ? "bg-primary text-on-primary"
                  : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined mr-1 align-middle text-[16px]">
                {isEditMode ? "visibility" : "tune"}
              </span>
              {isEditMode ? "Finalizar Edición" : "Modo Edición"}
            </button>
          )}
        </div>
      </div>}

      {captureError && (
        <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
          {captureError}
        </p>
      )}

      {/* Edit Mode Quick Toolbar Bar */}
      {isEditMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary-container/30 border border-secondary/40 p-space-sm">
          <div className="flex items-center gap-2">
            <span className="text-label-xs font-bold uppercase text-secondary tracking-wider">
              Herramientas de Edición:
            </span>
            <button
              type="button"
              onClick={() => handleAddWidget("kpi")}
              className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 py-1 text-label-xs font-semibold text-on-surface hover:bg-surface-container shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              + Indicador KPI
            </button>
            <button
              type="button"
              onClick={() => handleAddWidget("bar")}
              className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 py-1 text-label-xs font-semibold text-on-surface hover:bg-surface-container shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">bar_chart</span>
              + Gráfico de Barras
            </button>
            <button
              type="button"
              onClick={handleAddSlicer}
              className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 py-1 text-label-xs font-semibold text-on-surface hover:bg-surface-container shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt</span>
              + Slicer de Filtro
            </button>
          </div>

          <div className="flex items-center gap-2 text-label-xs">
            <button
              type="button"
              onClick={() => {
                const name = prompt("Nuevo nombre para esta página:", currentPage.title);
                if (name) handleRenamePage(name);
              }}
              className="underline text-on-surface-variant hover:text-on-surface"
            >
              Renombrar página
            </button>
            <button
              type="button"
              onClick={handleDeleteCurrentPage}
              className="text-error hover:underline"
            >
              Eliminar página
            </button>
          </div>
        </div>
      )}

      <div
        ref={reportRef}
        className={`flex flex-col rounded-2xl bg-surface-container-low/50 ${
          isDenseLayout ? "gap-2 p-2" : "gap-space-sm rounded-3xl p-space-md"
        }`}
      >
        <header className={`flex flex-wrap justify-between gap-space-sm border border-outline-variant/40 border-b-2 ${
          isCompactReport ? "border-b-[#edc400]" : "border-b-secondary"
        } bg-surface-container-lowest ${
          isDenseLayout ? "items-center rounded-xl px-space-md py-1.5" : "items-end rounded-2xl px-space-lg py-space-md"
        }`}>
          <div className="flex min-w-0 items-end gap-3">
            <span className="hidden text-2xl font-black tracking-tight text-primary sm:block" aria-hidden="true">HR</span>
            <div className="min-w-0">
              {dashboard.id && <p className="mb-0.5 text-label-sm font-semibold uppercase tracking-[0.15em] text-on-surface-variant">{dashboard.name}</p>}
              <h1 className={`truncate font-medium tracking-tight text-on-surface ${
                isDenseLayout ? "text-headline-sm" : "text-headline-lg"
              }`}>{currentPage.header?.title || currentPage.title}</h1>
            </div>
          </div>
          {isCompactReport && onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-space-md py-1.5 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
              Volver a los módulos
            </button>
          )}
          {!isDenseLayout && (
            <>
              <p className="text-body-xs text-on-surface-variant">
                Capturado: {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
              </p>
              <p className="w-full border-t border-outline-variant/50 pt-1 text-body-xs text-on-surface-variant">{filterSummary.join("  ·  ")}</p>
            </>
          )}
        </header>

      {/* Embedded Slicers Row (if configured on the page) */}
      {slicers.length > 0 && (
        <section className={`flex flex-wrap items-center justify-end ${
          isDenseLayout ? "gap-2 rounded-xl px-space-sm py-1.5" : "gap-4 rounded-2xl px-space-md py-space-sm"
        } border border-outline-variant/50 border-l-4 border-l-secondary bg-surface-container-lowest shadow-xs`}>
          {slicers.map((slicer, idx) => (
            <div key={slicer.id || idx} className="min-w-[140px]">
              <SlicerWidget
                type={slicer.type || "dropdown"}
                filterKey={slicer.filterKey}
                label={slicer.label}
                options={slicer.options}
                layoutConfig={slicer.layoutConfig}
                min={slicer.min}
                max={slicer.max}
                step={slicer.step}
              />
              {isEditMode && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <input
                    aria-label="Nombre del slicer"
                    value={slicer.label || ""}
                    onChange={(event) => handleUpdateSlicer(slicer.id || `slicer-${idx}`, { label: event.target.value })}
                    className="min-w-0 flex-1 rounded border border-outline-variant bg-surface-container-lowest px-1.5 py-1 text-[11px] text-on-surface"
                  />
                  <select
                    aria-label="Tipo de slicer"
                    value={slicer.type || "dropdown"}
                    onChange={(event) => handleUpdateSlicer(slicer.id || `slicer-${idx}`, { type: event.target.value })}
                    className="rounded border border-outline-variant bg-surface-container-lowest px-1 py-1 text-[11px] text-on-surface"
                  >
                    <option value="dropdown">Lista</option>
                    <option value="buttonList">Botones</option>
                    <option value="yearButtons">Años</option>
                    <option value="monthButtons">Meses</option>
                    <option value="slider">Slider</option>
                  </select>
                  <select
                    aria-label="Campo del slicer"
                    value={slicer.filterKey || "businessUnit"}
                    onChange={(event) => handleUpdateSlicer(slicer.id || `slicer-${idx}`, { filterKey: event.target.value })}
                    className="rounded border border-outline-variant bg-surface-container-lowest px-1 py-1 text-[11px] text-on-surface"
                  >
                    <option value="year">Año</option>
                    <option value="month">Mes</option>
                    <option value="businessUnit">Unidad</option>
                    <option value="department">Departamento</option>
                    <option value="region">Región</option>
                    <option value="location">Ubicación</option>
                    <option value="performanceRating">Desempeño</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlicer(slicer.id || `slicer-${idx}`)}
                    aria-label={`Eliminar slicer ${slicer.label || ""}`}
                    className="rounded p-1 text-error hover:bg-error-container"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Main Report Canvas */}
      <div className={currentPage.grid ? "min-h-0" : "min-h-[500px]"}>
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-space-xl text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-primary mb-2">dashboard</span>
            <p className="text-label-lg font-semibold">Esta página aún no contiene widgets.</p>
            {isEditMode && (
              <button
                type="button"
                onClick={() => handleAddWidget("kpi")}
                className="mt-space-sm rounded-full bg-primary px-space-md py-2 text-label-sm font-semibold text-on-primary shadow-xs"
              >
                Añadir Primer Widget
              </button>
            )}
          </div>
        ) : (
          <div
            ref={canvasRef}
            className="grid items-stretch"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              gridAutoRows: `${gridRowHeight}px`,
              gap: `${gridGap}px`,
            }}
          >
            {!isNarrowCanvas && Array.isArray(currentPage.bands) && currentPage.bands.map((band, index) => {
              const y = Math.max(0, Number(band.y) || 0);
              const height = Math.max(1, Number(band.h) || 1);
              return (
                <div
                  key={`band-${index}`}
                  aria-hidden="true"
                  className="rounded-xl bg-surface-container-lowest shadow-sm"
                  style={{
                    gridColumn: "1 / -1",
                    gridRow: `${y + 1} / span ${height}`,
                    zIndex: 0,
                  }}
                />
              );
            })}
            {widgets.map((widget, index) => {
              const x = Number.isInteger(widget.layout?.x) ? widget.layout.x : null;
              const y = Number.isInteger(widget.layout?.y) ? widget.layout.y : null;
              const width = Math.min(gridColumns, Math.max(1, Number(widget.layout?.w) || 6));
              const height = Math.min(8, Math.max(1, Number(widget.layout?.h) || 2));
              const reflowForNarrowCanvas = isNarrowCanvas && configuredColumns > 12;
              const isSelected = selectedWidgetId === widget.id;

              return (
                <div
                  key={widget.id}
                  style={{
                    gridColumn: reflowForNarrowCanvas
                      ? `span ${widget.type === "sectionLabel" ? gridColumns : Math.ceil(gridColumns / 2)}`
                      : x === null ? `span ${width}` : `${x + 1} / span ${width}`,
                    gridRow: reflowForNarrowCanvas
                      ? `span ${widget.type === "sectionLabel" ? 1 : 2}`
                      : y === null ? `span ${height}` : `${y + 1} / span ${height}`,
                    minWidth: 0,
                    minHeight: 0,
                    zIndex: 1,
                  }}
                  draggable={isEditMode}
                  onClick={() => {
                    if (isEditMode) {
                      setSelectedWidgetId(widget.id);
                      setEditorDrawerOpen(true);
                    }
                  }}
                  onDragStart={() => { dragWidgetIndex.current = index; }}
                  onDragOver={(event) => {
                    if (isEditMode) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleReorderWidget(dragWidgetIndex.current, index);
                    dragWidgetIndex.current = null;
                  }}
                  onDragEnd={() => { dragWidgetIndex.current = null; }}
                  className={`relative h-full group ${
                    isEditMode
                      ? `cursor-move transition-all ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 rounded-2xl"
                            : "hover:ring-1 hover:ring-outline-variant rounded-2xl"
                        }`
                      : ""
                  }`}
                >
                  {/* Edit mode floating toolbar on widget */}
                  {isEditMode && (
                    <div data-capture-ignore="true" className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-xl bg-surface-container-lowest/95 border border-outline-variant/60 p-1 shadow-sm opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCycleWidth(widget);
                        }}
                        title={`Ancho: ${widget.layout?.w || 6}/12. Clic para cambiar.`}
                        className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-primary hover:bg-surface-container"
                      >
                        {widget.layout?.w || 6}/12
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWidget(index, -1);
                        }}
                        title="Mover antes"
                        disabled={index === 0}
                        className="rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveWidget(index, 1);
                        }}
                        title="Mover después"
                        disabled={index === widgets.length - 1}
                        className="rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateWidget(widget);
                        }}
                        title="Duplicar widget"
                        className="rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWidget(widget.id);
                        }}
                        title="Eliminar widget"
                        className="rounded-full p-0.5 text-error hover:bg-error-container"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )}

                  <GenericWidgetRenderer
                    widget={widget}
                    compact={isDenseLayout}
                    employees={employees}
                    extraDatasets={extraDatasets}
                    onDrillThrough={(emp) => setDrillEmployee(emp)}
                    onAskGemini={onAskGemini}
                    geminiExplanation={geminiExplanation}
                    loadingGemini={loadingGemini}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Bottom Page Navigation Bar: ‹ n de N › */}
      <footer className={`relative flex items-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xs ${
        isCompactReport ? "min-w-0 justify-center gap-2 px-space-sm py-1" : "justify-between gap-space-sm px-space-md py-2"
      }`}>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={currentPageIndex <= 0}
            onClick={() => onSelectPage?.(currentPageIndex - 1)}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
            aria-label="Página anterior"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <div className="relative" ref={pageMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={pageMenuOpen}
              aria-controls="hr-page-menu"
              aria-label={`Seleccionar página ${currentPageIndex + 1} de ${pages.length}`}
              onClick={() => setPageMenuOpen((open) => !open)}
              className={`inline-flex items-center gap-1 rounded-lg font-semibold text-on-surface transition-colors hover:bg-surface-container ${
                isCompactReport ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-label-sm"
              }`}
            >
              {currentPageIndex + 1} de {pages.length}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {pageMenuOpen ? "expand_more" : "expand_less"}
              </span>
            </button>
            {pageMenuOpen && (
              <div
                id="hr-page-menu"
                role="menu"
                aria-label="Seleccionar módulo"
                className="absolute bottom-full left-1/2 z-[120] mb-2 max-h-[65vh] w-72 -translate-x-1/2 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-xl"
              >
                <div className="flex flex-col gap-0.5">
                  {pages.map((page, index) => (
                    <button
                      key={page.id || index}
                      type="button"
                      role="menuitem"
                      aria-current={currentPageIndex === index ? "page" : undefined}
                      onClick={() => {
                        onSelectPage?.(index);
                        setPageMenuOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
                        currentPageIndex === index
                          ? "bg-primary text-on-primary font-semibold"
                          : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex flex-col gap-0.5 border-t border-outline-variant/50 pt-1">
                  {onOpenDashboardManager && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPageMenuOpen(false);
                        onOpenDashboardManager();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container"
                    >
                      Administrar tableros
                    </button>
                  )}
                  <Link
                    to="/analytics/import"
                    role="menuitem"
                    onClick={() => setPageMenuOpen(false)}
                    className="w-full rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container"
                  >
                    Importar datos
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={capturing}
                    onClick={() => {
                      setPageMenuOpen(false);
                      handleExportPng();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
                  >
                    Descargar imagen PNG
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={capturing}
                    onClick={() => {
                      setPageMenuOpen(false);
                      handleExportPdf();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
                  >
                    Descargar reporte PDF
                  </button>
                  {onToggleEditMode && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPageMenuOpen(false);
                        onToggleEditMode();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-body-sm text-on-surface hover:bg-surface-container"
                    >
                      {isEditMode ? "Finalizar edición" : "Activar modo de edición"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={currentPageIndex >= pages.length - 1}
            onClick={() => onSelectPage?.(currentPageIndex + 1)}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
            aria-label="Página siguiente"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>

        {(!isCompactReport || isEditMode) && <nav className="flex min-w-0 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Páginas del tablero">
          {pages.map((p, idx) => (
            <button
              key={p.id || idx}
              type="button"
              onClick={() => onSelectPage?.(idx)}
              draggable={isEditMode}
              onDragStart={() => { dragPageIndex.current = idx; }}
              onDragOver={(event) => {
                if (isEditMode) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleReorderPage(dragPageIndex.current, idx);
                dragPageIndex.current = null;
              }}
              onDragEnd={() => { dragPageIndex.current = null; }}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-label-sm font-medium transition-colors ${
                currentPageIndex === idx
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
              title={isEditMode ? "Arrastra para cambiar el orden de la página" : undefined}
            >
              {p.title}
            </button>
          ))}
          {isEditMode && (
            <button
              type="button"
              onClick={handleAddPage}
              title="Añadir nueva página al reporte"
              className="rounded-lg border border-dashed border-outline-variant px-2.5 py-1 text-label-xs font-semibold text-primary hover:bg-surface-container flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Nueva Página
            </button>
          )}
        </nav>}
      </footer>

      {/* Power BI Edit Drawer (Visible in Edit Mode) */}
      {isEditMode && (
        <PowerBiEditorDrawer
          isOpen={editorDrawerOpen}
          onClose={() => setEditorDrawerOpen(false)}
          selectedWidget={selectedWidget}
          onUpdateWidget={handleUpdateWidget}
          onAddWidget={handleAddWidget}
          onAddSlicer={handleAddSlicer}
          onDeleteWidget={handleDeleteWidget}
          onDuplicateWidget={handleDuplicateWidget}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          savingStatus={dashboardSaveStatus === "saved" ? savingStatus : dashboardSaveStatus}
        />
      )}

      {/* Drill-through Modal (Personal profile preview without salary) */}
      {drillEmployee && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-space-lg shadow-xl">
            <header className="flex items-start justify-between border-b border-outline-variant/40 pb-space-sm">
              <div>
                <span className="text-label-sm text-secondary uppercase font-semibold">Ficha de Detalle</span>
                <h3 className="text-headline-sm text-on-surface mt-0.5">{drillEmployee.name}</h3>
                <span className="text-body-xs text-on-surface-variant">{drillEmployee.employeeId} · {drillEmployee.designation}</span>
              </div>
              <button
                type="button"
                onClick={() => setDrillEmployee(null)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            <div className="grid grid-cols-2 gap-space-sm py-space-md text-body-sm">
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Estado</span>
                <p className="font-semibold text-on-surface">{drillEmployee.status}</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Departamento</span>
                <p className="font-semibold text-on-surface">{drillEmployee.department}</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Unidad de Negocio</span>
                <p className="font-semibold text-on-surface">{drillEmployee.businessUnit}</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Nivel Org.</span>
                <p className="font-semibold text-on-surface">{drillEmployee.orgLevel}</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Fecha Contratación</span>
                <p className="font-semibold text-on-surface">{drillEmployee.hireDate}</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Antigüedad</span>
                <p className="font-semibold text-on-surface">{drillEmployee.tenureYears} años ({drillEmployee.tenureBand})</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Edad / Generación</span>
                <p className="font-semibold text-on-surface">{drillEmployee.age} años ({drillEmployee.generation})</p>
              </div>
              <div>
                <span className="text-label-xs text-on-surface-variant uppercase">Riesgo de Atrición</span>
                <p className="font-semibold text-on-surface">
                  {(drillEmployee.riskProbability * 100).toFixed(0)}% ({drillEmployee.riskLevel})
                </p>
              </div>
            </div>

            <footer className="flex justify-end border-t border-outline-variant/40 pt-space-sm">
              <button
                type="button"
                onClick={() => setDrillEmployee(null)}
                className="rounded-full bg-primary px-space-md py-1.5 text-label-sm font-medium text-on-primary"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
