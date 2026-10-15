const CONTAINER =
  "rounded-[40px] bg-tertiary-container p-6 sm:p-8";
const TITLE =
  "text-lg font-bold tracking-tight text-on-tertiary-container";

export default function FrictionSourceChart({ items, loading, error }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-labelledby="friction-source-title" className={CONTAINER}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest">
            <span aria-hidden="true" className="material-symbols-outlined text-tertiary">
              tune
            </span>
          </div>
          <div>
            <h2 id="friction-source-title" className={TITLE}>
              Fuentes de fricción
            </h2>
            <p className="text-body-sm text-on-tertiary-container/80">Respuestas de los últimos 30 días</p>
          </div>
        </div>
        <span className="rounded-full bg-surface-container-lowest px-3 py-1.5 text-label-sm text-on-surface">
          {total} {total === 1 ? "respuesta" : "respuestas"}
        </span>
      </header>

      {loading ? (
        <p role="status" className="text-body-sm text-on-tertiary-container/80">
          Cargando respuestas...
        </p>
      ) : error ? (
        <p role="alert" className="text-body-sm text-on-tertiary-container">
          No se pudieron cargar estas respuestas. Revisa la conexión y los permisos de tu cuenta.
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-on-tertiary-container/80">
          No hay respuestas de fuente de fricción en este periodo.
        </p>
      ) : (
        <ul aria-label="Distribución de respuestas por fuente de fricción" className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1.5 flex items-start justify-between gap-3 text-body-sm">
                <span className="font-medium text-on-tertiary-container">{item.label}</span>
                <span className="shrink-0 tabular-nums text-on-tertiary-container/80">
                  {item.count} · {item.percentage}%
                </span>
              </div>
              <div
                role="img"
                aria-label={`${item.label}: ${item.count} respuestas, ${item.percentage}%`}
                className="h-2 overflow-hidden rounded-full bg-surface-container-lowest/70"
              >
                <div
                  className="h-full rounded-full bg-tertiary transition-[width]"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
