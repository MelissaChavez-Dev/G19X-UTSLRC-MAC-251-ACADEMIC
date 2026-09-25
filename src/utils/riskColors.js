export function getRiskColorClasses(value, invert = false) {
  const v = invert ? 6 - value : value;
  if (v >= 4) return "bg-red-700 text-white font-bold";
  if (v >= 3) return "bg-orange-300 text-orange-950 font-semibold";
  if (v >= 2) return "bg-amber-100 text-amber-950 font-semibold";
  return "bg-emerald-100 text-emerald-950 font-semibold";
}