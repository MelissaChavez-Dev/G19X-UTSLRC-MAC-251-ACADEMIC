import { useState } from "react";
import { motion } from "framer-motion";

export default function SummaryBoardWidget({
  statements = [],
  note = "La atrición considera el comportamiento acumulado del ejercicio fiscal.",
  onAskGemini,
  loadingGemini = false,
  geminiExplanation = "",
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col justify-between gap-space-sm rounded-2xl border border-secondary/30 bg-surface-container-lowest p-space-md shadow-xs">
      <header className="flex items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary" aria-hidden="true">
            auto_awesome
          </span>
          <h3 className="text-label-lg font-semibold text-on-surface">Summary Board · Diagnóstico Sintético</h3>
        </div>

        {onAskGemini && (
          <button
            type="button"
            disabled={loadingGemini}
            onClick={() => {
              setExpanded(true);
              onAskGemini();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary-container/40 px-3 py-1 text-label-sm font-medium text-on-surface hover:bg-secondary-container transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">
              psychology
            </span>
            {loadingGemini ? "Analizando con IA..." : "Profundizar con Gemini ✨"}
          </button>
        )}
      </header>

      {/* Bulleted Narrative Statements */}
      <ul className="space-y-2 py-1 text-body-sm text-on-surface leading-relaxed">
        {statements.map((stmt, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" aria-hidden="true" />
            <span>{stmt}</span>
          </li>
        ))}
      </ul>

      {/* Gemini AI Detailed Card (if opened/expanded) */}
      {expanded && geminiExplanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-secondary/40 bg-secondary-container/20 p-space-md text-body-sm text-on-surface"
        >
          <div className="flex items-center justify-between font-semibold text-secondary mb-1">
            <span>Perspectiva Estratégica de Gemini</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-on-surface-variant hover:text-on-surface text-[18px]"
            >
              ×
            </button>
          </div>
          <p className="whitespace-pre-line text-body-sm text-on-surface-variant leading-relaxed">
            {geminiExplanation}
          </p>
        </motion.div>
      )}

      {/* Mandatory Regulatory / Methodological Note */}
      {note && (
        <footer className="border-t border-outline-variant/30 pt-1.5 text-body-xs text-on-surface-variant/80">
          Nota: {note}
        </footer>
      )}
    </div>
  );
}
