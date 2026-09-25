export const BLOCK_TYPES = [
  {
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
    type: "choice",
    icon: "check_circle",
    label: "Opción múltiple",
    description: "Selección única entre varias opciones",
    defaults: {
      options: [
        { value: "shift-handoff", label: "Cambios de contexto y entregas entre tareas" },
        { value: "emr-integration", label: "Demoras de herramientas o sistemas" },
        { value: "unclear-protocols", label: "Prioridades o protocolos poco claros" },
        { value: "balanced", label: "Ninguno / ritmo balanceado" },
      ],
      mapsTo: "cognitiveLoad",
      required: true,
    },
  },
  {
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
  { value: "workLifeBalance", label: "Balance vida-trabajo (1-10)" },
  { value: "cognitiveLoad", label: "Fuente de fricción" },
  { value: "psychosocialFactors.psychSafety", label: "Seguridad psicológica (1-10)" },
  { value: "psychosocialFactors.roleAmbiguity", label: "Ambigüedad de rol" },
  { value: "psychosocialFactors.emotionalLabor", label: "Carga emocional" },
  { value: "psychosocialFactors.shiftFatigue", label: "Fatiga de turno" },
  { value: "psychosocialFactors.autonomy", label: "Autonomía" },
  { value: "openText", label: "Comentario libre (text)" },
];