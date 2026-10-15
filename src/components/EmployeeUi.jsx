import { useRef } from "react";
import { Link } from "react-router-dom";

/** Clase común para inputs, selects y textareas del área de colaboradores. */
export const fieldClass =
  "w-full rounded-xl border border-outline-variant bg-surface-container-low px-space-md py-2.5 text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

export function Icon({ name, size = 20, className = "", filled = false }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, fontVariationSettings: filled ? "'FILL' 1" : undefined }}
    >
      {name}
    </span>
  );
}

/** Superficie base: contorno suave para separar del fondo en claro y oscuro. */
export function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-lg ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({ title, description, action, as: Heading = "h2" }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-space-sm">
      <div className="min-w-0">
        <Heading className="text-headline-sm text-on-surface">{title}</Heading>
        {description && <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Dato destacado: icono + cifra + etiqueta. */
export function StatTile({ icon, label, value, highlight = false }) {
  return (
    <div
      className={`flex items-center gap-space-sm rounded-2xl p-space-md ${
        highlight
          ? "bg-primary-container text-on-primary-container"
          : "border border-outline-variant/40 bg-surface-container-lowest text-on-surface"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          highlight ? "bg-surface-container-lowest/60" : "bg-surface-container-low text-primary"
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-headline-md font-semibold leading-tight">{value}</p>
        <p className={`truncate text-label-md ${highlight ? "opacity-80" : "text-on-surface-variant"}`}>{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, text, children }) {
  return (
    <div className="flex flex-col items-center gap-space-xs rounded-2xl bg-surface-container-low px-space-md py-space-lg text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant">
        <Icon name={icon} size={26} />
      </span>
      {title && <p className="text-body-md font-semibold text-on-surface">{title}</p>}
      {text && <p className="max-w-prose text-body-sm text-on-surface-variant">{text}</p>}
      {children}
    </div>
  );
}

const NOTICE_TONES = {
  error: { classes: "bg-error-container text-on-error-container", icon: "error" },
  success: { classes: "bg-success-container text-on-success-container", icon: "check_circle" },
  warning: { classes: "bg-warning-container text-on-warning-container", icon: "warning" },
};

export function Notice({ tone = "error", children }) {
  const { classes, icon } = NOTICE_TONES[tone] || NOTICE_TONES.error;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-space-xs rounded-xl px-space-md py-space-sm text-body-sm ${classes}`}
    >
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Enlace en forma de píldora para la cabecera. */
export function NavPill({ to, icon, children }) {
  return (
    <Link
      to={to}
      className="motion-press inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-md py-2 text-label-md font-semibold text-primary hover:bg-surface-container"
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </Link>
  );
}

/**
 * Pestañas primarias de Material Design 3 (indicador inferior).
 * Accesibles: roles ARIA y navegación con flechas, Inicio y Fin.
 */
export function Tabs({ tabs, value, onChange, label }) {
  const refs = useRef({});

  function handleKeyDown(event, index) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-space-xs overflow-x-auto border-b border-outline-variant/60">
      {tabs.map((tab, index) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[tab.id] = node; }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`motion-press relative flex shrink-0 items-center gap-space-xs rounded-t-xl px-space-md py-3 text-label-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
              active ? "text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            <Icon name={tab.icon} size={20} filled={active} />
            <span>{tab.label}</span>
            {tab.badge ? (
              <span className="rounded-full bg-primary px-1.5 text-label-sm text-on-primary">{tab.badge}</span>
            ) : null}
            <span
              aria-hidden="true"
              className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-primary transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, children }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="animate-enter flex flex-col gap-space-lg">
      {children}
    </div>
  );
}

/**
 * Menú lateral de escritorio (estilo navigation drawer de Material Design 3).
 * `items` cambia de sección dentro de la página; `links` navega a otras rutas.
 */
export function SideNav({ items, value, onChange, links = [], label, collapsed = false }) {
  const base =
    "motion-press flex min-h-12 items-center gap-space-sm rounded-full py-2 text-label-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`${base} w-full ${
              collapsed ? "justify-center px-0" : "px-space-md text-left"
            } ${
              active
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            <Icon name={item.icon} size={22} filled={active} />
            {!collapsed && <span className="min-w-0 whitespace-normal break-words leading-tight">{item.label}</span>}
          </button>
        );
      })}
      {links.length > 0 && <hr className="my-space-xs border-outline-variant/60" />}
      {links.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          title={item.label}
          aria-label={item.label}
          className={`${base} ${
            collapsed ? "justify-center px-0" : "px-space-md"
          } text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface`}
        >
          <Icon name={item.icon} size={22} />
          {!collapsed && <span className="min-w-0 whitespace-normal break-words leading-tight">{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}