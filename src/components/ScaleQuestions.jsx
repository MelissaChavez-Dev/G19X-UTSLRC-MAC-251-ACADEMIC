export default function ScaleQuestion({ min, max, value, onChange, lowLabel, highLabel }) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="mb-4">
      <div
        role="radiogroup"
        aria-label={`Calificación de ${min} a ${max}`}
        className="grid grid-cols-5 sm:grid-cols-10 gap-2 w-full"
      >
        {values.map((v) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              data-val={v}
              onClick={() => onChange(v)}
              className={`flex flex-col items-center justify-center h-14 rounded-md text-center select-none transition-all ${
                active
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
            >
              <span className="text-headline-sm">{v}</span>
              <span className={`text-[10px] ${active ? "text-on-primary-container" : "text-on-surface-variant"}`}>
                {v}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-3 text-on-surface-variant text-label-sm px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
          {min} · {lowLabel}
        </span>
        <span className="flex items-center gap-1.5">
          {highLabel} · {max}
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
        </span>
      </div>
    </div>
  );
}