import { useEffect, useRef, useState } from "react";

/**
 * Marco para las pantallas que NO pasan por HrPageViewer (Perfil del empleado,
 * Predicción de rotación). Usa la misma cabecera y la misma barra inferior
 * "‹ n de N ›" que HrPageViewer, para que todas las pantallas se sientan iguales.
 */
export default function HrReportFrame({
  title,
  pages,
  current,
  onChange,
  onHome,
  actions = null,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const last = pages.length - 1;
  const cleanTitle = String(title || "").replace(/^\d+\.\s*/, "");

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="flex w-full flex-col gap-space-sm rounded-2xl bg-surface-container-low/50 p-2">
      <header className="flex flex-wrap items-center justify-between gap-space-sm rounded-xl border border-outline-variant/40 border-b-2 border-b-primary bg-surface-container-lowest px-space-md py-1.5">
        <div className="flex min-w-0 items-end gap-3">
          <span className="hidden text-2xl font-black tracking-tight text-primary sm:block" aria-hidden="true">HR</span>
          <h1 className="truncate text-headline-sm font-medium tracking-tight text-on-surface">{cleanTitle}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onHome || (() => onChange(0))}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-space-md py-1.5 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            Volver a los módulos
          </button>
        </div>
      </header>

      {children}

      {/* Barra inferior: ‹ n de N › (igual que en HrPageViewer) */}
      <footer className="relative flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-space-sm py-1 shadow-xs">
        <button
          type="button"
          disabled={current <= 0}
          onClick={() => onChange(current - 1)}
          className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
          aria-label="Página anterior"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Seleccionar página ${current + 1} de ${pages.length}`}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            {current + 1} de {pages.length}
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {menuOpen ? "expand_more" : "expand_less"}
            </span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="Seleccionar módulo"
              className="absolute bottom-full left-1/2 z-[120] mb-2 max-h-[65vh] w-72 -translate-x-1/2 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-xl"
            >
              <div className="flex flex-col gap-0.5">
                {pages.map((page, index) => (
                  <button
                    key={page.id || index}
                    type="button"
                    role="menuitem"
                    aria-current={current === index ? "page" : undefined}
                    onClick={() => {
                      onChange(index);
                      setMenuOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
                      current === index
                        ? "bg-primary font-semibold text-on-primary"
                        : "text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {page.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={current >= last}
          onClick={() => onChange(current + 1)}
          className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
          aria-label="Página siguiente"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </footer>
    </div>
  );
}