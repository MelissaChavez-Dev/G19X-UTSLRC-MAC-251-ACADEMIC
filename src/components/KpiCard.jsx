import { useState } from "react";

export default function KpiCard({
  label,
  value,
  suffix,
  delta,
  deltaDirection,
  footerLabel,
  footerValue,
  onExplain,
}) {
  const [explanation, setExplanation] = useState("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const hasDelta = delta !== undefined && delta !== null;

  async function handleExplainClick() {
    if (!onExplain) return;
    setLoadingExplain(true);
    try {
      const text = await onExplain();
      setExplanation(text);
    } catch {
      setExplanation("No se pudo generar la explicación.");
    } finally {
      setLoadingExplain(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-display-lg text-on-surface leading-none">{value}</span>
            {suffix && <span className="text-body-sm text-on-surface-variant">{suffix}</span>}
            {hasDelta && (
              <span className="text-label-md text-on-secondary-container bg-secondary-container/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">
                  {deltaDirection === "down" ? "arrow_downward" : "arrow_upward"}
                </span>
                {delta}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleExplainClick}
          disabled={loadingExplain}
          title="Explicar con IA"
          className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container flex-shrink-0 hover:bg-surface-container-high transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[22px]">
            {loadingExplain ? "hourglass_empty" : "auto_awesome"}
          </span>
        </button>
      </div>

      {explanation && (
        <p className="text-body-sm text-on-surface-variant mt-space-sm bg-surface-container-low rounded-md p-space-sm">
          {explanation}
        </p>
      )}

      {footerLabel && (
        <div className="mt-space-md flex flex-col">
          <span className="text-body-sm text-on-surface-variant">{footerLabel}</span>
          <span className="text-label-sm text-on-surface font-semibold">{footerValue}</span>
        </div>
      )}
    </div>
  );
}