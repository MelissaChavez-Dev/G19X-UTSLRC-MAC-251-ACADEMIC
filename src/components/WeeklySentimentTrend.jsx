/*
  Paleta monocromática lila/morado en dos modos.
  Igual que "Focos de Fricción": en oscuro los niveles se invierten y la pista
  de las barras queda "hundida" (más oscura que el contenedor).

                    claro      oscuro
  contenedor       #E4D6F6    #3F2F66
  figura (esquina) #e1ccff    #402b70
  pista de barra   #F3EBFC    #2C1F4A
  barra positiva   #7C4DBA    #C9B0F0
  texto            #3F2566    #EBE0FA
  % positivo       #5B35A0    #C9B0F0
  alerta (negativo)#B8243F    #F4A3B5  (mismo tono que el punto de alerta)
*/

export default function WeeklySentimentTrend({ rows }) {
  return (
    <section
      aria-labelledby="sentiment-title"
      className="relative h-full overflow-hidden rounded-[40px] bg-[#E4D6F6] p-space-lg dark:bg-[#3F2F66]"
    >
      {/* Figura decorativa: círculo recortado por la esquina superior derecha */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#e1ccff] dark:bg-[#402b70] sm:-right-16 sm:-top-16 sm:h-48 sm:w-48"
      />

      <div className="relative z-10 pr-14 sm:pr-0">
        <h2
          id="sentiment-title"
          className="mb-1 text-headline-md tracking-tight text-[#3F2566] dark:text-[#EBE0FA]"
        >
          Tendencia de Sentimiento
        </h2>
        <p className="mb-space-md text-body-sm text-[#3F2566]/75 dark:text-[#EBE0FA]/70">
          Progresión neta (positivo - negativo) por área, sobre la muestra reciente
        </p>
      </div>

      <ul className="relative z-10 flex flex-col gap-space-sm">
        {rows.map((row) => {
          const positive = row.shift >= 0;
          const widthPct = Math.min(100, Math.abs(row.shift) * 2);

          return (
            <li key={row.id} className="flex items-center gap-space-sm">
              <span className="w-40 flex-shrink-0 truncate text-body-sm text-[#3F2566] dark:text-[#EBE0FA]">
                {row.name}
              </span>

              <div
                aria-hidden="true"
                className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3EBFC] dark:bg-[#2C1F4A]"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                    positive
                      ? "bg-[#7C4DBA] dark:bg-[#C9B0F0]"
                      : "bg-[#B8243F] dark:bg-[#F4A3B5]"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              <span
                className={`w-12 text-right text-label-sm font-semibold tabular-nums ${
                  positive
                    ? "text-[#5B35A0] dark:text-[#C9B0F0]"
                    : "text-[#B8243F] dark:text-[#F4A3B5]"
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