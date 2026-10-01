import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTeamTasks } from "../hooks/useTeamTasks";
import { createTask, deleteTask, updateTaskStatus } from "../services/taskService";
import TaskDetailModal from "./TaskDetailModal";

const COLUMNS = [
  {
    id: "todo",
    label: "Por hacer",
    icon: "radio_button_unchecked",
    accent: "bg-surface-container-high",
    text: "text-on-surface",
  },
  {
    id: "in_progress",
    label: "En progreso",
    icon: "progress_activity",
    accent: "bg-tertiary-container",
    text: "text-on-tertiary-container",
  },
  {
    id: "done",
    label: "Hecho",
    icon: "check_circle",
    accent: "bg-secondary-container",
    text: "text-on-secondary-container",
  },
];

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function TaskCard({ task, teamId, readOnly, assigneeName, onOpen }) {
  // El handle es el único elemento arrastrable; el resto de la tarjeta
  // permanece fija (sin transform) mientras el DragOverlay sigue al cursor,
  // evitando la doble silueta y el desfase respecto al puntero.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-surface-container-lowest rounded-lg border border-outline p-space-sm flex flex-col gap-space-xs shadow-sm ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-space-xs">
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar tarea"
            className="text-on-surface-variant hover:text-on-surface cursor-grab active:cursor-grabbing touch-none shrink-0 mt-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-body-sm text-on-surface font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-body-sm text-on-surface-variant leading-snug mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => deleteTask(teamId, task.id)}
            aria-label="Eliminar tarea"
            className="text-on-surface-variant hover:text-error shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-space-xs flex-wrap">
        {task.origin === "ai_recommendation" && (
          <span className="inline-flex items-center gap-1 text-label-sm px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
            Recomendación IA
          </span>
        )}
        {assigneeName && (
          <span
            title={assigneeName}
            className="inline-flex items-center gap-1 text-label-sm px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant"
          >
            <span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px] font-bold shrink-0">
              {initials(assigneeName)}
            </span>
            {assigneeName}
          </span>
        )}
        {(task.comments || []).length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
            {task.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, teamId, readOnly, memberNames, onOpenTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-space-sm rounded-xl border-2 border-dashed border-outline p-space-sm min-h-64 transition-colors ${column.accent} ${
        isOver ? "border-primary ring-2 ring-primary/30" : ""
      }`}
    >
      <div className={`flex items-center gap-space-xs px-space-xs ${column.text}`}>
        <span className="material-symbols-outlined text-[18px]">{column.icon}</span>
        <span className="text-label-md font-semibold">{column.label}</span>
        <span className="text-label-sm ml-auto opacity-80">{tasks.length}</span>
      </div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          teamId={teamId}
          readOnly={readOnly}
          assigneeName={task.assignedTo ? memberNames[task.assignedTo] : null}
          onOpen={onOpenTask}
        />
      ))}
      {tasks.length === 0 && (
        <p className={`text-body-sm text-center py-space-md opacity-70 ${column.text}`}>
          Sin tarjetas
        </p>
      )}
    </div>
  );
}

/**
 * Tablero kanban colaborativo de un equipo.
 * Todos los miembros pueden crear, mover y eliminar tarjetas.
 */
export default function TeamKanban({ teamId, team = null, readOnly = false }) {
  const { tasks, loading } = useTeamTasks(teamId);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const memberNames = team?.memberNames || {};

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask(teamId, { title: newTitle.trim() });
    setNewTitle("");
  }

  function handleDragStart(event) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) || null);
  }

  async function handleDragEnd(event) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = COLUMNS.some((c) => c.id === over.id) ? over.id : null;
    if (!targetStatus) return;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== targetStatus) {
      await updateTaskStatus(teamId, task.id, targetStatus);
    }
  }

  if (loading) {
    return <p className="text-body-md text-on-surface-variant">Cargando tablero...</p>;
  }

  // La tarjeta abierta puede haberse actualizado en Firestore (comentarios, etc.)
  const liveOpenTask = openTask ? tasks.find((t) => t.id === openTask.id) || openTask : null;

  return (
    <div className="flex flex-col gap-space-md">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.status === column.id)}
              teamId={teamId}
              readOnly={readOnly}
              memberNames={memberNames}
              onOpenTask={setOpenTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="bg-surface-container-lowest rounded-lg border border-outline p-space-sm shadow-lg rotate-2 scale-105">
              <p className="text-body-sm text-on-surface font-medium">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!readOnly && (
        <form onSubmit={handleCreate} className="flex gap-space-sm">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nueva tarea para el equipo..."
            className="flex-1 rounded-full bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2.5 text-label-md disabled:opacity-60"
          >
            Agregar
          </button>
        </form>
      )}

      {liveOpenTask && (
        <TaskDetailModal
          teamId={teamId}
          task={liveOpenTask}
          memberNames={memberNames}
          onClose={() => setOpenTask(null)}
        />
      )}
    </div>
  );
}
