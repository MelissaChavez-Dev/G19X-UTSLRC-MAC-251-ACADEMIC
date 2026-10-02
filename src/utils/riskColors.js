export function getRiskColorClasses(value, invert = false) {
  if (value === null || value === undefined) return "bg-surface-container text-on-surface-variant";
  const v = invert ? 6 - value : value;
  if (v >= 4) return "bg-error text-on-error font-semibold";
  if (v >= 3) return "bg-warning-container text-on-warning-container font-semibold";
  if (v >= 2) return "bg-tertiary-container text-on-tertiary-container font-semibold";
  return "bg-success-container text-on-success-container font-semibold";
}