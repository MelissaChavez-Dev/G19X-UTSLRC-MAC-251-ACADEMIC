import { useMemo } from "react";
import { compute } from "../metricsEngine";
import { useHrFilters } from "../context/useHrFilters";
import KpiWidget from "./widgets/KpiWidget";
import BarChartWidget from "./widgets/BarChartWidget";
import StackedBarWidget from "./widgets/StackedBarWidget";
import ButterflyChartWidget from "./widgets/ButterflyChartWidget";
import LineChartWidget from "./widgets/LineChartWidget";
import ComboChartWidget from "./widgets/ComboChartWidget";
import DonutWidget from "./widgets/DonutWidget";
import AreaChartWidget from "./widgets/AreaChartWidget";
import WaterfallWidget from "./widgets/WaterfallWidget";
import TableWidget from "./widgets/TableWidget";
import MatrixWidget from "./widgets/MatrixWidget";
import SankeyWidget from "./widgets/SankeyWidget";
import GaugeWidget from "./widgets/GaugeWidget";
import SummaryBoardWidget from "./widgets/SummaryBoardWidget";
import SlicerWidget from "./widgets/SlicerWidget";

export default function GenericWidgetRenderer({
  widget = {},
  employees = [],
  extraDatasets = {},
  onDrillThrough,
  onAskGemini,
  geminiExplanation = "",
  loadingGemini = false,
  compact = false,
}) {
  const { activeContext, filters, toggleCrossFilter } = useHrFilters();

  // Combine widget-level filters with active context
  const effectiveContext = useMemo(() => {
    return {
      ...activeContext,
      ...(widget.filters || {}),
      dimension: widget.dimension || activeContext.dimension,
      dimensionA: widget.options?.dimensionA,
      dimensionB: widget.options?.dimensionB,
      population: widget.options?.population,
    };
  }, [activeContext, widget.filters, widget.dimension, widget.options]);

  // Compute metric data via master engine
  const computedData = useMemo(() => {
    if (!widget.measure || widget.type === "slicer") return null;
    try {
      return compute(widget.measure, employees, effectiveContext, extraDatasets);
    } catch (err) {
      console.warn(`Error al computar métrica "${widget.measure}" en widget "${widget.title}":`, err);
      return { error: err.message };
    }
  }, [widget.measure, widget.type, widget.title, employees, effectiveContext, extraDatasets]);

  if (widget.type === "sectionLabel") {
    const accentColor = widget.options?.color;
    return (
      <div className="flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 text-center">
        <span
          className={`material-symbols-outlined text-[34px] leading-none ${accentColor ? "" : "text-on-surface-variant"}`}
          aria-hidden="true"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {widget.options?.icon || "groups"}
        </span>
        <span
          className={`line-clamp-2 text-[14px] font-semibold leading-tight tracking-wide ${accentColor ? "" : "text-[#9b7800]"}`}
          style={accentColor ? { color: accentColor } : undefined}
        >
          {widget.title}
        </span>
      </div>
    );
  }

  // Handle cross-filter clicks from widgets
  function handleCrossFilter(value) {
    const dim = widget.measure === "crossMatrix"
      ? widget.options?.dimensionA || "department"
      : widget.measure === "regionSummary"
        ? "region"
        : widget.dimension || "department";
    toggleCrossFilter(dim, value);
  }

  // If widget is a Slicer control
  if (widget.type === "slicer") {
    return (
      <div className="flex h-full flex-col justify-center rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-space-md shadow-xs">
        <SlicerWidget
          type={widget.options?.slicerType || "dropdown"}
          filterKey={widget.options?.filterKey || "businessUnit"}
          label={widget.title || "Filtro"}
          options={widget.options?.options || []}
          min={widget.options?.min}
          max={widget.options?.max}
          step={widget.options?.step}
        />
      </div>
    );
  }

  // Handle compute error
  if (computedData?.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-error/40 bg-error-container/20 p-space-md text-center">
        <span className="material-symbols-outlined text-error text-[28px]" aria-hidden="true">error</span>
        <span className="mt-1 text-label-md font-semibold text-on-error-container">{widget.title}</span>
        <span className="text-body-xs text-on-error-container/80 mt-0.5">{computedData.error}</span>
      </div>
    );
  }

  // Inner visual selector
  function renderVisual() {
    switch (widget.type) {
      case "kpi":
        return (
          <KpiWidget
            title={widget.title}
            value={computedData}
            compact={compact}
            unit={widget.options?.unit || ""}
            decimals={widget.options?.decimals ?? 1}
            color={widget.options?.color}
            comparisonValue={
              widget.options?.comparisonMeasure
                ? compute(widget.options.comparisonMeasure, employees, effectiveContext, extraDatasets)
                : null
            }
            comparisonLabel={widget.options?.comparisonLabel || "vs año anterior"}
            invertDelta={widget.options?.invertDelta || false}
            icon={widget.options?.icon}
            badgeText={widget.options?.badgeText}
          />
        );

      case "bar":
        return (
          <BarChartWidget
            data={computedData || []}
            layout={
              widget.options?.orientation === "horizontal"
                ? "vertical"
                : widget.options?.layout || "horizontal"
            }
            categoryKey={widget.options?.categoryKey || "name"}
            valueKey={widget.options?.valueKey || "count"}
            unit={widget.options?.unit || ""}
            compact={compact}
            color={widget.options?.color}
            hideAxis={widget.options?.hideAxis || false}
            showValues={widget.options?.showValues || false}
            activeItem={filters.crossFilter?.value}
            onItemClick={handleCrossFilter}
          />
        );

      case "stackedBar":
        return (
          <StackedBarWidget
            data={computedData || []}
            categoryKey={widget.options?.categoryKey || "name"}
            seriesKeys={widget.options?.seriesKeys || []}
            isPercent={widget.options?.isPercent || false}
            unit={widget.options?.unit || ""}
            compact={compact}
            onItemClick={handleCrossFilter}
          />
        );

      case "butterfly":
        return (
          <ButterflyChartWidget
            data={computedData || []}
            categoryKey={widget.options?.categoryKey || "name"}
            leftKey={widget.options?.leftKey || "Female"}
            rightKey={widget.options?.rightKey || "Male"}
            leftLabel={widget.options?.leftLabel || "Femenino"}
            rightLabel={widget.options?.rightLabel || "Masculino"}
            compact={compact}
            onItemClick={handleCrossFilter}
          />
        );

      case "line":
        return (
          <LineChartWidget
            data={computedData || []}
            xKey={widget.options?.xKey || "label"}
            currentKey={widget.options?.currentKey || "value"}
            currentLabel={widget.options?.currentLabel || "Actual"}
            priorKey={widget.options?.priorKey}
            priorLabel={widget.options?.priorLabel || "Año anterior (LY)"}
            unit={widget.options?.unit || ""}
            compact={compact}
          />
        );

      case "combo":
        return (
          <ComboChartWidget
            data={computedData || []}
            xKey={widget.options?.xKey || "name"}
            barKey={widget.options?.barKey || "count"}
            barLabel={widget.options?.barLabel || "Dotación"}
            lineKey={widget.options?.lineKey || "rate"}
            lineLabel={widget.options?.lineLabel || "Tasa (%)"}
            compact={compact}
          />
        );

      case "donut":
        return (
          <DonutWidget
            data={computedData || []}
            nameKey={widget.options?.nameKey || "name"}
            valueKey={widget.options?.valueKey || "count"}
            unit={widget.options?.unit || ""}
            compact={compact}
            labelMode={widget.options?.labelMode}
            showValues={widget.options?.showValues || false}
            labelMap={widget.options?.labelMap || {}}
            activeItem={filters.crossFilter?.value}
            onItemClick={handleCrossFilter}
          />
        );

      case "area":
        return (
          <AreaChartWidget
            data={computedData || []}
            xKey={widget.options?.xKey || "label"}
            valueKey={widget.options?.valueKey || "value"}
            unit={widget.options?.unit || ""}
            color={widget.options?.color || "#355c4b"}
            compact={compact}
          />
        );

      case "waterfall":
        return <WaterfallWidget data={computedData || []} compact={compact} />;

      case "table":
        return (
          <TableWidget
            data={computedData || []}
            columns={widget.options?.columns || []}
            pageSize={widget.options?.pageSize || 10}
            compact={compact}
            onRowClick={onDrillThrough}
          />
        );

      case "matrix":
        return (
          <MatrixWidget
            matrixData={computedData || []}
            rowLabel={widget.options?.rowLabel || "Categoría"}
            alternatorOptions={widget.options?.alternatorOptions}
            compact={compact}
          />
        );

      case "sankey":
        return (
          <SankeyWidget
            nodes={computedData?.nodes || []}
            links={computedData?.links || []}
            width={widget.options?.width || (compact ? 460 : 560)}
            height={widget.options?.height || (compact ? 140 : 260)}
            compact={compact}
          />
        );

      case "gauge":
        return (
          <GaugeWidget
            value={computedData}
            target={widget.options?.target ?? 50}
            title={widget.options?.gaugeTitle || ""}
            unit={widget.options?.unit || "%"}
            compact={compact}
          />
        );

      case "textBoard":
        return (
          <SummaryBoardWidget
            statements={computedData || []}
            note={widget.options?.note}
            compact={compact}
            compact={compact}
            onAskGemini={onAskGemini}
            geminiExplanation={geminiExplanation}
            loadingGemini={loadingGemini}
          />
        );

      default:
        return (
          <div className="flex h-36 items-center justify-center text-body-sm text-on-surface-variant">
            Tipo de visualización no reconocido: &quot;{widget.type}&quot;
          </div>
        );
    }
  }

  // Wrapper card container
  return (
    <article className={`flex h-full min-w-0 flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-space-sm shadow-xs transition-shadow hover:shadow-sm ${
      widget.type === "kpi" || widget.type === "textBoard" ? "border-0 p-0 shadow-none hover:shadow-none" : ""
    }`}>
      {widget.type !== "kpi" && widget.type !== "textBoard" && widget.title && (
        <header className={`flex items-center justify-center gap-2 border-b border-outline-variant/30 ${
          compact ? "mb-0.5 pb-0.5" : "mb-1 pb-1"
        }`}>
          <h4 className={`truncate text-center font-semibold text-on-surface ${compact ? "text-xs" : "text-sm"}`}>{widget.title}</h4>
          {widget.options?.subtitle && (
            <span className="text-body-xs text-on-surface-variant truncate">{widget.options.subtitle}</span>
          )}
        </header>
      )}

      <div className="flex-1 min-h-0 w-full flex flex-col justify-center">
        {renderVisual()}
      </div>
    </article>
  );
}
