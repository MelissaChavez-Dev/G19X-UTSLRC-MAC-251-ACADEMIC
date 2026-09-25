export default function WeeklySentimentTrend({ rows }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <h2 className="text-headline-md text-on-surface tracking-tight mb-1">
        Tendencia de Sentimiento
      </h2>
      <p className="text-body-sm text-on-surface-variant mb-space-md">
        Progresión neta (positivo - negativo) por área, sobre la muestra reciente
      </p>
      <div className="flex flex-col gap-space-sm">
        {rows.map((row) => {
          const positive = row.shift >= 0;
          const widthPct = Math.min(100, Math.abs(row.shift) * 2);
          return (
            <div key={row.id} className="flex items-center gap-space-sm">
              <span className="w-40 text-body-sm text-on-surface flex-shrink-0">{row.name}</span>
              <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${positive ? "bg-secondary" : "bg-error"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={`w-12 text-right text-label-sm font-semibold ${positive ? "text-secondary" : "text-error"}`}>
                {positive ? "+" : ""}{row.shift}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}