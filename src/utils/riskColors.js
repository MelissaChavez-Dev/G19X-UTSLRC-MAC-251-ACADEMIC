export function getRiskColorClasses(value, invert = false) {
  const v = invert ? 6 - value : value;
  if (v >= 4) return "bg-error-container text-on-error-container font-bold";
  if (v >= 3) return "bg-surface-container-high text-on-surface";
  if (v >= 2) return "bg-surface-container-highest text-on-surface";
  return "bg-secondary-container text-on-secondary-container";
}