export const SURVEY_TEMPLATE_STATUSES = ["draft", "published"];
export const SURVEY_QUESTION_TYPES = ["scale", "choice", "text"];

export const RESPONSE_FIELD_PATHS = [
  "enps",
  "mood",
  "workLifeBalance",
  "cognitiveLoad",
  "openText",
  "psychosocialFactors.cognitiveLoad",
  "psychosocialFactors.roleAmbiguity",
  "psychosocialFactors.emotionalLabor",
  "psychosocialFactors.shiftFatigue",
  "psychosocialFactors.autonomy",
  "psychosocialFactors.psychSafety",
];

const NUMERIC_RESPONSE_FIELD_PATHS = new Set([
  "enps",
  "workLifeBalance",
  "psychosocialFactors.cognitiveLoad",
  "psychosocialFactors.roleAmbiguity",
  "psychosocialFactors.emotionalLabor",
  "psychosocialFactors.shiftFatigue",
  "psychosocialFactors.autonomy",
  "psychosocialFactors.psychSafety",
]);

export function createEmptySurveyTemplate() {
  return {
    title: "",
    status: "draft",
    questions: [],
  };
}

export function validateSurveyQuestion(question) {
  const errors = [];

  if (!question?.id) errors.push("La pregunta debe tener un id.");
  if (!SURVEY_QUESTION_TYPES.includes(question?.type)) {
    errors.push("La pregunta tiene un tipo no reconocido.");
  }
  if (!question?.category) errors.push("La pregunta debe tener una categoría.");
  if (!question?.label) errors.push("La pregunta debe tener una etiqueta.");
  if (!question?.title) errors.push("La pregunta debe tener un título.");
  if (!RESPONSE_FIELD_PATHS.includes(question?.mapsTo)) {
    errors.push("La pregunta debe estar vinculada a un indicador.");
  }

  if (question?.type === "scale") {
    if (!Number.isFinite(question.min) || !Number.isFinite(question.max) || question.min >= question.max) {
      errors.push("Una pregunta scale debe tener min y max válidos.");
    }
    if (!question.lowLabel || !question.highLabel) {
      errors.push("Una pregunta scale debe tener lowLabel y highLabel.");
    }
  }

  if (question?.type === "choice") {
    if (!Array.isArray(question.options) || question.options.length === 0) {
      errors.push("Una pregunta choice debe tener al menos una opción.");
    } else if (question.options.some((option) => !option?.value || !option?.label)) {
      errors.push("Cada opción debe tener un texto.");
    } else if (
      NUMERIC_RESPONSE_FIELD_PATHS.has(question.mapsTo)
      && question.options.some((option) => !Number.isFinite(Number(option.value)))
    ) {
      errors.push("Las opciones de un indicador numérico deben tener valores numéricos; usa Estado de ánimo para opciones como feliz o molesto.");
    }
  }

  if (question?.type === "text" && question.mapsTo !== "openText") {
    errors.push("Una respuesta escrita debe vincularse al comentario libre.");
  }
  if (question?.mapsTo === "mood" && question.type === "text") {
    errors.push("El estado de ánimo debe configurarse como escala u opción, no como texto abierto.");
  }

  return errors;
}

export function validateSurveyTemplate(template) {
  const errors = [];

  if (!template?.title?.trim()) errors.push("La plantilla debe tener un título.");
  if (!SURVEY_TEMPLATE_STATUSES.includes(template?.status)) {
    errors.push("La plantilla debe tener status draft o published.");
  }
  if (!Array.isArray(template?.questions) || template.questions.length === 0) {
    errors.push("La plantilla debe tener al menos una pregunta.");
  } else {
    const mappedPaths = template.questions
      .map((question) => question.mapsTo)
      .filter(Boolean);
    const duplicatePaths = mappedPaths.filter(
      (path, index) => mappedPaths.indexOf(path) !== index,
    );
    [...new Set(duplicatePaths)].forEach(() => {
      errors.push("Hay indicadores repetidos; cada indicador debe tener una sola pregunta.");
    });

    template.questions.forEach((question, index) => {
      validateSurveyQuestion(question).forEach((error) => {
        errors.push(`Pregunta ${index + 1}: ${error}`);
      });
    });
  }

  return errors;
}
