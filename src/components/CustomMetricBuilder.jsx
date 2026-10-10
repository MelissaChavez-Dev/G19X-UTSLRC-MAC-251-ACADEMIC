import { useState } from "react";
import { motion } from "framer-motion";
import { CUSTOM_AGGREGATIONS } from "../utils/canvasMetrics";

const INPUT_CLASS =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const AGGREGATION_LABELS = {
  AVG: "Promedio",
  SUM: "Suma",
  COUNT: "Conteo",
  PERCENTAGE: "Porcentaje",
};

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CustomMetricBuilder({ metrics, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [aggregation, setAggregation] = useState("AVG");
  const [metricId, setMetricId] = useState(metrics[0]?.id || "");
  const [numeratorMetricId, setNumeratorMetricId] = useState(metrics[0]?.id || "");
  const [denominatorMetricId, setDenominatorMetricId] = useState(metrics[1]?.id || metrics[0]?.id || "");
  const [groupBy, setGroupBy] = useState("none");
  const [unit, setUnit] = useState(metrics[0]?.unit || "");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError("Escribe un nombre de entre 2 y 80 caracteres.");
      return;
    }
    if (aggregation === "PERCENTAGE" && numeratorMetricId === denominatorMetricId) {
      setError("El numerador y el denominador deben ser métricas distintas.");
      return;
    }
    if (!metrics.length || (aggregation !== "PERCENTAGE" && !metricId)) {
      setError("No hay métricas disponibles para esta fuente.");
      return;
    }

    const definition = {
      id: `custom_${createId()}`,
      name: cleanName,
      unit: aggregation === "PERCENTAGE" ? "%" : unit.trim().slice(0, 24),
      aggregation,
      metricId: aggregation === "PERCENTAGE" ? "" : metricId,
      numeratorMetricId: aggregation === "PERCENTAGE" ? numeratorMetricId : "",
      denominatorMetricId: aggregation === "PERCENTAGE" ? denominatorMetricId : "",
      groupBy,
    };
    onCreate(definition);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-metric-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-xl rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-space-lg shadow-xl"
      >
        <header className="mb-space-md flex items-start justify-between gap-space-md">
          <div>
            <span className="text-label-sm uppercase tracking-wider text-secondary">Métrica a medida</span>
            <h2 id="custom-metric-title" className="mt-1 text-headline-md text-on-surface">Generador de KPI</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">Elige una operación permitida y el nivel de agrupación. No se ejecutan fórmulas escritas.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar generador" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
            Nombre del indicador
            <input className={INPUT_CLASS} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ej. Promedio ponderado de seguridad" autoFocus />
          </label>
          <div className="grid gap-space-md sm:grid-cols-2">
            <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
              Operación
              <select className={INPUT_CLASS} value={aggregation} onChange={(event) => setAggregation(event.target.value)}>
                {CUSTOM_AGGREGATIONS.map((operation) => <option key={operation} value={operation}>{AGGREGATION_LABELS[operation]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
              Agrupar por
              <select className={INPUT_CLASS} value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                <option value="none">Total del periodo</option>
                <option value="date">Fecha</option>
                <option value="department">Departamento</option>
              </select>
            </label>
          </div>

          {aggregation === "PERCENTAGE" ? (
            <div className="grid gap-space-md sm:grid-cols-2">
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                Numerador
                <select className={INPUT_CLASS} value={numeratorMetricId} onChange={(event) => setNumeratorMetricId(event.target.value)}>
                  {metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                Denominador
                <select className={INPUT_CLASS} value={denominatorMetricId} onChange={(event) => setDenominatorMetricId(event.target.value)}>
                  {metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-space-md sm:grid-cols-2">
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                Campo del catálogo
                <select
                  className={INPUT_CLASS}
                  value={metricId}
                  onChange={(event) => {
                    const selected = metrics.find((metric) => metric.id === event.target.value);
                    setMetricId(event.target.value);
                    setUnit(selected?.unit || "");
                  }}
                >
                  {metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
                Unidad
                <input className={INPUT_CLASS} value={unit} maxLength={24} onChange={(event) => setUnit(event.target.value)} placeholder="Ej. %, puntos" />
              </label>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">{error}</p>}
          <div className="flex justify-end gap-space-sm border-t border-outline-variant/50 pt-space-md">
            <button type="button" onClick={onClose} className="rounded-full px-space-md py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container">Cancelar</button>
            <button type="submit" className="rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary">Crear KPI en el lienzo</button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}
