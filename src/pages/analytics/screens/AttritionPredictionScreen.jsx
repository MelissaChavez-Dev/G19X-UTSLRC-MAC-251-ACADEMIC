import { useState, useMemo } from "react";
import TableWidget from "../../../analytics/components/widgets/TableWidget";

export default function AttritionPredictionScreen({ employees = [] }) {
  const [levelFilter, setLevelFilter] = useState("All"); // "All" | "Low" | "Medium" | "Peak"
  const [minProb, setMinProb] = useState(0);
  const [buFilter, setBuFilter] = useState("");
  const [tenureFilter, setTenureFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [orgLevelFilter, setOrgLevelFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  // Only active employees are subject to attrition prediction
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status === "Active");
  }, [employees]);

  // Dynamic filter values
  const businessUnits = useMemo(() => Array.from(new Set(activeEmployees.map((e) => e.businessUnit).filter(Boolean))).sort(), [activeEmployees]);
  const tenureBands = ["0-1", "1-3", "3-5", "5+"];
  const orgLevels = ["Operational", "Mid-Level", "High-Level"];
  const locations = useMemo(() => Array.from(new Set(activeEmployees.map((e) => e.location).filter(Boolean))).sort(), [activeEmployees]);

  // Filtered dataset
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      const prob = Number(emp.riskProbability) || 0;
      if (prob < minProb) return false;
      if (levelFilter !== "All" && emp.riskLevel !== levelFilter) return false;
      if (buFilter && emp.businessUnit !== buFilter) return false;
      if (tenureFilter && emp.tenureBand !== tenureFilter) return false;
      if (genderFilter && emp.gender !== genderFilter) return false;
      if (orgLevelFilter && emp.orgLevel !== orgLevelFilter) return false;
      if (locationFilter && emp.location !== locationFilter) return false;
      return true;
    });
  }, [activeEmployees, minProb, levelFilter, buFilter, tenureFilter, genderFilter, orgLevelFilter, locationFilter]);

  // Overall Risk Counts
  const counts = useMemo(() => {
    const low = activeEmployees.filter((e) => e.riskLevel === "Low").length;
    const med = activeEmployees.filter((e) => e.riskLevel === "Medium").length;
    const peak = activeEmployees.filter((e) => e.riskLevel === "Peak").length;
    const total = activeEmployees.length;
    return {
      total,
      low: { count: low, pct: total ? ((low / total) * 100).toFixed(1) : 0 },
      medium: { count: med, pct: total ? ((med / total) * 100).toFixed(1) : 0 },
      peak: { count: peak, pct: total ? ((peak / total) * 100).toFixed(1) : 0 },
    };
  }, [activeEmployees]);

  const columns = [
    { key: "employeeId", label: "ID" },
    { key: "name", label: "Nombre Colaborador" },
    {
      key: "riskProbability",
      label: "Probabilidad",
      render: (val) => `${(Number(val) * 100).toFixed(1)}%`,
    },
    {
      key: "riskLevel",
      label: "Nivel de Riesgo",
      render: (val) => {
        let bg = "bg-primary-container text-on-primary-container";
        if (val === "Peak") bg = "bg-error-container text-on-error-container font-bold";
        else if (val === "Medium") bg = "bg-warning-container text-on-warning-container font-semibold";
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-xs ${bg}`}>
            {val}
          </span>
        );
      },
    },
    { key: "businessUnit", label: "Unidad de Negocio" },
    { key: "department", label: "Departamento" },
    { key: "orgLevel", label: "Nivel Org." },
    { key: "gender", label: "Género" },
    { key: "tenureBand", label: "Antigüedad" },
    { key: "location", label: "Ubicación" },
  ];

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* Summary KPI Cards & Level Selector */}
      <section className="grid gap-space-md sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setLevelFilter("All")}
          className={`flex flex-col justify-between rounded-2xl border p-space-md text-left transition-all ${
            levelFilter === "All"
              ? "border-primary bg-primary-container/20 shadow-xs"
              : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
          }`}
        >
          <span className="text-label-sm text-on-surface-variant">Total Colaboradores</span>
          <span className="text-headline-md font-bold text-on-surface mt-1">{counts.total.toLocaleString("es")}</span>
          <span className="text-body-xs text-on-surface-variant">Plantilla activa</span>
        </button>

        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === "Low" ? "All" : "Low")}
          className={`flex flex-col justify-between rounded-2xl border p-space-md text-left transition-all ${
            levelFilter === "Low"
              ? "border-primary bg-primary-container/40 shadow-xs ring-2 ring-primary/30"
              : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-semibold text-primary">Riesgo Bajo (&lt; 0.50)</span>
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          </div>
          <span className="text-headline-md font-bold text-on-surface mt-1">{counts.low.count.toLocaleString("es")}</span>
          <span className="text-body-xs text-on-surface-variant">{counts.low.pct}% de la plantilla</span>
        </button>

        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === "Medium" ? "All" : "Medium")}
          className={`flex flex-col justify-between rounded-2xl border p-space-md text-left transition-all ${
            levelFilter === "Medium"
              ? "border-warning bg-warning-container/40 shadow-xs ring-2 ring-warning/30"
              : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-semibold text-warning">Riesgo Medio (0.50-0.74)</span>
            <span className="material-symbols-outlined text-warning text-[18px]">warning</span>
          </div>
          <span className="text-headline-md font-bold text-on-surface mt-1">{counts.medium.count.toLocaleString("es")}</span>
          <span className="text-body-xs text-on-surface-variant">{counts.medium.pct}% de la plantilla</span>
        </button>

        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === "Peak" ? "All" : "Peak")}
          className={`flex flex-col justify-between rounded-2xl border p-space-md text-left transition-all ${
            levelFilter === "Peak"
              ? "border-error bg-error-container/40 shadow-xs ring-2 ring-error/30"
              : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-semibold text-error">Riesgo Crítico (≥ 0.75)</span>
            <span className="material-symbols-outlined text-error text-[18px]">emergency</span>
          </div>
          <span className="text-headline-md font-bold text-on-surface mt-1">{counts.peak.count.toLocaleString("es")}</span>
          <span className="text-body-xs text-on-surface-variant">{counts.peak.pct}% de la plantilla</span>
        </button>
      </section>

      {/* Slicers Row */}
      <section className="flex flex-wrap items-center gap-space-md rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-space-md shadow-xs">
        {/* Probability Slider */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <div className="flex items-center justify-between text-label-xs">
            <span className="font-semibold text-on-surface-variant uppercase">Probabilidad Mínima</span>
            <span className="font-bold text-primary">{(minProb * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={minProb}
            onChange={(e) => setMinProb(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
          />
        </div>

        {/* Business Unit dropdown */}
        <label className="flex flex-col gap-1 text-label-xs">
          <span className="text-on-surface-variant uppercase font-semibold">Unidad de Negocio</span>
          <select
            value={buFilter}
            onChange={(e) => setBuFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface"
          >
            <option value="">Todas</option>
            {businessUnits.map((bu) => <option key={bu} value={bu}>{bu}</option>)}
          </select>
        </label>

        {/* Tenure Band dropdown */}
        <label className="flex flex-col gap-1 text-label-xs">
          <span className="text-on-surface-variant uppercase font-semibold">Antigüedad</span>
          <select
            value={tenureFilter}
            onChange={(e) => setTenureFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface"
          >
            <option value="">Todas</option>
            {tenureBands.map((tb) => <option key={tb} value={tb}>{tb} años</option>)}
          </select>
        </label>

        {/* Gender dropdown */}
        <label className="flex flex-col gap-1 text-label-xs">
          <span className="text-on-surface-variant uppercase font-semibold">Género</span>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface"
          >
            <option value="">Todos</option>
            <option value="Female">Femenino</option>
            <option value="Male">Masculino</option>
            <option value="Other">Otro</option>
          </select>
        </label>

        {/* OrgLevel dropdown */}
        <label className="flex flex-col gap-1 text-label-xs">
          <span className="text-on-surface-variant uppercase font-semibold">Nivel Org.</span>
          <select
            value={orgLevelFilter}
            onChange={(e) => setOrgLevelFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface"
          >
            <option value="">Todos</option>
            {orgLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </label>

        {/* Location dropdown */}
        <label className="flex flex-col gap-1 text-label-xs">
          <span className="text-on-surface-variant uppercase font-semibold">Ciudad</span>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface"
          >
            <option value="">Todas</option>
            {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </label>

        {/* Clear Filters Button */}
        {(minProb > 0 || levelFilter !== "All" || buFilter || tenureFilter || genderFilter || orgLevelFilter || locationFilter) && (
          <button
            type="button"
            onClick={() => {
              setMinProb(0);
              setLevelFilter("All");
              setBuFilter("");
              setTenureFilter("");
              setGenderFilter("");
              setOrgLevelFilter("");
              setLocationFilter("");
            }}
            className="mt-3 rounded-full border border-outline-variant px-3 py-1 text-label-xs text-primary hover:bg-surface-container-low"
          >
            Limpiar filtros
          </button>
        )}
      </section>

      {/* Main Filtered Table */}
      <section className="rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-space-lg shadow-xs">
        <TableWidget
          data={filteredEmployees}
          columns={columns}
          pageSize={12}
          searchPlaceholder="Filtrar colaboradores por nombre, puesto o ID..."
        />
      </section>
    </div>
  );
}