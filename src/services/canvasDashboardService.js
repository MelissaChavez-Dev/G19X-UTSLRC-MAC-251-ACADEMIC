import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const VISUALIZATIONS = new Set(["kpi", "line", "bar", "table"]);
const WIDTHS = new Set([3, 4, 6, 8, 9, 12]);
const HEIGHTS = new Set(["compact", "regular", "tall"]);
const DATE_RANGES = new Set([7, 14, 30]);
const PALETTES = new Set(["sage", "mint", "forest"]);
const AGGREGATIONS = new Set(["AVG", "SUM", "COUNT", "PERCENTAGE"]);
const METRIC_IDS = new Set(["participationRate", "psychSafety", "attritionRisk"]);
const MAX_WIDGETS = 20;

function validateCustomMetric(definition) {
  if (
    !definition ||
    typeof definition.id !== "string" ||
    !definition.id.startsWith("custom_") ||
    typeof definition.name !== "string" ||
    definition.name.trim().length < 2 ||
    definition.name.length > 80 ||
    typeof definition.unit !== "string" ||
    definition.unit.length > 24 ||
    !AGGREGATIONS.has(definition.aggregation) ||
    !["none", "date", "department"].includes(definition.groupBy)
  ) {
    throw new Error("La configuración de una métrica personalizada no es válida.");
  }
  if (definition.aggregation === "PERCENTAGE") {
    if (
      !METRIC_IDS.has(definition.numeratorMetricId) ||
      !METRIC_IDS.has(definition.denominatorMetricId) ||
      definition.numeratorMetricId === definition.denominatorMetricId
    ) {
      throw new Error("El porcentaje personalizado necesita campos válidos y distintos.");
    }
  } else if (!METRIC_IDS.has(definition.metricId)) {
    throw new Error("La métrica personalizada referencia un campo no permitido.");
  }
}

function validateDashboard({ name, sourceType, sourceImportId, widgets }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    throw new Error("El nombre debe contener entre 1 y 80 caracteres.");
  }
  if (!["responses", "externalDataImports"].includes(sourceType)) {
    throw new Error("Selecciona una fuente de datos válida.");
  }
  if (sourceType === "externalDataImports" && !sourceImportId) {
    throw new Error("Selecciona una importación completada.");
  }
  if (!Array.isArray(widgets) || widgets.length > MAX_WIDGETS) {
    throw new Error(`El tablero admite hasta ${MAX_WIDGETS} widgets.`);
  }

  const ids = new Set();
  widgets.forEach((widget) => {
    if (
      !widget ||
      typeof widget.id !== "string" ||
      ids.has(widget.id) ||
      typeof widget.metricId !== "string" ||
      !VISUALIZATIONS.has(widget.visualization) ||
      !WIDTHS.has(widget.width) ||
      !HEIGHTS.has(widget.height) ||
      typeof widget.title !== "string" ||
      widget.title.length > 100
    ) {
      throw new Error("El tablero contiene un widget inválido. Revísalo e inténtalo de nuevo.");
    }
    if (widget.dateRangeDays !== undefined && !DATE_RANGES.has(widget.dateRangeDays)) {
      throw new Error("Un widget tiene un periodo de fechas no permitido.");
    }
    if (widget.palette !== undefined && !PALETTES.has(widget.palette)) {
      throw new Error("Un widget tiene una paleta no permitida.");
    }
    if (
      widget.threshold !== undefined &&
      widget.threshold !== null &&
      (typeof widget.threshold !== "number" || !Number.isFinite(widget.threshold))
    ) {
      throw new Error("El umbral de un widget debe ser un número finito.");
    }
    if (widget.thresholdOperator !== undefined && !["above", "below"].includes(widget.thresholdOperator)) {
      throw new Error("El operador de alerta del widget no es válido.");
    }
    if (widget.metricDefinition !== undefined) validateCustomMetric(widget.metricDefinition);
    ids.add(widget.id);
  });
}

export function subscribeCanvasDashboards(ownerUid, onDashboards, onError) {
  const dashboardsQuery = query(
    collection(db, "customDashboards"),
    where("ownerUid", "==", ownerUid)
  );
  return onSnapshot(
    dashboardsQuery,
    (snapshot) => {
      const dashboards = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      onDashboards(dashboards);
    },
    onError
  );
}

export async function saveCanvasDashboard(ownerUid, dashboardId, dashboard) {
  validateDashboard(dashboard);
  const payload = {
    ownerUid,
    name: dashboard.name.trim(),
    sourceType: dashboard.sourceType,
    sourceImportId: dashboard.sourceType === "externalDataImports" ? dashboard.sourceImportId : null,
    widgets: dashboard.widgets,
    updatedAt: serverTimestamp(),
  };

  if (dashboardId) {
    await updateDoc(doc(db, "customDashboards", dashboardId), payload);
    return dashboardId;
  }

  const dashboardRef = doc(collection(db, "customDashboards"));
  await setDoc(dashboardRef, { ...payload, createdAt: serverTimestamp() });
  return dashboardRef.id;
}

export async function removeCanvasDashboard(dashboardId) {
  await deleteDoc(doc(db, "customDashboards", dashboardId));
}
