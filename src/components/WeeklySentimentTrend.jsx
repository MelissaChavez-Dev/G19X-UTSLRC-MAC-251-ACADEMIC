export default function WeeklySentimentTrend({ rows }) {
  return (
    <section
      aria-labelledby="sentiment-title"
      className="relative h-full overflow-hidden rounded-[40px] bg-primary-container p-space-lg"
    >
      {/* Figura decorativa: círculo recortado por la esquina superior derecha */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary-fixed sm:-right-16 sm:-top-16 sm:h-48 sm:w-48"
      />

      <div className="relative z-10 pr-14 sm:pr-0">
        <h2
          id="sentiment-title"
          className="mb-1 text-headline-md tracking-tight text-on-primary-container"
        >
          Tendencia de Sentimiento
        </h2>
        <p className="mb-space-md text-body-sm text-on-primary-container/75">
          Progresión neta (positivo - negativo) por área, sobre la muestra reciente
        </p>
      </div>

      <ul className="relative z-10 flex flex-col gap-space-sm">
        {rows.map((row) => {
          const positive = row.shift >= 0;
          const widthPct = Math.min(100, Math.abs(row.shift) * 2);

          return (
            <li key={row.id} className="flex items-center gap-space-sm">
              <span className="w-40 flex-shrink-0 truncate text-body-sm text-on-primary-container">
                {row.name}
              </span>

              <div
                aria-hidden="true"
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-low"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                    positive
                      ? "bg-primary"
                      : "bg-error"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              <span
                className={`w-12 text-right text-label-sm font-semibold tabular-nums ${
                  positive
                    ? "text-primary"
                    : "text-error"
                }`}
              >
                {positive ? "+" : ""}
                {row.shift}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}