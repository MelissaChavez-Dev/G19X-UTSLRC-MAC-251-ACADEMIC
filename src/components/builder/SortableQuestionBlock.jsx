import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MAPPABLE_FIELDS } from "../../data/blockLibrary";

const TYPE_LABELS = {
  scale: "Escala numérica",
  choice: "Una opción",
  text: "Respuesta escrita",
};

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

  function updateOption(index, field, value) {
    const options = [...(question.options || [])];
    options[index] = { ...options[index], [field]: value };
    updateField("options", options);
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
          <span className="text-label-md font-semibold text-on-surface block">
            Pregunta {index + 1}
          </span>
          <span className="text-label-sm text-on-surface-variant">
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

      <input
        id={`question-title-${question.id}`}
        value={question.title || ""}
        onChange={(e) => updateField("title", e.target.value)}
        placeholder="Ej. ¿Cómo te sentiste esta semana?"
        className="w-full text-body-lg font-semibold text-on-surface bg-transparent border-b border-outline-variant pb-1 mb-2 focus:outline-none focus:border-primary"
      />
      <label htmlFor={`question-title-${question.id}`} className="text-label-sm text-on-surface-variant block mb-3">
        Pregunta que verá la persona
      </label>
      <input
        aria-label="Ayuda para la pregunta"
        value={question.helper || ""}
        onChange={(e) => updateField("helper", e.target.value)}
        placeholder="Ayuda opcional. Ej. Piensa en los últimos 7 días."
        className="w-full text-body-sm text-on-surface-variant bg-transparent mb-3 focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-space-sm mb-3">
        <label className="text-label-sm text-on-surface-variant">
          Tema o sección
          <input
            value={question.category || ""}
            onChange={(e) => updateField("category", e.target.value)}
            placeholder="Ej. Bienestar semanal"
            className="mt-1 w-full text-body-sm rounded-md border border-outline-variant p-2 text-on-surface"
          />
        </label>
        <label className="text-label-sm text-on-surface-variant">
          Nombre corto
          <input
            value={question.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Ej. Estado de ánimo"
            className="mt-1 w-full text-body-sm rounded-md border border-outline-variant p-2 text-on-surface"
          />
        </label>
      </div>
      <p className="text-label-sm text-on-surface-variant -mt-2 mb-3">
        Tema y nombre corto para ordenar la encuesta.
      </p>

      {question.type === "scale" && (
        <div className="grid grid-cols-2 gap-space-sm mb-2">
          <input
            type="number"
            min="0"
            value={question.min ?? ""}
            onChange={(e) => updateField("min", Number(e.target.value))}
            placeholder="Número inicial. Ej. 1"
            className="text-body-sm rounded-md border border-outline-variant p-2"
          />
          <input
            type="number"
            min="1"
            value={question.max ?? ""}
            onChange={(e) => updateField("max", Number(e.target.value))}
            placeholder="Número final. Ej. 10"
            className="text-body-sm rounded-md border border-outline-variant p-2"
          />
          <input
            value={question.lowLabel || ""}
            onChange={(e) => updateField("lowLabel", e.target.value)}
            placeholder="Qué significa el mínimo"
            className="text-body-sm rounded-md border border-outline-variant p-2"
          />
          <input
            value={question.highLabel || ""}
            onChange={(e) => updateField("highLabel", e.target.value)}
            placeholder="Qué significa el máximo"
            className="text-body-sm rounded-md border border-outline-variant p-2"
          />
        </div>
      )}

      {question.type === "choice" && (
        <div className="flex flex-col gap-1.5 mb-2">
          {(question.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={opt.label || ""}
                onChange={(e) => updateOptionLabel(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                aria-label={`Texto de la opción ${i + 1}`}
                className="flex-1 text-body-sm rounded-md border border-outline-variant p-2"
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
          <button type="button" onClick={addOption} className="text-label-sm text-primary self-start">
            + Agregar opción
          </button>
        </div>
      )}

      <div className="mt-2">
          <label className="text-label-md font-semibold text-on-surface block">
          ¿Qué indicador ayuda a medir?
        </label>
        <p className="text-label-sm text-on-surface-variant mt-1">
          Esta elección permite que las respuestas alimenten los indicadores del dashboard.
        </p>
        <select
          value={hasKnownMapping ? question.mapsTo : ""}
          onChange={(e) => updateField("mapsTo", e.target.value)}
          className="w-full mt-1 text-body-sm rounded-md border border-outline-variant p-2"
        >
          <option value="" disabled>Selecciona un indicador</option>
          {MAPPABLE_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <label className="mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
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