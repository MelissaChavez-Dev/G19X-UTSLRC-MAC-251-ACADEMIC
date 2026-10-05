import { motion, useReducedMotion } from "framer-motion";

const CONTAINER =
  "relative h-full overflow-hidden rounded-[40px] bg-tertiary-container p-6 sm:p-8";
const ICON_CIRCLE =
  "flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest";
const ICON = "material-symbols-outlined text-tertiary";
const TITLE =
  "text-lg font-bold tracking-tight text-on-tertiary-container";

// Figura decorativa: círculo recortado por la esquina inferior derecha
function CornerShape() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-14 -right-14 h-40 w-40 rounded-full bg-tertiary/15 sm:-bottom-16 sm:-right-16 sm:h-48 sm:w-48"
    />
  );
}

export default function FrictionHotspots({ items }) {
  const reduceMotion = useReducedMotion();

  // Estado vacío: sin fricciones
  if (!items || items.length === 0) {
    return (
      <section aria-labelledby="friction-title" className={CONTAINER}>
        <CornerShape />

        <div className="relative z-10 mb-3 flex items-center gap-3">
          <div className={ICON_CIRCLE}>
            <span className={ICON}>sentiment_satisfied</span>
          </div>
          <h2 id="friction-title" className={TITLE}>
            Focos de Fricción
          </h2>
        </div>
        <p className="relative z-10 pl-[52px] text-sm font-medium leading-relaxed text-on-tertiary-container/80">
          No se detectaron comentarios negativos recientes. Todo fluye correctamente.
        </p>
      </section>
    );
  }

  // Estado activo: con fricciones
  return (
    <section aria-labelledby="friction-title" className={CONTAINER}>
      <CornerShape />

      <header className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={ICON_CIRCLE}>
            <span className={ICON}>warning</span>
          </div>
          <h2 id="friction-title" className={TITLE}>
            Focos de Fricción
          </h2>
        </div>

        <span className="rounded-full bg-surface-container-lowest px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider tabular-nums text-on-surface">
          {items.length} {items.length === 1 ? "activo" : "activos"}
        </span>
      </header>

      <ul className="relative z-10 flex flex-col gap-3">
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.3, ease: "easeOut" }}
            className="flex items-start gap-4 rounded-[28px] bg-surface-container-lowest p-4 transition-colors duration-300 hover:bg-surface-container-low sm:p-5"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-container">
              <span className="h-2.5 w-2.5 rounded-full bg-error" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-sm font-bold text-on-tertiary-container">
                {item.departmentName}
              </p>
              <p className="text-sm font-medium leading-relaxed text-on-tertiary-container/80">
                {item.excerpt}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}