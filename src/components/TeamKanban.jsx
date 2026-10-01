import { useState } from "react";
import { createPortal } from "react-dom";
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
import {
  createTask,
  createTeamTaskList,
  deleteTask,
  deleteTeamTaskList,
  updateTaskStatus,
  updateTeamTaskList,
} from "../services/taskService";
import TaskDetailModal from "./TaskDetailModal";

const COLUMNS = [
  { id: "todo", label: "Por hacer", icon: "radio_button_unchecked", accent: "bg-surface-container-highest", text: "text-on-surface" },
  { id: "in_progress", label: "En progreso", icon: "progress_activity", accent: "bg-tertiary-container", text: "text-on-tertiary-container" },
  { id: "done", label: "Hecho", icon: "check_circle", accent: "bg-secondary-container", text: "text-on-secondary-container" },
];

const fieldClass =
  "rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

function Icon({ name, size = 18, className = "" }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function dueDateInfo(dueDate, dueTime, status) {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  const [hours = 23, minutes = 59] = (dueTime || "23:59").split(":").map(Number);
  const due = new Date(year, month - 1, day, hours, minutes);
  const daysRemaining = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const dateLabel = due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const timeLabel = dueTime ? ` · ${dueTime}` : "";

  if (status === "done") return { label: `Entregada · ${dateLabel}${timeLabel}`, icon: "task_alt", classes: "bg-success-container text-on-success-container" };
  if (due.getTime() < Date.now()) return { label: `Vencida · ${dateLabel}${timeLabel}`, icon: "error", classes: "bg-error-container text-on-error-container" };
  if (daysRemaining === 0) return { label: "Vence hoy", icon: "schedule", classes: "bg-warning-container text-on-warning-container" };
  if (daysRemaining <= 3) return { label: `Vence en ${daysRemaining} d · ${dateLabel}${timeLabel}`, icon: "schedule", classes: "bg-warning-container text-on-warning-container" };
  return { label: `${dateLabel}${timeLabel}`, icon: "event", classes: "bg-surface-container text-on-surface-variant" };
}

function Avatar({ name }) {
  return (
    <span
      title={name}
      className="-ml-1.5 first:ml-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-bold ring-2 ring-surface-container-lowest"
    >
      {initials(name)}
    </span>
  );
}

// Parte visual de la tarjeta, compartida con el DragOverlay.
function TaskCardBody({ task, assigneeNames, onDelete, floating = false }) {
  const dueInfo = dueDateInfo(task.dueDate, task.dueTime, task.status);
  const commentCount = (task.comments || []).length;
  const hasMeta = dueInfo || task.origin === "ai_recommendation" || commentCount > 0 || assigneeNames.length > 0;

  return (
    <div
      className={`group relative flex flex-col gap-space-sm rounded-lg bg-surface-container-lowest p-space-sm ${
        floating ? "rotate-2 shadow-xl ring-2 ring-primary/40" : "shadow-sm hover:shadow-md transition-shadow"
      }`}
    >
      <div className="pr-6">
        <p className="text-body-sm font-medium leading-snug text-on-surface break-words">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 text-body-sm leading-snug text-on-surface-variant line-clamp-2">{task.description}</p>
        )}
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Eliminar tarea"
          title="Eliminar tarea"
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant opacity-0 transition-opacity hover:bg-error-container hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Icon name="delete" size={16} />
        </button>
      )}

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-space-xs gap-y-1">
          {dueInfo && (
            <span className={`inline-flex items-center gap-1 rounded-md px-space-xs py-0.5 text-label-sm font-semibold ${dueInfo.classes}`}>
              <Icon name={dueInfo.icon} size={13} />
              {dueInfo.label}
            </span>
          )}
          {task.origin === "ai_recommendation" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-tertiary-fixed px-space-xs py-0.5 text-label-sm text-on-tertiary-fixed-variant">
              <Icon name="auto_awesome" size={12} />
              IA
            </span>
          )}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-label-sm text-on-surface-variant" title={`${commentCount} comentarios`}>
              <Icon name="chat_bubble" size={14} />
              {commentCount}
            </span>
          )}
          {assigneeNames.length > 0 && (
            <span className="ml-auto flex items-center pl-1.5">
              {assigneeNames.map((name) => <Avatar key={name} name={name} />)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, teamId, projectName, readOnly, assigneeNames, onOpen }) {
  // Toda la tarjeta es arrastrable (como en Trello). El DragOverlay sigue al
  // cursor y la tarjeta original queda atenuada, sin doble silueta. El umbral
  // de distancia del sensor permite que un clic simple abra el detalle.
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: readOnly,
  });

  function handleDelete() {
    if (window.confirm(`¿Eliminar la tarea «${task.title}»?`)) {
      deleteTask(teamId, task.id, { projectName, taskTitle: task.title });
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      onClick={() => onOpen(task)}
      className={`touch-none ${readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-30" : ""}`}
    >
      <TaskCardBody
        task={task}
        assigneeNames={assigneeNames}
        onDelete={readOnly ? null : handleDelete}
      />
    </div>
  );
}

function ColumnAction({ icon, label, onClick, disabled, tone = "primary", type = "button" }) {
  const hover = tone === "danger" ? "hover:bg-error-container hover:text-error" : "hover:bg-surface-container-highest hover:text-primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors disabled:opacity-40 disabled:pointer-events-none ${hover}`}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

function KanbanColumn({
  column,
  tasks,
  teamId,
  projectName,
  readOnly,
  memberNames,
  onOpenTask,
  onRenameList,
  onDeleteList,
  canDeleteList,
  listBusy,
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(column.label);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  async function handleRename(event) {
    event.preventDefault();
    const saved = await onRenameList(column.id, editLabel);
    if (saved) setEditing(false);
  }

  return (
    <section
      aria-label={`Lista ${column.label}`}
      className={`flex w-[min(18rem,85vw)] shrink-0 snap-start flex-col rounded-xl bg-surface-container p-space-xs transition-shadow ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <header className={`flex items-center gap-space-xs px-space-xs py-space-xs ${column.text}`}>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${column.accent}`}>
          <Icon name={column.icon || "format_list_bulleted"} size={15} />
        </span>
        {editing && !readOnly ? (
          <form onSubmit={handleRename} className="flex min-w-0 flex-1 items-center gap-1">
            <input
              autoFocus
              value={editLabel}
              onChange={(event) => setEditLabel(event.target.value)}
              aria-label={`Nombre de la lista ${column.label}`}
              className="min-w-0 flex-1 rounded-md border border-outline-variant bg-surface-container-lowest px-space-xs py-1 text-body-sm text-on-surface outline-none focus:border-primary"
            />
            <ColumnAction type="submit" icon="check" label="Guardar nombre de lista" disabled={listBusy || !editLabel.trim()} />
            <ColumnAction icon="close" label="Cancelar edición" onClick={() => setEditing(false)} />
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 truncate text-label-lg font-semibold">{column.label}</h3>
            <span className="rounded-full bg-surface-container-highest px-space-xs text-label-sm font-semibold text-on-surface-variant">
              {tasks.length}
            </span>
            {!readOnly && (
              <>
                <ColumnAction
                  icon="edit"
                  label={`Editar lista ${column.label}`}
                  disabled={listBusy}
                  onClick={() => {
                    setEditLabel(column.label);
                    setEditing(true);
                  }}
                />
                <ColumnAction
                  icon="delete"
                  tone="danger"
                  label={tasks.length ? "Mueve o elimina las tareas para borrar esta lista" : canDeleteList ? `Eliminar lista ${column.label}` : "El tablero debe conservar al menos una lista"}
                  disabled={!canDeleteList || listBusy}
                  onClick={() => onDeleteList(column)}
                />
              </>
            )}
          </>
        )}
      </header>

      <div ref={setNodeRef} className="flex min-h-24 max-h-[calc(100vh-20rem)] flex-1 flex-col gap-space-xs overflow-y-auto px-1 pb-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            teamId={teamId}
            projectName={projectName}
            readOnly={readOnly}
            assigneeNames={(task.assignedToIds || (task.assignedTo ? [task.assignedTo] : []))
              .map((uid) => memberNames[uid])
              .filter(Boolean)}
            onOpen={onOpenTask}
          />
        ))}
        {tasks.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-outline-variant px-space-sm py-space-md text-center text-body-sm text-on-surface-variant">
            {readOnly ? "Sin tarjetas" : "Suelta aquí una tarjeta"}
          </p>
        )}
      </div>
    </section>
  );
}

function AddListColumn({ teamId, creating, error, value, onChange, onSubmit }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="motion-press flex h-12 w-[min(18rem,85vw)] shrink-0 snap-start items-center gap-space-xs rounded-xl bg-surface-container-low px-space-md text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon name="add" />
        Añadir otra lista
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        await onSubmit(e);
      }}
      className="flex w-[min(18rem,85vw)] shrink-0 snap-start flex-col gap-space-xs rounded-xl bg-surface-container p-space-sm"
    >
      <label htmlFor={`new-task-list-${teamId}`} className="sr-only">Nombre de la lista</label>
      <input
        id={`new-task-list-${teamId}`}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nombre de la lista"
        className={`${fieldClass} w-full`}
      />
      <div className="flex items-center gap-space-xs">
        <button
          type="submit"
          disabled={!value.trim() || creating}
          className="motion-press rounded-full bg-primary px-space-md py-1.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
        >
          {creating ? "Agregando..." : "Agregar lista"}
        </button>
        <ColumnAction icon="close" label="Cancelar" onClick={() => setOpen(false)} />
      </div>
      {error && <p role="alert" className="text-body-sm text-error">{error}</p>}
    </form>
  );
}

/**
 * Tablero kanban colaborativo de un equipo.
 * Todos los miembros pueden crear, mover y eliminar tarjetas.
 */
export default function TeamKanban({ teamId, team = null, readOnly = false }) {
  const { tasks, loading } = useTeamTasks(teamId);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [savingListId, setSavingListId] = useState(null);
  const [listError, setListError] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const memberNames = team?.memberNames || {};
  const columns = team?.taskLists?.length ? team.taskLists : COLUMNS;

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask(teamId, {
      title: newTitle.trim(),
      projectName: team?.name || "",
      dueDate: newDueDate || null,
      dueTime: newDueDate ? newDueTime || null : null,
    });
    setNewTitle("");
    setNewDueDate("");
    setNewDueTime("");
  }

  async function handleCreateList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreatingList(true);
    setListError("");
    try {
      await createTeamTaskList(teamId, newListName);
      setNewListName("");
    } catch (error) {
      setListError(error?.message || "No se pudo agregar la lista.");
    } finally {
      setCreatingList(false);
    }
  }

  async function handleRenameList(listId, label) {
    const normalizedLabel = label.trim();
    const currentList = columns.find((column) => column.id === listId);
    if (!normalizedLabel || !currentList) return false;
    if (normalizedLabel === currentList.label) return true;
    setListError("");
    setSavingListId(listId);
    try {
      await updateTeamTaskList(teamId, listId, normalizedLabel);
      return true;
    } catch (error) {
      setListError(error?.message || "No se pudo editar la lista.");
      return false;
    } finally {
      setSavingListId(null);
    }
  }

  async function handleDeleteList(column) {
    const taskCount = tasks.filter((task) => (task.status || "todo") === column.id).length;
    if (taskCount || columns.length <= 1) return;
    if (!window.confirm(`¿Eliminar la lista «${column.label}»? Esta acción no se puede deshacer.`)) return;
    setListError("");
    setSavingListId(column.id);
    try {
      await deleteTeamTaskList(teamId, column.id);
    } catch (error) {
      setListError(error?.message || "No se pudo eliminar la lista.");
    } finally {
      setSavingListId(null);
    }
  }

  function handleDragStart(event) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) || null);
  }

  async function handleDragEnd(event) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = columns.some((column) => column.id === over.id) ? over.id : null;
    if (!targetStatus) return;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== targetStatus) {
      await updateTaskStatus(teamId, task.id, targetStatus, {
        projectName: team?.name || "",
        taskTitle: task.title,
        fromStatus: task.status || "todo",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex gap-space-md overflow-hidden" role="status" aria-label="Cargando tablero">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-xl bg-surface-container" />
        ))}
      </div>
    );
  }

  // La tarjeta abierta puede haberse actualizado en Firestore (comentarios, etc.)
  const liveOpenTask = openTask ? tasks.find((t) => t.id === openTask.id) || openTask : null;
  const overlayAssignees = activeTask
    ? (activeTask.assignedToIds || (activeTask.assignedTo ? [activeTask.assignedTo] : []))
        .map((uid) => memberNames[uid])
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-space-md">
      {/* Captura rápida de tarea */}
      {!readOnly && (
        <form onSubmit={handleCreate} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Icon name="add_task" /></span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nueva tarea para el equipo..."
              aria-label="Título de la nueva tarea"
              className={`${fieldClass} w-full py-2.5 pl-10 text-body-md`}
            />
          </div>
          <div className="flex gap-space-xs">
            <label className="sr-only" htmlFor={`new-task-due-${teamId}`}>Fecha de entrega</label>
            <input
              id={`new-task-due-${teamId}`}
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              aria-label="Fecha de entrega opcional"
              title="Fecha de entrega opcional"
              className={`${fieldClass} min-w-0`}
            />
            <label className="sr-only" htmlFor={`new-task-time-${teamId}`}>Hora de entrega</label>
            <input
              id={`new-task-time-${teamId}`}
              type="time"
              value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
              disabled={!newDueDate}
              aria-label="Hora de entrega opcional"
              title="Hora de entrega opcional"
              className={`${fieldClass} w-32 disabled:opacity-40`}
            />
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="motion-press rounded-full bg-primary px-space-lg py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-60"
          >
            Agregar
          </button>
        </form>
      )}

      {listError && readOnly && <p role="alert" className="text-body-sm text-error">{listError}</p>}

      {/* Tablero: listas con scroll horizontal */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
        <div className="-mx-1 flex snap-x items-start gap-space-md overflow-x-auto px-1 pb-space-sm">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={{ ...column, accent: column.accent || "bg-surface-container-highest", text: column.text || "text-on-surface" }}
              tasks={tasks.filter((task) => (task.status || "todo") === column.id)}
              teamId={teamId}
              projectName={team?.name || ""}
              readOnly={readOnly}
              memberNames={memberNames}
              onOpenTask={setOpenTask}
              onRenameList={handleRenameList}
              onDeleteList={handleDeleteList}
              canDeleteList={columns.length > 1 && !tasks.some((task) => (task.status || "todo") === column.id)}
              listBusy={savingListId === column.id}
            />
          ))}
          {!readOnly && (
            <AddListColumn
              teamId={teamId}
              creating={creatingList}
              error={listError}
              value={newListName}
              onChange={setNewListName}
              onSubmit={handleCreateList}
            />
          )}
        </div>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="pointer-events-none w-[min(18rem,75vw)] cursor-grabbing">
                <TaskCardBody task={activeTask} assigneeNames={overlayAssignees} floating />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {liveOpenTask && (
        <TaskDetailModal
          teamId={teamId}
          task={liveOpenTask}
          projectName={team?.name || ""}
          memberNames={memberNames}
          onClose={() => setOpenTask(null)}
        />
      )}
    </div>
  );
}