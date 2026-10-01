import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
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
import { useDepartments } from "../hooks/useDepartments";
import {
  createTemplate,
  saveTemplateQuestions,
  publishTemplate,
  archiveTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  CYCLE_LABELS,
} from "../services/templateService";
import { useSidebarState } from "../hooks/useSidebarState";

const STATUS_LABELS = {
  draft: { label: "Borrador", className: "bg-surface-container-highest text-on-surface-variant" },
  published: { label: "Activa", className: "bg-success-container text-on-success-container" },
  archived: { label: "Archivada", className: "bg-error-container text-on-error-container" },
};

const CYCLE_DESCRIPTIONS = {
  weekly: "Disponible de nuevo cada semana.",
  biweekly: "Disponible de nuevo cada dos semanas.",
  once: "La persona solo puede responder una vez.",
};

const GUIDE_STEPS = [
  { icon: "ads_click", title: "Elige un bloque", text: "Haz clic o arrastra uno desde la biblioteca." },
  { icon: "tune", title: "Configúralo", text: "Escribe la pregunta y define sus opciones." },
  { icon: "send", title: "Publica", text: "Actívala para los departamentos elegidos." },
];

let nextId = 1;

function Icon({ name, size = 18, className = "" }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function IconButton({ icon, label, onClick, tone = "neutral" }) {
  const tones = {
    neutral: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
    danger: "text-error hover:bg-error-container",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`motion-press inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${tones[tone]}`}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}

function StatusPill({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.draft;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-space-sm py-1 text-label-md ${s.className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

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
      className={`group flex w-full select-none items-center gap-3 rounded-xl px-3 py-2.5 text-left touch-none transition-colors hover:bg-surface-container-low ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container transition-colors group-hover:bg-primary group-hover:text-on-primary">
        <Icon name={block.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-md font-semibold text-on-surface">{block.label}</span>
        <span className="block truncate text-body-sm text-on-surface-variant">{block.description}</span>
      </span>
      <Icon name="drag_indicator" size={20} className="shrink-0 text-on-surface-variant/40 group-hover:text-primary" />
    </button>
  );
}

export default function SurveyBuilder() {
  const { templateId: paramId } = useParams();
  const navigate = useNavigate();
  const { collapsed } = useSidebarState();
  const { departments } = useDepartments();

  const [templateId, setTemplateId] = useState(paramId || null);
  const [title, setTitle] = useState("Nueva encuesta");
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadedRouteKey, setLoadedRouteKey] = useState(null);
  const [targetDepartments, setTargetDepartments] = useState([]);
  const [cycle, setCycle] = useState("weekly");
  const [templateList, setTemplateList] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { setNodeRef: setCanvasNodeRef, isOver: isCanvasOver } = useDroppable({ id: "canvas" });

  useEffect(() => {
    async function init() {
      if (!paramId) {
        try {
          setTemplateList(await listTemplates());
        } catch (err) {
          console.error(err);
          setTemplateList([]);
        } finally {
          setLoadingTemplate(false);
          setLoadedRouteKey("list");
        }
        return;
      }

      try {
        const tpl = await getTemplate(paramId);
        if (!tpl) {
          throw new Error("No se encontró la plantilla solicitada.");
        }
        setTitle(tpl.title || "Nueva encuesta");
        setQuestions(tpl.questions || []);
        setTargetDepartments(tpl.targetDepartments || []);
        setCycle(tpl.cycle || "weekly");
      } catch (err) {
        setError(err.message || "No se pudo cargar la plantilla.");
      } finally {
        setLoadingTemplate(false);
        setLoadedRouteKey(paramId);
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
      title: "",
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
    setNotice("");
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
    setNotice("");
    try {
      const id = await ensureTemplateId();
      await saveTemplateQuestions(id, questions, title.trim() || "Nueva encuesta");
      await publishTemplate(id, { targetDepartments, cycle });
      setSavedAt(new Date());
      setNotice("Encuesta publicada. Ya está disponible para los departamentos seleccionados.");
    } catch (err) {
      setError(err.message || "No se pudo publicar la encuesta.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTargetDepartment(deptId) {
    setTargetDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    );
  }

  async function handleCreateNew() {
    const id = await createTemplate("Nueva encuesta");
    navigate(`/survey-builder/${id}`);
  }

  async function handleArchive(id) {
    await archiveTemplate(id);
    setTemplateList(await listTemplates());
  }

  // Eliminación definitiva con diálogo de confirmación
  async function handleDeletePermanent(id, titleText) {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente la encuesta "${titleText}"?\n\nEsta acción no se puede deshacer y borrará toda la configuración.`
    );
    if (!confirmed) return;

    setError("");
    try {
      await deleteTemplate(id);
      setTemplateList((prev) => prev.filter((tpl) => tpl.id !== id));
    } catch (err) {
      setError(err.message || "No se pudo eliminar la plantilla.");
    }
  }

  if (loadingTemplate || loadedRouteKey !== (paramId || "list")) {
    return (
      <div className="app-canvas zone-dashboard min-h-screen flex flex-col items-center justify-center gap-3" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-body-md text-on-surface-variant">Cargando constructor...</p>
      </div>
    );
  }

  const mainClass = `${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`;

  // VISTA DE LISTA DE PLANTILLAS
  if (!paramId && templateList) {
    const counts = {
      published: templateList.filter((t) => t.status === "published").length,
      draft: templateList.filter((t) => (t.status || "draft") === "draft").length,
      archived: templateList.filter((t) => t.status === "archived").length,
    };

    return (
      <div className="app-canvas zone-dashboard min-h-screen">
        <Sidebar />
        <TopBar />
        <main className={mainClass}>
          <div className="mx-auto flex max-w-6xl flex-col gap-space-lg px-space-xl py-space-lg">
            <div className="flex flex-wrap items-end justify-between gap-space-md">
              <div>
                <h1 className="text-headline-xl text-on-surface tracking-tight">Plantillas de encuesta</h1>
                <p className="mt-1 max-w-prose text-body-md text-on-surface-variant">
                  Crea cuestionarios, publícalos por departamento y archiva los que ya no uses.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateNew}
                className="motion-press inline-flex items-center gap-space-xs rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary"
              >
                <Icon name="add" />
                Nueva encuesta
              </button>
            </div>

            {templateList.length > 0 && (
              <div className="flex flex-wrap gap-space-sm">
                {[
                  ["Activas", counts.published],
                  ["Borradores", counts.draft],
                  ["Archivadas", counts.archived],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-28 rounded-xl bg-surface-container-lowest px-space-md py-space-sm">
                    <span className="block text-headline-md leading-tight text-on-surface">{value}</span>
                    <span className="text-body-sm text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container">
                {error}
              </p>
            )}

            {templateList.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center">
                <Icon name="quiz" size={40} className="text-on-surface-variant/50" />
                <p className="mt-2 text-headline-sm text-on-surface">Aún no hay encuestas</p>
                <p className="mx-auto mt-1 max-w-sm text-body-sm text-on-surface-variant">
                  Crea la primera plantilla para empezar a medir a tus equipos.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="motion-press mt-space-md rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary"
                >
                  Crear encuesta
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-space-sm">
                {templateList.map((tpl) => {
                  const targets = tpl.targetDepartments?.length
                    ? tpl.targetDepartments
                        .map((id) => departments.find((d) => d.id === id)?.name || id)
                        .join(", ")
                    : "Todos los departamentos";

                  return (
                    <li
                      key={tpl.id}
                      className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md transition-colors hover:bg-surface-container-low md:flex-row md:items-center"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex min-w-0 items-center gap-space-sm">
                          <StatusPill status={tpl.status} />
                          <h3 className="truncate text-body-lg font-semibold text-on-surface">{tpl.title}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 text-body-sm text-on-surface-variant">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="format_list_bulleted" size={16} />
                            {(tpl.questions || []).length} preguntas
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="update" size={16} />
                            {CYCLE_LABELS[tpl.cycle] || "Semanal"}
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-1" title={targets}>
                            <Icon name="groups" size={16} />
                            <span className="max-w-[260px] truncate">{targets}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/survey-builder/${tpl.id}`)}
                          className="motion-press inline-flex items-center gap-1.5 rounded-full bg-primary-container px-space-md py-2 text-label-md font-semibold text-on-primary-container transition-colors hover:bg-primary hover:text-on-primary"
                        >
                          <Icon name="edit" size={16} />
                          Editar
                        </button>
                        {tpl.status === "published" && (
                          <IconButton icon="archive" label={`Archivar "${tpl.title}"`} onClick={() => handleArchive(tpl.id)} />
                        )}
                        <IconButton
                          icon="delete_forever"
                          label={`Eliminar "${tpl.title}" permanentemente`}
                          tone="danger"
                          onClick={() => handleDeletePermanent(tpl.id, tpl.title)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    );
  }

  // VISTA DE CONSTRUCTOR / EDITOR DE PLANTILLA
  const targetSummary =
    targetDepartments.length === 0
      ? "Sin selección: disponible para todos los departamentos."
      : `Disponible para ${targetDepartments.length} ${targetDepartments.length === 1 ? "departamento seleccionado" : "departamentos seleccionados"}.`;

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={mainClass}>
        <div className="mx-auto flex max-w-7xl flex-col gap-space-md px-space-xl py-space-lg">
          <button
            type="button"
            onClick={() => navigate("/survey-builder")}
            className="motion-press inline-flex items-center gap-1 self-start text-label-md text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="arrow_back" size={17} />
            Todas las encuestas
          </button>

          {/* Título y acciones */}
          <div className="flex flex-col justify-between gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <label htmlFor="survey-title" className="mb-1 block text-label-md font-semibold text-on-surface-variant">
                Nombre de la encuesta
              </label>
              <input
                id="survey-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Pulso de bienestar laboral"
                className="survey-field text-headline-md font-semibold"
              />
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Las personas lo verán al responder.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-space-xs md:items-end">
              <div className="flex items-center gap-space-sm">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="motion-press rounded-full bg-surface-container-high px-space-md py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-highest disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar borrador"}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="motion-press inline-flex items-center gap-1.5 rounded-full bg-primary px-space-md py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
                >
                  <Icon name="send" size={17} />
                  {saving ? "Guardando..." : "Publicar"}
                </button>
              </div>
              <p className="h-5 text-body-sm text-on-surface-variant" role="status">
                {savedAt && !error && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="check_circle" size={16} className="text-success" />
                    Guardado a las {savedAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </p>
            </div>
          </div>

          {notice && (
            <p role="status" className="flex items-center gap-space-xs rounded-xl bg-success-container px-space-md py-space-sm text-body-sm font-semibold text-on-success-container animate-pop">
              <Icon name="check_circle" size={18} />
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container animate-pop">
              {error}
            </p>
          )}

          {/* Audiencia y frecuencia */}
          <section aria-labelledby="survey-audience-heading" className="rounded-2xl bg-surface-container-lowest p-space-lg">
            <h2 id="survey-audience-heading" className="text-headline-sm text-on-surface">Audiencia y frecuencia</h2>
            <p className="mb-space-md mt-1 text-body-sm text-on-surface-variant">
              Define quién recibirá la encuesta y cada cuánto podrá responderla.
            </p>

            <div className="grid grid-cols-1 gap-x-space-xl gap-y-space-lg xl:grid-cols-[1.2fr_1fr]">
              <fieldset className="min-w-0">
                <legend className="text-label-md font-semibold text-on-surface">Departamentos destinatarios</legend>
                <div className="mt-space-sm flex flex-wrap gap-space-xs" role="group" aria-label="Departamentos destinatarios">
                  {departments.map((dept) => {
                    const selected = targetDepartments.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleTargetDepartment(dept.id)}
                        aria-pressed={selected}
                        className="survey-chip motion-press inline-flex items-center gap-1.5 rounded-full px-space-md py-2 text-body-sm font-semibold transition-colors"
                      >
                        {selected && <Icon name="check" size={16} />}
                        {dept.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-space-sm text-body-sm text-on-surface-variant" role="status">{targetSummary}</p>
              </fieldset>

              <fieldset className="min-w-0">
                <legend className="text-label-md font-semibold text-on-surface">Frecuencia de respuesta</legend>
                <div className="mt-space-sm grid w-full max-w-md grid-cols-3 gap-1 rounded-full bg-surface-container-low p-1" role="group" aria-label="Frecuencia de respuesta">
                  {Object.entries(CYCLE_LABELS).map(([id, label]) => {
                    const selected = cycle === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCycle(id)}
                        aria-pressed={selected}
                        className={`motion-press min-w-0 rounded-full px-space-sm py-2 text-center text-body-sm font-semibold transition-colors ${
                          selected
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-space-sm text-body-sm text-on-surface-variant" aria-live="polite">
                  {CYCLE_DESCRIPTIONS[cycle]}
                </p>
              </fieldset>
            </div>
          </section>

          {/* Espacio de trabajo */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 items-start gap-space-md lg:grid-cols-[300px_1fr]">
              <aside className="rounded-2xl bg-surface-container-lowest p-space-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                <div className="px-3 pb-space-sm pt-2">
                  <h3 className="text-label-lg font-semibold text-on-surface">Biblioteca de bloques</h3>
                  <p className="text-body-sm text-on-surface-variant">Haz clic o arrastra al lienzo.</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {BLOCK_TYPES.map((block) => (
                    <DraggableBlockButton key={block.type} block={block} onAdd={addBlock} />
                  ))}
                </div>
              </aside>

              <div className="min-w-0">
                <div className="mb-space-sm flex items-center justify-between px-1">
                  <h3 className="text-label-lg font-semibold text-on-surface">Preguntas</h3>
                  <span className="text-body-sm text-on-surface-variant">
                    {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"}
                  </span>
                </div>

                <div
                  ref={setCanvasNodeRef}
                  className={`min-h-[350px] rounded-2xl p-1 transition-colors ${
                    isCanvasOver ? "bg-primary-container/25 ring-2 ring-primary/40" : ""
                  }`}
                >
                  {questions.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center">
                      <h2 className="text-headline-sm text-on-surface">Empieza a armar tu encuesta</h2>
                      <p className="mx-auto mt-1 max-w-sm text-body-sm text-on-surface-variant">
                        Suelta aquí un bloque de la biblioteca o haz clic en él para agregarlo.
                      </p>
                      <ol className="mt-space-lg grid grid-cols-1 gap-space-sm text-left sm:grid-cols-3">
                        {GUIDE_STEPS.map((step, i) => (
                          <li key={step.title} className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                              <Icon name={step.icon} size={18} />
                            </span>
                            <span>
                              <span className="block text-label-md font-semibold text-on-surface">{i + 1}. {step.title}</span>
                              <span className="block text-body-sm text-on-surface-variant">{step.text}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-space-sm">
                      {questions.map((q, index) => (
                        <SortableQuestionBlock
                          key={q.id}
                          index={index}
                          question={q}
                          onChange={updateQuestion}
                          onRemove={() => removeQuestion(q.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            </div>
          </DndContext>
        </div>
      </main>
    </div>
  );
}