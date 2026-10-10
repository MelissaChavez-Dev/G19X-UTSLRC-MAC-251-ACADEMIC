const MEASURES = [
  { id: "headCount", label: "Head Count (Dotación Activa)" },
  { id: "hires", label: "Nuevas Contrataciones (Joiners)" },
  { id: "terminations", label: "Bajas (Terminations)" },
  { id: "exitRate", label: "Tasa de Salida (Exit Rate %)" },
  { id: "voluntaryRate", label: "Tasa Bajas Voluntarias (%)" },
  { id: "involuntaryRate", label: "Tasa Bajas Involuntarias (%)" },
  { id: "regularEmployeesRate", label: "Tasa Bajas Regulares (%)" },
  { id: "femaleLeadersPct", label: "% Mujeres Líderes (High-Level)" },
  { id: "avgTenure", label: "Antigüedad Promedio (Años)" },
  { id: "avgAge", label: "Edad Promedio (Años)" },
  { id: "absenteeismRate", label: "Tasa de Ausentismo (%)" },
  { id: "avgTotalLeaveDays", label: "Días Promedio de Licencias Totales" },
  { id: "avgSickDays", label: "Días Promedio de Licencia Médica" },
  { id: "avgAnnualDays", label: "Días Promedio de Vacaciones (Anual)" },
  { id: "regularJoinerRate", label: "% de Joiners con contrato regular" },
  { id: "femaleLeadersJoinersPct", label: "% de Joiners líderes mujeres" },
  { id: "averageJoinersPerDay", label: "Joiners promedio por día hábil" },
  { id: "absenceDistribution", label: "Distribución de días de ausencia" },
  { id: "absenceCrossMatrix", label: "Cruce de ausencias (2D)" },
  { id: "distribution", label: "Distribución por Dimensión (1D)" },
  { id: "crossMatrix", label: "Matriz Bidimensional / Cruce (2D)" },
  { id: "sankeyData", label: "Flujo entre dimensiones (Sankey)" },
  { id: "monthlyTrend", label: "Tendencia Mensual (12 Meses con LY)" },
  { id: "monthlyFemaleLeadersTrend", label: "Tendencia mensual de mujeres líderes" },
  { id: "rolling12Joiners", label: "Ingresos en 12 Meses Móviles" },
  { id: "joinersVsLeavers", label: "Balance Altas vs Bajas Mensual" },
  { id: "waterfall", label: "Cascada de Movimiento MoM" },
  { id: "departmentSummary", label: "Resumen por Departamento" },
  { id: "regionSummary", label: "Resumen por Región" },
  { id: "summaryBoardNarrative", label: "Narrativa para Summary Board" },
];

const DIMENSIONS = [
  { id: "department", label: "Departamento" },
  { id: "businessUnit", label: "Unidad de Negocio (BU)" },
  { id: "orgLevel", label: "Nivel Organizacional" },
  { id: "hireType", label: "Tipo de Contratación" },
  { id: "gender", label: "Género" },
  { id: "ageBand", label: "Rango de Edad" },
  { id: "tenureBand", label: "Rango de Antigüedad" },
  { id: "generation", label: "Generación" },
  { id: "shift", label: "Turno de Trabajo" },
  { id: "performanceRating", label: "Calificación de Desempeño" },
  { id: "terminationCategory", label: "Categoría de Baja" },
  { id: "region", label: "Región Geográfica" },
  { id: "location", label: "Ciudad / Ubicación" },
  { id: "education", label: "Nivel Educativo" },
  { id: "maritalStatus", label: "Estado Civil" },
];

const SLICER_TYPES = [
  { id: "yearButtons", label: "Botones de Años" },
  { id: "monthButtons", label: "Botones de Meses" },
  { id: "dropdown", label: "Menú Desplegable" },
  { id: "buttonList", label: "Lista de Botones" },
  { id: "slider", label: "Control Deslizante (Slider)" },
];

export default function FieldsPanel({
  selectedWidget,
  onUpdateWidget,
}) {
  if (!selectedWidget) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-space-md text-center text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] mb-2 text-primary" aria-hidden="true">
          dataset
        </span>
        Selecciona un widget para configurar sus campos, medidas y filtros.
      </div>
    );
  }

  const isSlicer = selectedWidget.type === "slicer";

  return (
    <div className="flex flex-col gap-space-md p-space-sm text-body-sm">
      {/* If it's a Slicer widget */}
      {isSlicer ? (
        <div className="flex flex-col gap-space-sm">
          <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wider">Tipo de Slicer</span>
            <select
              value={selectedWidget.options?.slicerType || "dropdown"}
              onChange={(e) =>
                onUpdateWidget({
                  ...selectedWidget,
                  options: { ...(selectedWidget.options || {}), slicerType: e.target.value },
                })
              }
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              {SLICER_TYPES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wider">Campo de Filtro</span>
            <select
              value={selectedWidget.options?.filterKey || "businessUnit"}
              onChange={(e) =>
                onUpdateWidget({
                  ...selectedWidget,
                  options: { ...(selectedWidget.options || {}), filterKey: e.target.value },
                })
              }
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="year">Año</option>
              <option value="month">Mes</option>
              <option value="businessUnit">Unidad de Negocio</option>
              <option value="department">Departamento</option>
              <option value="region">Región</option>
              <option value="location">Ubicación</option>
              <option value="performanceRating">Desempeño</option>
            </select>
          </label>
        </div>
      ) : (
        <>
          {/* Measure Selector */}
          <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wider">Medida Analítica</span>
            <select
              value={selectedWidget.measure || "headCount"}
              onChange={(e) => onUpdateWidget({ ...selectedWidget, measure: e.target.value })}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              {MEASURES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* Primary Dimension */}
          <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wider">Dimensión Principal (Eje / Desglose)</span>
            <select
              value={selectedWidget.dimension || "department"}
              onChange={(e) => onUpdateWidget({ ...selectedWidget, dimension: e.target.value })}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              {DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wider">Población / Cohorte</span>
            <select
              value={selectedWidget.options?.population || "active"}
              onChange={(event) => onUpdateWidget({
                ...selectedWidget,
                options: { ...(selectedWidget.options || {}), population: event.target.value },
              })}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="active">Plantilla activa al cierre</option>
              <option value="hires">Altas del periodo</option>
              <option value="terminations">Bajas del periodo</option>
            </select>
          </label>

          {/* 2D Dimensions for Matrix / Stacked Bar */}
          {(selectedWidget.type === "stackedBar" ||
            selectedWidget.type === "matrix" ||
            selectedWidget.type === "butterfly" ||
            selectedWidget.type === "sankey" ||
            selectedWidget.measure === "crossMatrix" ||
            selectedWidget.measure === "absenceCrossMatrix" ||
            selectedWidget.measure === "sankeyData") && (
            <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-sm border border-outline-variant/40">
              <span className="text-label-xs font-semibold text-secondary uppercase">Cruce 2D (Filas × Columnas)</span>
              
              <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
                <span>Dimensión A (Filas)</span>
                <select
                  value={selectedWidget.options?.dimensionA || "orgLevel"}
                  onChange={(e) =>
                    onUpdateWidget({
                      ...selectedWidget,
                      options: { ...(selectedWidget.options || {}), dimensionA: e.target.value },
                    })
                  }
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface"
                >
                  {DIMENSIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
                <span>Dimensión B (Columnas)</span>
                <select
                  value={selectedWidget.options?.dimensionB || "hireType"}
                  onChange={(e) =>
                    onUpdateWidget({
                      ...selectedWidget,
                      options: { ...(selectedWidget.options || {}), dimensionB: e.target.value },
                    })
                  }
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-sm text-on-surface"
                >
                  {DIMENSIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* KPI Comparison Measure */}
          {selectedWidget.type === "kpi" && (
            <label className="flex flex-col gap-1 text-label-xs text-on-surface-variant">
              <span className="font-semibold uppercase tracking-wider">Métrica de Comparación YoY</span>
              <select
                value={selectedWidget.options?.comparisonMeasure || "yoyHeadcount"}
                onChange={(e) =>
                  onUpdateWidget({
                    ...selectedWidget,
                    options: { ...(selectedWidget.options || {}), comparisonMeasure: e.target.value },
                  })
                }
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="yoyHeadcount">Variación Headcount YoY %</option>
                <option value="yoyHires">Variación Hires YoY %</option>
                <option value="yoyTerminations">Variación Bajas YoY %</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
  );
}
