import { useHrFilters } from "../../context/useHrFilters";

const MONTH_NAMES = [
  { num: 1, label: "Ene" },
  { num: 2, label: "Feb" },
  { num: 3, label: "Mar" },
  { num: 4, label: "Abr" },
  { num: 5, label: "May" },
  { num: 6, label: "Jun" },
  { num: 7, label: "Jul" },
  { num: 8, label: "Ago" },
  { num: 9, label: "Sep" },
  { num: 10, label: "Oct" },
  { num: 11, label: "Nov" },
  { num: 12, label: "Dic" },
];

export default function SlicerWidget({
  type = "yearButtons", // "yearButtons" | "monthButtons" | "dropdown" | "buttonList" | "slider"
  filterKey = "year",
  label = "Filtro",
  options = [], // for dropdown or buttonList: [{ value, label }]
  min = 0,
  max = 1,
  step = 0.05,
}) {
  const {
    filters,
    setFilter,
    availableYears,
    availableBusinessUnits,
    availableDepartments,
    availableRegions,
    availableLocations,
  } = useHrFilters();

  const currentValue = filters[filterKey];

  // 1. Year Buttons Slicer
  if (type === "yearButtons") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className="flex flex-wrap gap-1">
          {availableYears.map((year) => {
            const isActive = Number(filters.year) === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setFilter("year", year)}
                className={`rounded-lg px-2.5 py-1 text-label-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#edc400] text-black shadow-xs font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Month Buttons Slicer
  if (type === "monthButtons") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">{label}</span>
          {filters.month && (
            <button
              type="button"
              onClick={() => setFilter("month", null)}
              className="text-[11px] text-primary underline"
            >
              Todos los meses
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {MONTH_NAMES.map((m) => {
            const isActive = Number(filters.month) === m.num;
            return (
              <button
                key={m.num}
                type="button"
                onClick={() => setFilter("month", isActive ? null : m.num)}
                className={`rounded-lg px-2 py-1 text-label-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#edc400] text-black shadow-xs font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Dropdown Slicer
  if (type === "dropdown") {
    let resolvedOptions = options;
    if (filterKey === "businessUnit" && resolvedOptions.length === 0) {
      resolvedOptions = [{ value: "", label: "Todas las unidades" }, ...availableBusinessUnits.map((bu) => ({ value: bu, label: bu }))];
    } else if (filterKey === "department" && resolvedOptions.length === 0) {
      resolvedOptions = [{ value: "", label: "Todos los departamentos" }, ...availableDepartments.map((dept) => ({ value: dept, label: dept }))];
    } else if (filterKey === "region" && resolvedOptions.length === 0) {
      resolvedOptions = [{ value: "", label: "Todas las regiones" }, ...availableRegions.map((reg) => ({ value: reg, label: reg }))];
    } else if (filterKey === "location" && resolvedOptions.length === 0) {
      resolvedOptions = [{ value: "", label: "Todas las ubicaciones" }, ...availableLocations.map((loc) => ({ value: loc, label: loc }))];
    }

    return (
      <label className="flex flex-col gap-1">
        <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <select
          value={currentValue ?? ""}
          onChange={(e) => setFilter(filterKey, e.target.value || null)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary shadow-xs"
        >
          {resolvedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // 4. Button List Slicer (e.g. Performance Rating buttons or Department List)
  if (type === "buttonList") {
    let resolvedList = options;
    if (filterKey === "department" && resolvedList.length === 0) {
      resolvedList = availableDepartments.map((d) => ({ value: d, label: d }));
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">{label}</span>
          {currentValue && (
            <button
              type="button"
              onClick={() => setFilter(filterKey, null)}
              className="text-[11px] text-primary underline"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
          {resolvedList.map((item) => {
            const isActive = currentValue === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(filterKey, isActive ? null : item.value)}
                className={`rounded-lg px-2.5 py-1 text-label-sm transition-all ${
                  isActive
                    ? "bg-[#edc400] text-black font-bold shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. Slider Range Slicer (e.g. Risk Probability threshold)
  if (type === "slider") {
    const val = Number.isFinite(Number(currentValue)) ? Number(currentValue) : min;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-label-sm">
          <span className="font-semibold text-on-surface-variant uppercase tracking-wider">{label}</span>
          <span className="font-bold text-primary">{val.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => setFilter(filterKey, Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[#edc400]"
        />
        <div className="flex justify-between text-body-xs text-on-surface-variant">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }

  return null;
}
