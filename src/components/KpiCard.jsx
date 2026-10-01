import { motion } from "framer-motion";

export default function KpiCard({
  id,
  icon,
  label,
  value,
  suffix,
  delta,
  deltaDirection,
  footerLabel,
  footerValue,
  onExpand,
  showAction = Boolean(onExpand),
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = deltaDirection === "up";
  const interactive = Boolean(onExpand);

  return (
    <motion.div
      layoutId={id}
      onClick={interactive ? onExpand : undefined}
      whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`group relative bg-primary-container text-on-primary-container p-6 rounded-[28px] flex flex-col justify-between border-none shadow-sm transition-all duration-300 overflow-hidden ${interactive ? "cursor-pointer select-none hover:shadow-md" : "cursor-default"}`}
    >
      {/* Encabezado: Etiqueta en negrita nítida e Ícono Sólido */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-wider text-on-primary-container max-w-[80%] leading-snug">
          {label}
        </span>
        
        {/* Ícono plano de alto impacto */}
        <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      {/* Métrica Principal: Número 5XL ultra legible */}
      <div className="my-4 flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-5xl font-black text-on-primary-container tracking-tight leading-none">
            {value}
          </span>
          {suffix && (
            <span className="text-base font-bold text-on-primary-container">
              {suffix}
            </span>
          )}
        </div>

        {/* Badge Indicador / Delta */}
        {hasDelta && (
          <div className="mt-1 flex items-center">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                isPositive
                  ? "bg-success-container text-on-success-container"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPositive ? "arrow_upward" : "arrow_downward"}
              </span>
              {delta}
            </span>
          </div>
        )}
      </div>

      {/* Pie de tarjeta & Botón Píldora 'Ver análisis' */}
      <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-none">
        {footerLabel ? (
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold text-on-primary-container leading-tight">
              {footerLabel}
            </span>
            <span className="text-xs font-black text-on-primary-container leading-tight mt-0.5">
              {footerValue}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Botón Píldora de Acción */}
        {showAction && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-on-primary bg-primary group-hover:bg-on-primary group-hover:text-primary px-3.5 py-1.5 rounded-full shadow-sm transition-colors duration-300 shrink-0">
            <span className="material-symbols-outlined text-[14px] transition-transform group-hover:rotate-12">
              auto_awesome
            </span>
            <span>Ver análisis</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}