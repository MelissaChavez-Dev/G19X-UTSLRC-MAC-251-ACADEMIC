export const BLOCK_TYPES = [
  {
    id: "scale-1-10",
    type: "scale",
    icon: "linear_scale",
    label: "Escala 1-10",
    description: "1 a 10, bienestar subjetivo",
    defaults: {
      min: 1,
      max: 10,
      lowLabel: "Bajo",
      highLabel: "Alto",
      mapsTo: "workLifeBalance",
      required: true,
    },
  },
  {
    id: "likert-1-5",
    type: "scale",
    icon: "linear_scale",
    label: "Likert 1-5",
    description: "Escala de acuerdo o valoración de 1 a 5",
    defaults: {
      min: 1,
      max: 5,
      lowLabel: "Totalmente en desacuerdo",
      highLabel: "Totalmente de acuerdo",
      mapsTo: "psychosocialFactors.cognitiveLoad",
      required: true,
    },
  },
  {
    id: "choice",
    type: "choice",
    icon: "check_circle",
    label: "Opción múltiple",
    description: "Selección única entre varias opciones",
    defaults: {
      options: [
        { value: "context-switching", label: "Cambios de contexto y entregas entre tareas" },
        { value: "tool-delays", label: "Demoras de herramientas o sistemas" },
        { value: "unclear-priorities", label: "Prioridades o protocolos poco claros" },
        { value: "no-friction", label: "Ninguno / ritmo balanceado" },
      ],
      mapsTo: "cognitiveLoad",
      required: true,
    },
  },
  {
    id: "text",
    type: "text",
    icon: "short_text",
    label: "Texto abierto",
    description: "Narrativa de línea abierta",
    defaults: { mapsTo: "openText", required: false },
  },
];

// Campos del esquema de "responses" a los que una pregunta puede mapear
export const MAPPABLE_FIELDS = [
  { value: "enps", label: "eNPS (0-10)" },
  { value: "mood", label: "Estado de ánimo (feliz, neutral, etc.)" },
  { value: "workLifeBalance", label: "Balance vida-trabajo (1-10)" },
  { value: "cognitiveLoad", label: "Fuente de fricción" },
  { value: "psychosocialFactors.cognitiveLoad", label: "Carga cognitiva (1-5)" },
  { value: "psychosocialFactors.psychSafety", label: "Seguridad psicológica (1-10)" },
  { value: "psychosocialFactors.roleAmbiguity", label: "Ambigüedad de rol" },
  { value: "psychosocialFactors.emotionalLabor", label: "Carga emocional" },
  { value: "psychosocialFactors.shiftFatigue", label: "Cansancio al finalizar la jornada" },
  { value: "psychosocialFactors.autonomy", label: "Autonomía" },
  { value: "openText", label: "Comentario libre (text)" },
];