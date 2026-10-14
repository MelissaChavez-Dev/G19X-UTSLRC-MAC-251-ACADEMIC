// src/data/dataQualityRules.js
// Verificaciones de calidad sobre las respuestas guardadas en "responses".
// Son funciones puras: reciben las respuestas y devuelven resultados; no leen ni escriben en Firestore.
import { LEVELS, MIN_SAMPLE } from "./kpiThresholds";
import { toFiniteNumber } from "../utils/metricUtils";
import { filterResponsesBySource, getResponseSource } from "../utils/responseSources";

export { getResponseSource };

// Pesos del puntaje (suman 100). Las verificaciones informativas pesan 0.
export const QUALITY_WEIGHTS = { completeness: 25, ranges: 25, minSample: 20, duplicates: 15, freshness: 15 };

// Niveles del puntaje (límite inferior inclusive). Valores iniciales propuestos.
export const QUALITY_LEVEL_FROM = { low: 90, controlled: 75, elevated: 50 };

export const FRESHNESS_DAYS = { ok: 7, warn: 14 };
export const DUPLICATE_WINDOW_MS = 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30; // misma ventana que los KPIs del dashboard
const WEEK_ID = /^\d{4}-W\d{2}$/;
const FACTOR_KEYS = ["cognitiveLoad", "roleAmbiguity", "emotionalLabor", "shiftFatigue", "autonomy", "psychSafety"];
const MAX_EXAMPLES = 5;
const MAX_DETAILS = 8;

// Manual de cada verificación (se muestra en la página).
export const CHECK_DOCS = {
  completeness: {
    title: "Completitud",
    what: "Que cada respuesta tenga departamento, semana, fecha de envío y eNPS.",
    why: "El eNPS se calcula dividiendo entre todas las respuestas, así que una sin eNPS acerca el resultado a 0. Sin departamento o semana, la respuesta no entra bien al heatmap ni a las tendencias.",
    fix: "Revisa en el Constructor de encuestas que exista una pregunta vinculada a eNPS y corrige o elimina en Firestore los documentos incompletos.",
  },
  ranges: {
    title: "Rangos y referencias válidas",
    what: "Que los valores estén dentro de su escala (eNPS de 0 a 10, balance vida-trabajo de 1 a 10, factores psicosociales de 1 a 5) y que el departamento exista en el catálogo.",
    why: "Las fórmulas suponen esas escalas. Un valor fuera de rango, por ejemplo una pregunta de 1 a 10 vinculada a un factor de 1 a 5, satura el índice de presión laboral o dispara el riesgo del heatmap.",
    fix: "Ajusta la escala de la pregunta en el Constructor para que coincida con su indicador y corrige los documentos afectados.",
  },
  minSample: {
    title: "Muestra mínima por departamento",
    what: `Que cada departamento tenga al menos ${MIN_SAMPLE.responses} respuestas en los últimos 30 días (o en todo el histórico si no hay respuestas recientes, igual que los KPIs).`,
    why: "Con muestras pequeñas una sola respuesta mueve los promedios, y con pocas personas se podría adivinar quién respondió.",
    fix: "Recuerda la encuesta pendiente al departamento y revisa que sus colaboradores tengan el departamento asignado en Gestión de usuarios.",
  },
  duplicates: {
    title: "Posibles duplicados",
    what: "Respuestas idénticas del mismo departamento enviadas con menos de un minuto de diferencia.",
    why: "Suelen ser envíos dobles. Como las respuestas son anónimas no se sabe quién las envió, por eso se muestran como posibles duplicados y no como errores confirmados.",
    fix: "Revisa los ejemplos en Firestore y elimina la copia si confirmas que es un envío doble.",
  },
  freshness: {
    title: "Frescura",
    what: `Cuántos días pasaron desde la última respuesta (hasta ${FRESHNESS_DAYS.ok} días es correcto; hasta ${FRESHNESS_DAYS.warn}, atención).`,
    why: "Un dashboard con datos viejos describe cómo estaba el equipo, no cómo está.",
    fix: "Publica o reactiva una encuesta y recuerda a los equipos que la respondan.",
  },
  instrument: {
    title: "Instrumento de captura",
    what: "Qué porcentaje de las respuestas reales conserva la plantilla con la que se contestaron.",
    why: "Sin plantilla asociada no se sabe con qué instrumento se capturó la respuesta; puede haberse usado la encuesta por defecto por un error al cargar la plantilla publicada.",
    fix: "Revisa que la plantilla publicada pase la validación del Constructor y vuelve a publicarla si hace falta.",
  },
  sources: {
    title: "Cobertura de fuentes operativas",
    what: "Si la presencia digital y las bajas tienen datos suficientes para calcular ausentismo y rotación.",
    why: "Ausentismo y rotación salen de otras colecciones; sin registros sus tarjetas muestran 0% o Sin datos.",
    fix: `El ausentismo se calcula cada noche con la actividad de los colaboradores; la rotación necesita al menos ${MIN_SAMPLE.headcount} colaboradores activos.`,
  },
};

export function qualityLevel(score) {
  if (!Number.isFinite(score)) return LEVELS.noData;
  if (score >= QUALITY_LEVEL_FROM.low) return LEVELS.low;
  if (score >= QUALITY_LEVEL_FROM.controlled) return LEVELS.controlled;
  if (score >= QUALITY_LEVEL_FROM.elevated) return LEVELS.elevated;
  return LEVELS.critical;
}

export const filterBySource = filterResponsesBySource;

export function compositionOf(responses) {
  const composition = { live: 0, simulated: 0, unknown: 0, total: responses.length };
  responses.forEach((response) => {
    composition[getResponseSource(response)] += 1;
  });
  return composition;
}

function millisOf(value) {
  if (!value) return null;
  let ms = null;
  if (typeof value.toMillis === "function") ms = value.toMillis();
  else if (typeof value.toDate === "function") ms = value.toDate().getTime();
  else if (value instanceof Date) ms = value.getTime();
  return Number.isFinite(ms) ? ms : null;
}

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function statusFromScore(score) {
  if (score >= 0.95) return "ok";
  if (score >= 0.75) return "warn";
  return "fail";
}

function makeCheck(id, { score, status, summary, details = [], examples = [] }) {
  return {
    id,
    title: CHECK_DOCS[id].title,
    weight: QUALITY_WEIGHTS[id] ?? 0,
    score,
    status,
    summary,
    details,
    examples: examples.slice(0, MAX_EXAMPLES).map((response) => response.id).filter(Boolean),
  };
}

function checkCompleteness(responses) {
  const labels = { departmentId: "departamento", weekId: "semana válida", submittedAt: "fecha de envío", enps: "eNPS" };
  const missing = { departmentId: 0, weekId: 0, submittedAt: 0, enps: 0 };
  const incomplete = [];

  responses.forEach((response) => {
    const lacks = [];
    if (typeof response.departmentId !== "string" || !response.departmentId.trim()) lacks.push("departmentId");
    if (typeof response.weekId !== "string" || !WEEK_ID.test(response.weekId)) lacks.push("weekId");
    if (millisOf(response.submittedAt) === null) lacks.push("submittedAt");
    if (toFiniteNumber(response.enps) === null) lacks.push("enps");
    if (lacks.length > 0) {
      incomplete.push(response);
      lacks.forEach((key) => { missing[key] += 1; });
    }
  });

  const score = 1 - incomplete.length / responses.length;
  const details = Object.keys(missing)
    .filter((key) => missing[key] > 0)
    .map((key) => `${missing[key]} sin ${labels[key]}`);

  return makeCheck("completeness", {
    score,
    status: statusFromScore(score),
    summary: incomplete.length === 0
      ? `Las ${responses.length} respuestas están completas.`
      : `${incomplete.length} de ${responses.length} respuestas incompletas.`,
    details,
    examples: incomplete,
  });
}

function checkRanges(responses, knownDepartmentIds) {
  const counts = { enps: 0, workLifeBalance: 0, factors: 0, department: 0 };
  const flagged = [];
  const outside = (value, min, max) => {
    if (!hasValue(value)) return false;
    const n = toFiniteNumber(value);
    return n === null || n < min || n > max;
  };

  responses.forEach((response) => {
    let isFlagged = false;
    if (outside(response.enps, 0, 10)) { counts.enps += 1; isFlagged = true; }
    if (outside(response.workLifeBalance, 1, 10)) { counts.workLifeBalance += 1; isFlagged = true; }
    const factors = response.psychosocialFactors || {};
    if (FACTOR_KEYS.some((key) => outside(factors[key], 1, 5))) { counts.factors += 1; isFlagged = true; }
    if (
      knownDepartmentIds.size > 0
      && typeof response.departmentId === "string"
      && response.departmentId.trim()
      && !knownDepartmentIds.has(response.departmentId)
    ) {
      counts.department += 1;
      isFlagged = true;
    }
    if (isFlagged) flagged.push(response);
  });

  const score = 1 - flagged.length / responses.length;
  const details = [];
  if (counts.enps) details.push(`${counts.enps} con eNPS fuera de 0 a 10`);
  if (counts.workLifeBalance) details.push(`${counts.workLifeBalance} con balance vida-trabajo fuera de 1 a 10`);
  if (counts.factors) details.push(`${counts.factors} con algún factor psicosocial fuera de 1 a 5`);
  if (counts.department) details.push(`${counts.department} con un departamento que no existe en el catálogo`);

  return makeCheck("ranges", {
    score,
    status: statusFromScore(score),
    summary: flagged.length === 0
      ? "Todos los valores están dentro de su escala."
      : `${flagged.length} de ${responses.length} respuestas con valores fuera de rango o referencias inválidas.`,
    details,
    examples: flagged,
  });
}

function checkMinSample(responses, departments, now) {
  if (departments.length === 0) {
    return makeCheck("minSample", {
      score: null,
      status: "info",
      summary: "No hay departamentos activos configurados.",
    });
  }

  const cutoff = now - WINDOW_DAYS * DAY_MS;
  const recent = responses.filter((response) => (millisOf(response.submittedAt) ?? -Infinity) >= cutoff);
  const useRecent = recent.length > 0;
  const base = useRecent ? recent : responses;

  const counts = {};
  base.forEach((response) => {
    counts[response.departmentId] = (counts[response.departmentId] || 0) + 1;
  });

  const min = MIN_SAMPLE.responses;
  const failing = departments.filter((department) => (counts[department.id] || 0) < min);
  const ok = departments.length - failing.length;
  const score = ok / departments.length;

  return makeCheck("minSample", {
    score,
    status: statusFromScore(score),
    summary: `${ok} de ${departments.length} departamentos con al menos ${min} respuestas (${useRecent ? "últimos 30 días" : "todo el histórico, porque no hay respuestas recientes"}).`,
    details: failing
      .slice(0, MAX_DETAILS)
      .map((department) => `${department.name}: ${counts[department.id] || 0} de ${min} respuestas mínimas`),
  });
}

function fingerprintOf(response) {
  const factors = response.psychosocialFactors || {};
  return JSON.stringify([
    response.departmentId,
    response.enps ?? null,
    response.workLifeBalance ?? null,
    response.cognitiveLoad ?? null,
    response.mood ?? null,
    FACTOR_KEYS.map((key) => factors[key] ?? null),
    response.openText ?? "",
  ]);
}

function checkDuplicates(responses) {
  const timed = responses
    .map((response) => ({ response, ms: millisOf(response.submittedAt) }))
    .filter((item) => item.ms !== null)
    .sort((a, b) => a.ms - b.ms);

  const lastSeen = new Map();
  const duplicates = [];
  timed.forEach(({ response, ms }) => {
    const key = fingerprintOf(response);
    const previous = lastSeen.get(key);
    if (previous !== undefined && ms - previous <= DUPLICATE_WINDOW_MS) duplicates.push(response);
    lastSeen.set(key, ms);
  });

  const score = 1 - duplicates.length / responses.length;
  return makeCheck("duplicates", {
    score,
    status: statusFromScore(score),
    summary: duplicates.length === 0
      ? "No se detectaron posibles duplicados."
      : `${pluralize(duplicates.length, "posible duplicado", "posibles duplicados")} de ${responses.length} respuestas.`,
    details: duplicates.length > 0 ? ["Respuestas idénticas del mismo departamento con menos de 1 minuto de diferencia."] : [],
    examples: duplicates,
  });
}

function checkFreshness(responses, now) {
  const latest = responses.reduce((max, response) => {
    const ms = millisOf(response.submittedAt);
    return ms !== null && ms > max ? ms : max;
  }, -Infinity);

  if (!Number.isFinite(latest)) {
    return makeCheck("freshness", {
      score: 0,
      status: "fail",
      summary: "Ninguna respuesta tiene fecha de envío válida.",
    });
  }

  const days = Math.max(0, Math.floor((now - latest) / DAY_MS));
  let score = 0;
  let status = "fail";
  if (days <= FRESHNESS_DAYS.ok) { score = 1; status = "ok"; }
  else if (days <= FRESHNESS_DAYS.warn) { score = 0.5; status = "warn"; }

  return makeCheck("freshness", {
    score,
    status,
    summary: days === 0 ? "La última respuesta llegó hoy." : `La última respuesta llegó hace ${pluralize(days, "día", "días")}.`,
  });
}

function checkInstrument(responses) {
  const live = responses.filter((response) => getResponseSource(response) === "live");
  if (live.length === 0) {
    return makeCheck("instrument", {
      score: null,
      status: "info",
      summary: "Aún no hay respuestas reales; las simuladas no usan plantilla.",
    });
  }

  const withoutTemplate = live.filter((response) => !response.templateId);
  const ratio = 1 - withoutTemplate.length / live.length;
  return makeCheck("instrument", {
    score: ratio,
    status: ratio >= 0.95 ? "ok" : "warn",
    summary: `${live.length - withoutTemplate.length} de ${live.length} respuestas reales tienen plantilla asociada.`,
    details: withoutTemplate.length > 0
      ? [`${withoutTemplate.length} respuestas reales sin plantilla (posible uso de la encuesta por defecto).`]
      : [],
    examples: withoutTemplate,
  });
}

function checkSources(sources) {
  const details = [];
  let allOk = true;
  if (!(sources.absenceWorkDays > 0)) {
    allOk = false;
    details.push("Sin registros de presencia en los últimos 30 días (se calculan cada noche).");
  }
  if (!(sources.turnoverHeadcount >= MIN_SAMPLE.headcount)) {
    allOk = false;
    details.push(`Headcount menor a ${MIN_SAMPLE.headcount}: la rotación se muestra como Sin datos.`);
  }
  return makeCheck("sources", {
    score: allOk ? 1 : 0.5,
    status: allOk ? "ok" : "warn",
    summary: allOk ? "Ausentismo y rotación tienen datos suficientes." : "Alguna fuente operativa no tiene datos suficientes.",
    details,
  });
}

/**
 * @param {Array} responses respuestas de Firestore (con id)
 * @param {Object} options departments (activos), knownDepartments (todos), sources ({ absenceWorkDays, turnoverHeadcount }), now
 */
export function runQualityChecks(responses, { departments = [], knownDepartments = departments, sources = null, now = Date.now() } = {}) {
  const composition = compositionOf(responses);
  if (responses.length === 0) {
    return { total: 0, composition, score: null, level: LEVELS.noData, checks: [] };
  }

  const knownIds = new Set(knownDepartments.map((department) => department.id));
  const checks = [
    checkCompleteness(responses),
    checkRanges(responses, knownIds),
    checkMinSample(responses, departments, now),
    checkDuplicates(responses),
    checkFreshness(responses, now),
    checkInstrument(responses),
  ];
  if (sources) checks.push(checkSources(sources));

  const weighted = checks.filter((check) => check.weight > 0 && check.score !== null);
  const totalWeight = weighted.reduce((sum, check) => sum + check.weight, 0);
  const score = totalWeight > 0
    ? Math.round((weighted.reduce((sum, check) => sum + check.weight * check.score, 0) / totalWeight) * 100)
    : null;

  return { total: responses.length, composition, score, level: qualityLevel(score), checks };
}
