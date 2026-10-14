function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? `${parts[0][0]}${parts.length > 1 ? parts.at(-1)[0] : ""}`.toUpperCase()
    : "?";
}

export default function Avatar({ name, photoURL, size = 36, className = "" }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container font-semibold text-on-primary-container ${className}`}
      style={{ width: size, height: size }}
      title={name || "Colaborador"}
      aria-label={name || "Colaborador"}
    >
      <span aria-hidden="true">{initials(name)}</span>
      {photoURL && (
        <img
          src={photoURL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
    </span>
  );
}
