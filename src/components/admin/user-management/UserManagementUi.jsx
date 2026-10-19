export function Icon({ name, size = 18 }) {
  return (
    <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export function Field({ id, label, children }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label className="text-label-md text-on-surface" htmlFor={id}>
        {label}
      </label>

      {children}
    </div>
  );
}

export function SectionHeader({ title, description, aside }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-space-sm">
      <div>
        <h2 className="text-headline-sm text-on-surface">{title}</h2>

        {description && <p className="text-body-sm text-on-surface-variant mt-1 max-w-prose">{description}</p>}
      </div>

      {aside}
    </div>
  );
}

export function IconButton({ icon, label, onClick, disabled, tone = "neutral", compact = false }) {
  const tones = {
    neutral: "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",

    primary: "text-primary hover:bg-primary-container",

    danger: "text-error hover:bg-error-container",
  };

  return (
    <button
      type="button"

      onClick={onClick}

      disabled={disabled}

      title={label}

      aria-label={label}

      className={`motion-press inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-35 disabled:pointer-events-none ${compact ? "h-8 w-8" : "h-9 w-9"} ${tones[tone]}`}
    >
      <Icon name={icon} size={compact ? 17 : 19} />
    </button>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="flex flex-col rounded-xl bg-surface-container-lowest px-space-md py-space-sm">
      <span className="text-headline-md text-on-surface leading-tight">{value}</span>

      <span className="text-body-sm text-on-surface-variant">{label}</span>
    </div>
  );
}
