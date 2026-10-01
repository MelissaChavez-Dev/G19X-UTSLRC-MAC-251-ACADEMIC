export function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function averageNumeric(values) {
  const validValues = values.map(toFiniteNumber).filter((value) => value !== null);
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

export function workPressureIndex(responses) {
  const factorAverages = [
    averageNumeric(responses.map((response) => response.psychosocialFactors?.shiftFatigue)),
    averageNumeric(responses.map((response) => response.psychosocialFactors?.emotionalLabor)),
  ].filter((value) => value !== null);

  if (factorAverages.length === 0) return null;

  const averageFactor = factorAverages.reduce((sum, value) => sum + value, 0) / factorAverages.length;
  return Math.round(Math.max(0, Math.min(100, ((averageFactor - 1) / 4) * 100)));
}
