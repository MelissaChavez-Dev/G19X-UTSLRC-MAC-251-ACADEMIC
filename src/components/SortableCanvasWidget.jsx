import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { calculateCanvasWidget, WIDGET_DATE_RANGES } from "../utils/canvasMetrics";

const WIDTH_CLASSES = {
  3: "col-span-1 md:col-span-1 xl:col-span-3",
  6: "col-span-1 md:col-span-2 xl:col-span-6",
  9: "col-span-1 md:col-span-2 xl:col-span-9",
  12: "col-span-1 md:col-span-2 xl:col-span-12",
};

const HEIGHT_CLASSES = {
  compact: "min-h-56",
  regular: "min-h-72",
  tall: "min-h-[26rem]",
};

const VISUALIZATION_OPTIONS = [
  { id: "kpi", label: "Indicador" },
  { id: "line", label: "Línea" },
  { id: "bar", label: "Barras" },
  { id: "table", label: "Tabla" },
];

const PALETTES = {
  sage: { label: "Salvia", surface: "#f3f5ef", accent: "#74846a" },
  mint: { label: "Menta", surface: "#eef6f1", accent: "#4f8070" },
  forest: { label: "Bosque", surface: "#edf2ee", accent: "#355c4b" },
};

const INPUT_CLASS = "rounded-lg bg-white/70 px-2 py-1 text-label-sm text-on-surface";

function formatMetricValue(value, metric) {
  if (!Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);
  return metric.unit === "%" ? `${formatted}%` : `${formatted} ${metric.unit}`.trim();
}

function isThresholdReached(value, threshold, operator) {
  if (!Number.isFinite(value) || threshold === "" || !Number.isFinite(Number(threshold))) return false;
  return operator === "below" ? value <= Number(threshold) : value >= Number(threshold);
}

function WidgetVisualization({ widget, metric, result, accent }) {
  if (result.records.length === 0 || result.count === 0) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-[32px]" style={{ color: accent }} aria-hidden="true">monitoring</span>
        <p role="status" className="mt-2 text-body-sm text-on-surface-variant">Sin datos para este periodo y filtro.</p>
      </div>
    );
  }

  if (widget.visualization === "kpi") {
    return (
      <div className="flex h-full flex-col justify-center">
        <p className="text-headline-xl text-on-surface">{formatMetricValue(result.value, metric)}</p>
        <p className="mt-space-xs text-body-sm text-on-surface-variant">
          {result.count} {result.count === 1 ? "valor" : "valores"} · {metric.aggregation}
        </p>
        {isThresholdReached(result.value, widget.threshold, widget.thresholdOperator) && (
          <p role="status" aria-live="polite" className="mt-space-sm w-fit rounded-full bg-warning-container px-space-sm py-1 text-label-sm text-on-warning-container">
            Umbral de atención alcanzado
          </p>
        )}
      </div>
    );
  }

  if (widget.visualization === "table") {
    return (
      <div className="max-h-72 overflow-auto rounded-xl border border-outline-variant/60 bg-white/60">
        <table className="min-w-full text-left text-body-sm">
          <caption className="sr-only">Valores agrupados de {metric.name}</caption>
          <thead className="sticky top-0 bg-surface-container-low text-label-sm text-on-surface-variant">
            <tr>
              <th className="px-space-sm py-2">Grupo</th>
              <th className="px-space-sm py-2">{metric.name}</th>
              <th className="px-space-sm py-2">Muestra</th>
              <th className="px-space-sm py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {result.groups.slice(0, 50).map((group) => (
              <tr key={group.label} className="border-t border-outline-variant/40">
                <td className="px-space-sm py-2 text-on-surface">{group.label}</td>
                <td className="px-space-sm py-2 text-on-surface">{formatMetricValue(group.value, metric)}</td>
                <td className="px-space-sm py-2 text-on-surface">{group.count}</td>
                <td className="px-space-sm py-2 text-on-surface-variant">
                  {isThresholdReached(group.value, widget.threshold, widget.thresholdOperator) ? "Umbral alcanzado" : "En rango"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.groups.length > 50 && <p className="px-space-sm py-2 text-label-sm text-on-surface-variant">Se muestran 50 de {result.groups.length} grupos.</p>}
      </div>
    );
  }

  const chartData = result.groups.map((group) => ({ name: group.label, value: group.value }));
  const Chart = widget.visualization === "line" ? LineChart : BarChart;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <Tooltip formatter={(value) => formatMetricValue(Number(value), metric)} />
          {widget.visualization === "line" ? (
            <Line type="monotone" dataKey="value" name={metric.name} stroke={accent} strokeWidth={3} dot={{ r: 3 }} />
          ) : (
            <Bar dataKey="value" name={metric.name} fill={accent} radius={[8, 8, 0, 0]} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SortableCanvasWidget({
  widget,
  metric,
  availableMetrics,
  metricCatalog,
  records,
  onChange,
  onRemove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    backgroundColor: PALETTES[widget.palette]?.surface || PALETTES.sage.surface,
    borderColor: `${PALETTES[widget.palette]?.accent || PALETTES.sage.accent}55`,
  };
  const palette = PALETTES[widget.palette] || PALETTES.sage;
  const result = useMemo(
    () => calculateCanvasWidget(records, metric, widget, metricCatalog),
    [records, metric, widget, metricCatalog]
  );
  const dateRangeLabel = `${WIDGET_DATE_RANGES.includes(widget.dateRangeDays) ? widget.dateRangeDays : 30} días`;

  function update(field, value) {
    onChange({ ...widget, [field]: value });
  }

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 12px 28px rgba(42, 61, 49, 0.12)" }}
      transition={{ duration: 0.2 }}
      className={`${WIDTH_CLASSES[widget.width] || WIDTH_CLASSES[6]} ${HEIGHT_CLASSES[widget.height] || HEIGHT_CLASSES.regular} group flex min-w-0 flex-col gap-space-sm rounded-2xl border p-space-md shadow-sm transition-shadow duration-200`}
    >
      <header className="flex flex-wrap items-center gap-space-xs">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastrar widget ${widget.title}`}
          title="Arrastrar para reorganizar"
          className="touch-none cursor-grab rounded-full p-1 text-on-surface-variant hover:bg-white/70 active:cursor-grabbing"
        >
          <span className="material-symbols-outlined">drag_indicator</span>
        </button>
        <input
          aria-label="Título del widget"
          value={widget.title}
          maxLength={100}
          onChange={(event) => update("title", event.target.value)}
          className="min-w-32 flex-1 rounded-lg bg-transparent px-2 py-1 text-label-lg text-on-surface outline-none focus:bg-white/70"
        />
        <select
          aria-label="Métrica del widget"
          value={widget.metricDefinition ? "custom" : widget.metricId}
          onChange={(event) => {
            const nextMetric = availableMetrics.find((item) => item.id === event.target.value);
            if (nextMetric) {
              const standardWidget = { ...widget };
              delete standardWidget.metricDefinition;
              onChange({ ...standardWidget, metricId: nextMetric.id, title: nextMetric.name });
            }
          }}
          className={INPUT_CLASS}
        >
          {widget.metricDefinition && <option value="custom">{widget.metricDefinition.name} · personalizada</option>}
          {availableMetrics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select
          aria-label="Visualización del widget"
          value={widget.visualization}
          onChange={(event) => update("visualization", event.target.value)}
          className={INPUT_CLASS}
        >
          {VISUALIZATION_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select
          aria-label="Ancho del widget en columnas"
          value={widget.width}
          onChange={(event) => update("width", Number(event.target.value))}
          className={INPUT_CLASS}
          title="Ancho en la retícula de 12 columnas"
        >
          {![3, 6, 9, 12].includes(widget.width) && (
            <option value={widget.width}>{widget.width}/12 columnas · diseño anterior</option>
          )}
          {[3, 6, 9, 12].map((width) => <option key={width} value={width}>{width}/12 columnas</option>)}
        </select>
        <select
          aria-label="Altura del widget"
          value={widget.height}
          onChange={(event) => update("height", event.target.value)}
          className={INPUT_CLASS}
        >
          {["compact", "regular", "tall"].map((height) => <option key={height} value={height}>{height === "compact" ? "Baja" : height === "tall" ? "Alta" : "Media"}</option>)}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar widget ${widget.title}`}
          title="Quitar widget"
          className="rounded-full p-1 text-error hover:bg-error-container"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </header>

      <details className="rounded-xl bg-white/55 px-space-sm py-1.5">
        <summary className="cursor-pointer text-label-sm text-on-surface-variant">Configuración · {dateRangeLabel}</summary>
        <div className="mt-space-sm grid gap-space-sm sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Periodo independiente
            <select className={INPUT_CLASS} value={widget.dateRangeDays || 30} onChange={(event) => update("dateRangeDays", Number(event.target.value))}>
              {WIDGET_DATE_RANGES.map((days) => <option key={days} value={days}>Últimos {days} días</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Alerta
            <div className="flex gap-1">
              <select className={INPUT_CLASS} value={widget.thresholdOperator || "above"} onChange={(event) => update("thresholdOperator", event.target.value)}>
                <option value="above">≥</option>
                <option value="below">≤</option>
              </select>
              <input
                type="number"
                aria-label="Valor del umbral"
                className={`${INPUT_CLASS} min-w-0 flex-1`}
                value={widget.threshold ?? ""}
                onChange={(event) => update("threshold", event.target.value === "" ? null : Number(event.target.value))}
                placeholder="Sin umbral"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-label-sm text-on-surface-variant">
            Paleta
            <select className={INPUT_CLASS} value={widget.palette || "sage"} onChange={(event) => update("palette", event.target.value)}>
              {Object.entries(PALETTES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
        </div>
      </details>

      <div className="flex min-h-0 flex-1 flex-col">
        {result.error
          ? <p role="alert" className="text-body-sm text-error">{result.error}</p>
          : <WidgetVisualization widget={widget} metric={metric} result={result} accent={palette.accent} />}
      </div>
    </motion.article>
  );
}
