import { useMemo, useState } from "react";

const COLORS = [
  "#326A9C",
  "#378575",
  "#B88732",
  "#8174AD",
  "#B96570",
  "#52879A",
  "#71884E",
];

const PANEL = "rounded-[32px] bg-surface-container-low p-5 sm:p-7";

export default function FrictionSourceChart({
  items = [],
  loading = false,
  error = null,
  compact = false,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeItems = useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((item, index) => ({
        ...item,
        label: String(item.label ?? "Sin categoría"),
        count: Math.max(0, Number(item.count) || 0),
        percentage: Math.max(0, Number(item.percentage) || 0),
        color: COLORS[index % COLORS.length],
      })),
    [items]
  );

  const total = safeItems.reduce((sum, item) => sum + item.count, 0);
  const activeIndex = safeItems.length
    ? Math.min(selectedIndex, safeItems.length - 1)
    : 0;
  const selected = safeItems[activeIndex];

  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const gap = 3;

  const segments = safeItems.map((item, index) => {
    const fraction = total > 0 ? item.count / total : 0;
    const length = Math.max(0, fraction * circumference - gap);
    const offset = safeItems
      .slice(0, index)
      .reduce(
        (sum, previousItem) =>
          sum + (total > 0 ? previousItem.count / total : 0) * circumference,
        0
      );
    return { ...item, index, length, offset };
  });

  const selectPrevious = () => {
    if (safeItems.length < 2) return;
    setSelectedIndex((current) =>
      current <= 0 ? safeItems.length - 1 : current - 1
    );
  };

  const selectNext = () => {
    if (safeItems.length < 2) return;
    setSelectedIndex((current) =>
      current >= safeItems.length - 1 ? 0 : current + 1
    );
  };

  return (
    <section
      aria-labelledby="friction-source-title"
      className={`${PANEL} ${compact ? "" : "sm:p-8"}`}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
              donut_large
            </span>
          </div>
          <div className="min-w-0">
            <h2 id="friction-source-title" className="text-headline-sm text-on-surface">
              Fuentes de fricción
            </h2>
            <p className="mt-1 max-w-xl text-body-sm leading-relaxed text-on-surface-variant">
              Principales dificultades reportadas durante los últimos 30 días.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">
            forum
          </span>
          <span className="text-label-md font-semibold tabular-nums text-on-surface">
            {total} {total === 1 ? "respuesta" : "respuestas"}
          </span>
        </div>
      </header>

      {loading ? (
        <div role="status" className="rounded-2xl bg-surface-container p-5">
          <div className="mb-3 h-4 w-44 animate-pulse rounded bg-surface-container-highest" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container-highest" />
          <p className="mt-4 text-body-sm text-on-surface-variant">Cargando fuentes de fricción…</p>
        </div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-error-container p-5 text-on-error-container">
          <span aria-hidden="true" className="material-symbols-outlined">error</span>
          <div>
            <p className="font-semibold">No se pudieron cargar los datos</p>
            <p className="mt-1 text-body-sm">Revisa la conexión e inténtalo de nuevo.</p>
          </div>
        </div>
      ) : safeItems.length === 0 || total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container p-8 text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl text-on-surface-variant">
            insert_chart
          </span>
          <p className="text-title-md text-on-surface">Todavía no hay resultados</p>
          <p className="max-w-md text-body-sm leading-relaxed text-on-surface-variant">
            Las categorías aparecerán aquí cuando se registren respuestas en el periodo seleccionado.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] lg:gap-8">
            <div className="flex min-w-0 flex-col items-center justify-center">
              <div className="relative w-full max-w-[280px]">
                <svg
                  viewBox="0 0 200 200"
                  className="h-auto w-full overflow-visible"
                  role="group"
                  aria-label="Gráfica de distribución de fuentes de fricción"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="var(--surface-container-high)"
                    strokeWidth="20"
                  />
                  <g transform="rotate(-90 100 100)">
                    {segments.map((segment) => (
                      <circle
                        key={`${segment.label}-${segment.index}`}
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={activeIndex === segment.index ? 27 : 20}
                        strokeLinecap="butt"
                        strokeDasharray={`${segment.length} ${circumference}`}
                        strokeDashoffset={-segment.offset}
                        opacity={activeIndex === segment.index ? 1 : 0.72}
                        className="cursor-pointer transition-all duration-200 focus:outline-none"
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver ${segment.label}: ${segment.count} respuestas, ${segment.percentage}%`}
                        aria-pressed={activeIndex === segment.index}
                        onClick={() => setSelectedIndex(segment.index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedIndex(segment.index);
                          }
                        }}
                      />
                    ))}
                  </g>
                  <text
                    x="100"
                    y="91"
                    textAnchor="middle"
                    fill="var(--on-surface)"
                    fontSize="29"
                    fontWeight="750"
                  >
                    {selected?.percentage ?? 0}%
                  </text>
                  <text
                    x="100"
                    y="113"
                    textAnchor="middle"
                    fill="var(--on-surface-variant)"
                    fontSize="10"
                    fontWeight="600"
                    letterSpacing="0.8"
                  >
                    DEL TOTAL
                  </text>
                </svg>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectPrevious}
                  disabled={safeItems.length < 2}
                  aria-label="Ver categoría anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="text-label-sm tabular-nums text-on-surface-variant">
                  {activeIndex + 1} de {safeItems.length}
                </span>
                <button
                  type="button"
                  onClick={selectNext}
                  disabled={safeItems.length < 2}
                  aria-label="Ver categoría siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-on-surface-variant">
                Elige una categoría para consultar su detalle.
              </p>
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-title-md font-semibold text-on-surface">Detalle por categoría</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Selecciona una fila para destacarla en la gráfica.
                  </p>
                </div>
                <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                  {safeItems.length} categorías
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {segments.map((item) => {
                  const active = activeIndex === item.index;
                  return (
                    <li key={`${item.label}-${item.index}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(item.index)}
                        aria-pressed={active}
                        className={`flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                          active
                            ? "border-outline bg-surface-container-high"
                            : "border-transparent bg-surface-container hover:bg-surface-container-high"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-9 w-1 shrink-0 rounded-full"
                          style={{ background: item.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal break-words text-sm font-semibold leading-snug text-on-surface">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-xs text-on-surface-variant">
                            {item.count} {item.count === 1 ? "respuesta" : "respuestas"}
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
                          >
                            <span
                              className="block h-full rounded-full transition-[width] duration-300"
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                background: item.color,
                              }}
                            />
                          </span>
                        </span>
                        <span className="shrink-0 text-base font-bold tabular-nums text-on-surface">
                          {item.percentage}%
                        </span>
                        <span
                          aria-hidden="true"
                          className={`material-symbols-outlined shrink-0 text-[18px] ${
                            active ? "text-primary" : "text-on-surface-variant"
                          }`}
                        >
                          {active ? "check_circle" : "circle"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {selected && (
            <div
              aria-live="polite"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant/50 bg-surface-container-high p-4 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, ${selected.color} 16%, var(--surface))`,
                    color: selected.color,
                  }}
                >
                  <span className="material-symbols-outlined">insights</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant">Categoría seleccionada</p>
                  <p className="break-words text-base font-semibold text-on-surface">{selected.label}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-on-surface">{selected.count}</span>
                <span className="text-sm text-on-surface-variant">
                  {selected.count === 1 ? "respuesta" : "respuestas"} · {selected.percentage}%
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
