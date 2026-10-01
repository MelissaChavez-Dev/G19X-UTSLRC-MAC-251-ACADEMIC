import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MAPPABLE_FIELDS } from "../../data/blockLibrary";

const TYPE_LABELS = {
  scale: "Escala numérica",
  choice: "Una opción",
  text: "Respuesta escrita",
};

const FIELD_LABEL = "block text-label-md font-semibold text-on-surface";
const FIELD_HINT = "mt-1 block text-body-sm text-on-surface-variant";

export default function SortableQuestionBlock({ question, index, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function updateField(field, value) {
    onChange({ ...question, [field]: value });
  }

  function updateOptionLabel(index, label) {
    const options = [...(question.options || [])];
    const option = { ...options[index], label };
    if (option.value?.startsWith("opcion-")) {
      option.value = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `opcion-${index + 1}`;
    }
    options[index] = option;
    updateField("options", options);
  }

  function addOption() {
    const options = [...(question.options || []), { value: `opcion-${(question.options?.length || 0) + 1}`, label: "" }];
    updateField("options", options);
  }

  const hasKnownMapping = MAPPABLE_FIELDS.some((field) => field.value === question.mapsTo);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg p-space-md mb-space-sm"
    >
      <div className="flex items-center gap-space-sm mb-space-sm">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-on-surface-variant hover:text-on-surface touch-none"
          title="Arrastrar para reordenar"
        >
          <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
        </button>
        <div className="flex-1">
          <span className="text-body-md font-semibold text-on-surface block">
            Pregunta {index + 1}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            {TYPE_LABELS[question.type] || "Pregunta"}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-error hover:opacity-70"
          title="Eliminar esta pregunta"
          aria-label={`Eliminar pregunta ${index + 1}`}
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      <div className="flex flex-col gap-space-md">
        <label htmlFor={`question-title-${question.id}`} className={FIELD_LABEL}>
          Pregunta que verá la persona
          <span className={FIELD_HINT}>Escribe la pregunta completa.</span>
        </label>
        <textarea
          id={`question-title-${question.id}`}
          value={question.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Ej. ¿Cómo te sentiste esta semana?"
          rows={2}
          className="survey-field resize-y text-body-md font-medium"
        />

        <label htmlFor={`question-helper-${question.id}`} className={FIELD_LABEL}>
          Ayuda para responder <span className="font-normal text-on-surface-variant">(opcional)</span>
          <span className={FIELD_HINT}>Añade contexto o un periodo de referencia.</span>
        </label>
        <input
          id={`question-helper-${question.id}`}
          value={question.helper || ""}
          onChange={(e) => updateField("helper", e.target.value)}
          placeholder="Ej. Piensa en los últimos 7 días."
          className="survey-field text-body-sm"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <label className={FIELD_LABEL}>
            Tema o sección
            <span className={FIELD_HINT}>Agrupa preguntas relacionadas.</span>
            <input
              value={question.category || ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="Ej. Bienestar semanal"
              className="survey-field mt-2 text-body-sm"
            />
          </label>
          <label className={FIELD_LABEL}>
            Nombre corto
            <span className={FIELD_HINT}>Etiqueta para identificar el indicador.</span>
            <input
              value={question.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Ej. Estado de ánimo"
              className="survey-field mt-2 text-body-sm"
            />
          </label>
        </div>
      </div>

      {question.type === "scale" && (
        <fieldset className="mt-space-md rounded-2xl bg-surface-container-low p-space-md">
          <legend className="text-label-md font-semibold text-on-surface px-1">Rango de la escala</legend>
          <p className="text-body-sm text-on-surface-variant mb-space-sm">
            Define los valores mínimo y máximo y qué representa cada extremo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <label className={FIELD_LABEL}>
              Valor mínimo
              <input
                type="number"
                min="0"
                value={question.min ?? ""}
                onChange={(e) => updateField("min", Number(e.target.value))}
                className="survey-field mt-1 text-body-sm"
              />
            </label>
            <label className={FIELD_LABEL}>
              Valor máximo
              <input
                type="number"
                min="1"
                value={question.max ?? ""}
                onChange={(e) => updateField("max", Number(e.target.value))}
                className="survey-field mt-1 text-body-sm"
              />
            </label>
            <label className={FIELD_LABEL}>
              Texto del mínimo
              <input
                value={question.lowLabel || ""}
                onChange={(e) => updateField("lowLabel", e.target.value)}
                placeholder="Ej. Bajo"
                className="survey-field mt-1 text-body-sm"
              />
            </label>
            <label className={FIELD_LABEL}>
              Texto del máximo
              <input
                value={question.highLabel || ""}
                onChange={(e) => updateField("highLabel", e.target.value)}
                placeholder="Ej. Alto"
                className="survey-field mt-1 text-body-sm"
              />
            </label>
          </div>
        </fieldset>
      )}

      {question.type === "choice" && (
        <fieldset className="mt-space-md rounded-2xl bg-surface-container-low p-space-md">
          <legend className="text-label-md font-semibold text-on-surface px-1">Opciones de respuesta</legend>
          <p className="text-body-sm text-on-surface-variant mb-space-sm">
            La persona podrá seleccionar una de estas opciones.
          </p>
          <div className="flex flex-col gap-space-xs">
          {(question.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-space-sm">
              <span className="w-7 shrink-0 text-center text-label-md text-on-surface-variant">{i + 1}</span>
              <input
                value={opt.label || ""}
                onChange={(e) => updateOptionLabel(i, e.target.value)}
                placeholder={`Escribe la opción ${i + 1}`}
                aria-label={`Texto de la opción ${i + 1}`}
                className="survey-field flex-1 text-body-sm"
              />
              <button
                type="button"
                onClick={() => updateField("options", question.options.filter((_, optionIndex) => optionIndex !== i))}
                className="text-error hover:opacity-70"
                title="Eliminar opción"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="mt-1 text-body-sm font-semibold text-primary self-start">
            + Agregar opción
          </button>
          </div>
        </fieldset>
      )}

      <div className="mt-space-md rounded-2xl bg-surface-container-low p-space-md">
        <label htmlFor={`question-metric-${question.id}`} className="text-label-md font-semibold text-on-surface block">
          ¿Qué indicador ayuda a medir?
        </label>
        <p id={`question-metric-help-${question.id}`} className="text-body-sm text-on-surface-variant mt-1">
          Esta elección permite que las respuestas alimenten los indicadores del dashboard.
        </p>
        <select
          id={`question-metric-${question.id}`}
          value={hasKnownMapping ? question.mapsTo : ""}
          onChange={(e) => updateField("mapsTo", e.target.value)}
          aria-describedby={`question-metric-help-${question.id}`}
          className="survey-field mt-2 text-body-sm"
        >
          <option value="" disabled>Selecciona un indicador</option>
          {MAPPABLE_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <label className="mt-space-md flex items-center gap-3 rounded-xl px-1 py-1 text-body-md font-medium text-on-surface">
        <input
          type="checkbox"
          checked={question.required !== false}
          onChange={(e) => updateField("required", e.target.checked)}
          className="accent-primary"
        />
        La persona debe responder para continuar
      </label>
    </div>
  );
}