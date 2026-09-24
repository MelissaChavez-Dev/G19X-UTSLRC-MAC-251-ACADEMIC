export default function ChoiceQuestion({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-3 p-4 rounded-md border text-left transition-all ${
              active
                ? "border-primary bg-surface-container-low"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                active ? "border-primary bg-primary" : "border-outline"
              }`}
            />
            <span className="text-body-md text-on-surface">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}