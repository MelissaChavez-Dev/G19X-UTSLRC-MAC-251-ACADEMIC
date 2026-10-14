export function getResponseSource(response) {
  if (response?.source === "live") return "live";
  if (typeof response?.source === "string" && response.source.startsWith("synthetic")) return "simulated";
  return "unknown";
}

export function filterResponsesBySource(responses, mode = "all") {
  if (mode === "live" || mode === "simulated") {
    return responses.filter((response) => getResponseSource(response) === mode);
  }
  return responses;
}

export function responseSourceLabel(mode = "all") {
  if (mode === "live") return "Respuestas reales";
  if (mode === "simulated") return "Respuestas simuladas";
  return "Todas las respuestas";
}
