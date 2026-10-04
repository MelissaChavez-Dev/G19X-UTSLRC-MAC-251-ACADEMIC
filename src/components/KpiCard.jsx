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
      role={interactive ? "button" : "region"}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => interactive && e.key === "Enter" && onExpand()}
      whileHover={interactive ? { y: -6, scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`group relative flex flex-col justify-between overflow-hidden p-6 transition-all duration-300 ${
        interactive
          ? "cursor-pointer select-none bg-surface-container-low hover:bg-surface-container shadow-sm hover:shadow-xl hover:shadow-primary/10 rounded-[32px]"
          : "cursor-default bg-surface-container-low rounded-[32px]"
      }`}
    >
      {/* Mancha decorativa de fondo (se revela suavemente al hacer hover) */}
      {interactive && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary opacity-0 transition-all duration-500 ease-out group-hover:scale-150 group-hover:opacity-10"
        />
      )}

      {/* Encabezado: Etiqueta nítida e Ícono con sombra */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="max-w-[75%] text-[12px] font-bold uppercase tracking-widest text-on-surface-variant leading-snug">
          {label}
        </span>
        
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md transition-all duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 group-hover:shadow-primary/30">
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
      </div>

      {/* Métrica Principal */}
      <div className="relative z-10 my-5 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-5xl font-black tracking-tighter text-on-surface">
            {value}
          </span>
          {suffix && (
            <span className="text-lg font-bold text-on-surface-variant">
              {suffix}
            </span>
          )}
        </div>

        {/* Badge Indicador / Delta con colores más semánticos */}
        {hasDelta && (
          <div className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                isPositive
                  ? "bg-success/15 text-success-700 dark:text-success-400"
                  : "bg-error/15 text-error-700 dark:text-error-400"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPositive ? "trending_up" : "trending_down"}
              </span>
              {delta}
            </span>
          </div>
        )}
      </div>

      {/* Pie de tarjeta & Botón Píldora */}
      <div className="relative z-10 mt-auto flex items-end justify-between gap-2 border-t border-surface-container-highest/10 pt-4">
        {footerLabel ? (
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {footerLabel}
            </span>
            <span className="mt-0.5 text-sm font-black text-on-surface">
              {footerValue}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Botón Píldora: Inicia sutil y se llena de color al hacer hover */}
        {showAction && (
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-on-primary">
            <span className="material-symbols-outlined text-[16px] transition-transform duration-500 group-hover:rotate-180">
              auto_awesome
            </span>
            <span>Ver análisis</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}