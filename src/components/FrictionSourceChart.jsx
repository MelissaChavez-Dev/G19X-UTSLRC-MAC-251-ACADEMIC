
import { useMemo, useState } from "react";

const COLORS = [
  "#2463A6",
  "#168575",
  "#D99128",
  "#8174BE",
  "#C45D68",
  "#4C91A8",
  "#6D8B48",
];

const PANEL =
  "rounded-[32px] bg-surface-container-low p-5 sm:p-7";

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
        count: Math.max(0, Number(item.count) || 0),
        percentage: Math.max(0, Number(item.percentage) || 0),
        color: COLORS[index % COLORS.length],
      })),
    [items]
  );

  const total = safeItems.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const activeIndex =
    safeItems.length > 0
      ? Math.min(selectedIndex, safeItems.length - 1)
      : 0;

  const selected = safeItems[activeIndex];

  const circumference = 2 * Math.PI * 66;
  const gap = 3;

  const segments = safeItems.map((item, index) => {
    const fraction =
      total > 0 ? item.count / total : 0;

    const length = Math.max(
      0,
      fraction * circumference - gap
    );

    const segment = {
      ...item,
      index,
      length,
      offset:
        safeItems
          .slice(0, index)
          .reduce(
            (sum, previousItem) =>
              sum +
              (total > 0 ? previousItem.count / total : 0) *
                circumference,
            0
          ),
    };

    return segment;
  });

  const selectPrevious = () => {
    setSelectedIndex((current) =>
      current <= 0 ? safeItems.length - 1 : current - 1
    );
  };

  const selectNext = () => {
    setSelectedIndex((current) =>
      current >= safeItems.length - 1 ? 0 : current + 1
    );
  };

  return (
    <section
      aria-labelledby="friction-source-title"
      className={`${PANEL} ${
        compact ? "" : "sm:p-8"
      }`}
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[26px]"
            >
              donut_large
            </span>
          </div>

          <div className="min-w-0">
            <h2
              id="friction-source-title"
              className="text-headline-sm text-on-surface"
            >
              Fuentes de fricción
            </h2>

            <p className="mt-1 text-body-sm text-on-surface-variant">
              Distribución de respuestas · Últimos 30 días
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-2 text-label-md text-on-surface">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[18px]"
          >
            forum
          </span>
          {total} {total === 1 ? "respuesta" : "respuestas"}
        </span>
      </header>

      {loading ? (
        <div
          role="status"
          className="rounded-2xl bg-surface-container p-5 text-body-sm text-on-surface-variant"
        >
          Cargando fuentes de fricción...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl bg-error-container p-5 text-body-sm text-on-error-container"
        >
          No se pudieron cargar estas respuestas. Revisa la conexión y los permisos de tu cuenta.
        </div>
      ) : safeItems.length === 0 || total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container p-8 text-center">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-4xl text-on-surface-variant"
          >
            insert_chart
          </span>

          <p className="text-title-md text-on-surface">
            Aún no hay datos para mostrar
          </p>

          <p className="max-w-md text-body-sm text-on-surface-variant">
            Las fuentes de fricción aparecerán aquí cuando se registren respuestas durante el periodo seleccionado.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
            {/* Gráfica de dona interactiva */}
            <div className="flex min-w-0 flex-col items-center justify-center">
              <div className="relative w-full max-w-[300px]">
                <svg
                  viewBox="0 0 200 200"
                  className="h-auto w-full overflow-visible"
                  role="group"
                  aria-label="Gráfica interactiva de fuentes de fricción"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="66"
                    fill="none"
                    stroke="var(--surface-container-high)"
                    strokeWidth="21"
                  />

                  <g transform="rotate(-90 100 100)">
                    {segments.map((segment) => (
                      <circle
                        key={segment.label}
                        cx="100"
                        cy="100"
                        r="66"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth={
                          activeIndex === segment.index ? 27 : 21
                        }
                        strokeLinecap="round"
                        strokeDasharray={`${segment.length} ${circumference}`}
                        strokeDashoffset={-segment.offset}
                        opacity={
                          activeIndex === segment.index ? 1 : 0.78
                        }
                        className="cursor-pointer transition-all duration-300"
                        role="button"
                        tabIndex={0}
                        aria-label={`Seleccionar ${segment.label}: ${segment.count} respuestas, ${segment.percentage}%`}
                        aria-pressed={activeIndex === segment.index}
                        onClick={() =>
                          setSelectedIndex(segment.index)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            setSelectedIndex(segment.index);
                          }
                        }}
                      />
                    ))}
                  </g>

                  <text
                    x="100"
                    y="94"
                    textAnchor="middle"
                    fill="var(--on-surface)"
                    fontSize="29"
                    fontWeight="700"
                  >
                    {selected?.percentage ?? 0}%
                  </text>

                  <text
                    x="100"
                    y="115"
                    textAnchor="middle"
                    fill="var(--on-surface-variant)"
                    fontSize="10"
                  >
                    {selected?.label
                      ? selected.label.length > 19
                        ? `${selected.label.slice(0, 17)}…`
                        : selected.label
                      : "Sin datos"}
                  </text>
                </svg>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectPrevious}
                  disabled={safeItems.length < 2}
                  aria-label="Ver fuente anterior"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>

                <span className="text-label-sm text-on-surface-variant">
                  {activeIndex + 1} de {safeItems.length} fuentes
                </span>

                <button
                  type="button"
                  onClick={selectNext}
                  disabled={safeItems.length < 2}
                  aria-label="Ver fuente siguiente"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </button>
              </div>

              <p className="mt-3 text-center text-label-sm text-on-surface-variant">
                Selecciona un segmento para explorar cada fuente.
              </p>
            </div>

            {/* Leyenda y selección de categorías */}
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-title-md text-on-surface">
                  Desglose por categoría
                </h3>

                <span className="text-label-sm text-on-surface-variant">
                  {safeItems.length} categorías
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {segments.map((item) => {
                  const active = activeIndex === item.index;

                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIndex(item.index)
                        }
                        aria-pressed={active}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                          active
                            ? "border-outline bg-surface-container-high"
                            : "border-transparent bg-surface-container hover:bg-surface-container-high"
                        }`}
                      >
                        <span
                          className="h-10 w-1.5 shrink-0 rounded-full"
                          style={{ background: item.color }}
                          aria-hidden="true"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label-md font-semibold text-on-surface">
                            {item.label}
                          </span>

                          <span className="mt-1 block text-label-sm text-on-surface-variant">
                            {item.count}{" "}
                            {item.count === 1
                              ? "respuesta"
                              : "respuestas"}
                          </span>

                          <span
                            aria-hidden="true"
                            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
                          >
                            <span
                              className="block h-full rounded-full transition-[width] duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  item.percentage
                                )}%`,
                                background: item.color,
                              }}
                            />
                          </span>
                        </span>

                        <span className="shrink-0 text-title-md tabular-nums text-on-surface">
                          {item.percentage}%
                        </span>

                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-[20px] text-on-surface-variant"
                        >
                          {active
                            ? "radio_button_checked"
                            : "radio_button_unchecked"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Detalle de la categoría seleccionada */}
          {selected && (
            <div
              aria-live="polite"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-container-high p-4 sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, ${selected.color} 18%, var(--surface))`,
                    color: selected.color,
                  }}
                >
                  <span className="material-symbols-outlined">
                    insights
                  </span>
                </span>

                <div className="min-w-0">
                  <p className="text-label-sm text-on-surface-variant">
                    Fuente seleccionada
                  </p>

                  <p className="break-words text-title-md text-on-surface">
                    {selected.label}
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-headline-md text-on-surface">
                  {selected.count}
                </span>

                <span className="text-body-sm text-on-surface-variant">
                  respuestas · {selected.percentage}%
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
