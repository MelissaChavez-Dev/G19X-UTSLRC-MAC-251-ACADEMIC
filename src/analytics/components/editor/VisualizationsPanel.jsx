const WIDGET_TYPES = [
  { id: "kpi", label: "Indicador KPI", icon: "speed" },
  { id: "bar", label: "Barras Simples", icon: "bar_chart" },
  { id: "stackedBar", label: "Barras Apiladas", icon: "stacked_bar_chart" },
  { id: "butterfly", label: "Mariposa (Tornado)", icon: "compare_arrows" },
  { id: "line", label: "Línea Temporal", icon: "show_chart" },
  { id: "combo", label: "Barras + Línea (Combo)", icon: "multiline_chart" },
  { id: "donut", label: "Gráfico de Anillo", icon: "pie_chart" },
  { id: "area", label: "Área Continua", icon: "area_chart" },
  { id: "waterfall", label: "Cascada (Waterfall)", icon: "waterfall_chart" },
  { id: "table", label: "Tabla Analítica", icon: "table_chart" },
  { id: "matrix", label: "Matriz de Calor 2D", icon: "grid_on" },
  { id: "sankey", label: "Flujo Sankey", icon: "account_tree" },
  { id: "gauge", label: "Medidor Radial", icon: "incomplete_circle" },
  { id: "textBoard", label: "Summary Board", icon: "article" },
  { id: "slicer", label: "Control Slicer", icon: "filter_alt" },
];

const WIDTH_OPTIONS = [
  { value: 3, label: "3/12 cols (25%)" },
  { value: 4, label: "4/12 cols (33%)" },
  { value: 6, label: "6/12 cols (50%)" },
  { value: 8, label: "8/12 cols (66%)" },
  { value: 9, label: "9/12 cols (75%)" },
  { value: 12, label: "12/12 cols (100%)" },
];

export default function VisualizationsPanel({
  selectedWidget,
  onUpdateWidget,
}) {
  if (!selectedWidget) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-space-md text-center text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] mb-2 text-primary" aria-hidden="true">
          touch_app
        </span>
        Selecciona un widget del lienzo para configurar su tipo y visualización.
      </div>
    );
  }

  function handleTypeChange(type) {
    onUpdateWidget({ ...selectedWidget, type });
  }

  function handleWidthChange(w) {
    onUpdateWidget({
      ...selectedWidget,
      layout: { ...(selectedWidget.layout || {}), w },
    });
  }

  return (
    <div className="flex flex-col gap-space-md p-space-sm text-body-sm">
      {/* Visual Type Grid (Power BI style icons grid) */}
      <div>
        <label className="text-label-xs font-semibold uppercase text-on-surface-variant tracking-wider block mb-2">
          Tipo de Visualización
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {WIDGET_TYPES.map((t) => {
            const isSelected = selectedWidget.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeChange(t.id)}
                title={t.label}
                className={`flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-xs font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                <span className="text-[10px] mt-1 leading-tight line-clamp-1">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title & Subtitle Inputs */}
      <div className="flex flex-col gap-space-sm">
        <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
          <span className="font-semibold uppercase tracking-wider">Título del Widget</span>
          <input
            type="text"
            value={selectedWidget.title || ""}
            onChange={(e) => onUpdateWidget({ ...selectedWidget, title: e.target.value })}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
          <span className="font-semibold uppercase tracking-wider">Subtítulo / Nota</span>
          <input
            type="text"
            value={selectedWidget.options?.subtitle || ""}
            onChange={(e) =>
              onUpdateWidget({
                ...selectedWidget,
                options: { ...(selectedWidget.options || {}), subtitle: e.target.value },
              })
            }
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
          />
        </label>
      </div>

      {/* Width in 12-col grid */}
      <div>
        <label className="text-label-xs font-semibold uppercase text-on-surface-variant tracking-wider block mb-1">
          Ancho en Grilla (12 Columnas)
        </label>
        <select
          value={selectedWidget.layout?.w || 6}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
        >
          {WIDTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Unit Input */}
      <div>
        <label className="text-label-xs font-semibold uppercase text-on-surface-variant tracking-wider block mb-1">
          Unidad de Medida
        </label>
        <input
          type="text"
          placeholder="Ej. %, colab., años"
          value={selectedWidget.options?.unit || ""}
          onChange={(e) =>
            onUpdateWidget({
              ...selectedWidget,
              options: { ...(selectedWidget.options || {}), unit: e.target.value },
            })
          }
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
