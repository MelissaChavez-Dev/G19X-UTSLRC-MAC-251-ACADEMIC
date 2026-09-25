import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import SortableQuestionBlock from "../components/builder/SortableQuestionBlock";
import { BLOCK_TYPES } from "../data/blockLibrary";
import {
  createTemplate, saveTemplateQuestions, publishTemplate, getTemplate,
} from "../services/templateService";

let nextId = 1;

function DraggableBlockButton({ block, onAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${block.type}`,
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      onClick={() => onAdd(block.type)}
      className={`w-full flex items-center gap-space-sm p-space-sm rounded-lg border border-outline-variant mb-space-sm hover:bg-surface-container-low text-left touch-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="material-symbols-outlined text-primary-container text-[20px]">
        {block.icon}
      </span>
      <div>
        <span className="text-body-sm font-semibold text-on-surface block">{block.label}</span>
        <span className="text-label-sm text-on-surface-variant">{block.description}</span>
      </div>
    </button>
  );
}

export default function SurveyBuilder() {
  const { templateId: paramId } = useParams();
  const navigate = useNavigate();

  const [templateId, setTemplateId] = useState(paramId || null);
  const [title, setTitle] = useState("Nueva encuesta");
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(paramId));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { setNodeRef: setCanvasNodeRef, isOver: isCanvasOver } = useDroppable({ id: "canvas" });

  useEffect(() => {
    async function init() {
      if (!paramId) {
        setLoadingTemplate(false);
        return;
      }

      try {
        const tpl = await getTemplate(paramId);
        if (!tpl) {
          throw new Error("No se encontró la plantilla solicitada.");
        }
        setTitle(tpl.title || "Nueva encuesta");
        setQuestions(tpl.questions || []);
      } catch (err) {
        setError(err.message || "No se pudo cargar la plantilla.");
      } finally {
        setLoadingTemplate(false);
      }
    }
    init();
  }, [paramId, navigate]);

  function addBlock(blockType, insertAt = null) {
    const def = BLOCK_TYPES.find((b) => b.type === blockType);
    if (!def) return;
    const newQuestion = {
      id: `q-${Date.now()}-${nextId++}`,
      type: blockType,
      category: "Custom",
      label: def.label,
      title: def.label,
      helper: "",
      ...def.defaults,
    };
    setQuestions((prev) => {
      if (insertAt === null || insertAt < 0 || insertAt > prev.length) {
        return [...prev, newQuestion];
      }
      const next = [...prev];
      next.splice(insertAt, 0, newQuestion);
      return next;
    });
  }

  function updateQuestion(updated) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  }

  function removeQuestion(id) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    if (activeId.startsWith("library:")) {
      const blockType = activeId.replace("library:", "");
      const targetIndex = questions.findIndex((question) => question.id === over.id);
      if (over.id === "canvas" || targetIndex >= 0) {
        addBlock(blockType, targetIndex >= 0 ? targetIndex : null);
      }
      return;
    }

    if (active.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function ensureTemplateId() {
    if (templateId) return templateId;
    const id = await createTemplate(title.trim() || "Nueva encuesta");
    setTemplateId(id);
    navigate(`/survey-builder/${id}`, { replace: true });
    return id;
  }

  async function handleSave() {
    if (saving) return false;
    setSaving(true);
    setError("");
    try {
      const id = await ensureTemplateId();
      await saveTemplateQuestions(id, questions, title.trim() || "Nueva encuesta");
      setSavedAt(new Date());
      return true;
    } catch (err) {
      setError(err.message || "No se pudo guardar el borrador.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const id = await ensureTemplateId();
      await saveTemplateQuestions(id, questions, title.trim() || "Nueva encuesta");
      await publishTemplate(id);
      setSavedAt(new Date());
      alert("Encuesta publicada. Ahora es la que se muestra en /survey.");
    } catch (err) {
      setError(err.message || "No se pudo publicar la encuesta.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-body-md text-on-surface-variant">Cargando constructor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-16">
        <div className="px-space-xl py-space-lg">
          <div className="flex items-center justify-between mb-space-md">
            <div>
              <label htmlFor="survey-title" className="text-label-sm text-on-surface-variant uppercase tracking-widest">
                Nombre de la encuesta
              </label>
              <input
                id="survey-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Pulso de bienestar semanal"
                className="block mt-1 text-headline-lg text-on-surface bg-transparent focus:outline-none"
              />
              <p className="text-body-sm text-on-surface-variant mt-1">
                Las personas verán este nombre al responder.
              </p>
            </div>
            <div className="flex gap-space-sm">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-surface-container text-on-surface text-body-sm font-semibold hover:bg-surface-container-high"
              >
                {saving ? "Guardando..." : "Guardar para continuar después"}
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-primary text-on-primary text-body-sm font-semibold hover:opacity-90"
              >
                {saving ? "Guardando..." : "Publicar encuesta"}
              </button>
            </div>
          </div>
          {savedAt && !error && (
            <p className="text-label-sm text-on-surface-variant mb-space-md">
              Guardado {savedAt.toLocaleTimeString()}
            </p>
          )}
          {error && <p className="text-body-sm text-error mb-space-md">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm mb-space-lg">
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="text-label-md font-semibold text-on-surface block">1. Elige</span>
              <span className="text-body-sm text-on-surface-variant">Añade un tipo de pregunta.</span>
            </div>
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="text-label-md font-semibold text-on-surface block">2. Escribe</span>
              <span className="text-body-sm text-on-surface-variant">Completa lo que verá la persona.</span>
            </div>
            <div className="rounded-lg bg-surface-container-low p-space-sm">
              <span className="text-label-md font-semibold text-on-surface block">3. Publica</span>
              <span className="text-body-sm text-on-surface-variant">Guarda y publica cuando esté lista.</span>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-space-md items-start">
            {/* Biblioteca de bloques */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
              <h3 className="text-label-md uppercase tracking-widest text-on-surface-variant mb-space-sm">
                Biblioteca de bloques
              </h3>
              <p className="text-body-sm text-on-surface-variant mb-space-md">
                Haz clic en una tarjeta para añadirla o arrástrala al espacio de la derecha.
              </p>
              {BLOCK_TYPES.map((block) => (
                <DraggableBlockButton
                  key={block.type}
                  block={block}
                  onAdd={addBlock}
                />
              ))}
            </div>

            {/* Lienzo de preguntas */}
            <div
              ref={setCanvasNodeRef}
              className={`min-h-32 rounded-xl transition-colors ${isCanvasOver ? "bg-primary-container/10" : ""}`}
            >
              {questions.length === 0 && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl p-space-xl text-center">
                  <span className="material-symbols-outlined text-primary text-[36px]">touch_app</span>
                  <h2 className="text-headline-sm text-on-surface mt-2">Empieza tu encuesta aquí</h2>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Elige una tarjeta de la izquierda. Aparecerá aquí para que puedas editarla.
                  </p>
                </div>
              )}
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {questions.map((q, index) => (
                  <SortableQuestionBlock
                    key={q.id}
                    index={index}
                    question={q}
                    onChange={updateQuestion}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ))}
              </SortableContext>
            </div>
            </div>
          </DndContext>
        </div>
      </main>
    </div>
  );
}