import { useState } from "react";
import { createPortal } from "react-dom";
import { updateTask, addTaskComment } from "../services/taskService";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function formatActivityDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  return date
    ? date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
    : "Hace un momento";
}

/** Modal de detalle de una tarea del kanban: descripción, responsable y comentarios. */
export default function TaskDetailModal({ teamId, task, projectName = "", memberNames = {}, onClose }) {
  const [description, setDescription] = useState(task.description || "");
  const [assignedToIds, setAssignedToIds] = useState(
    task.assignedToIds || (task.assignedTo ? [task.assignedTo] : [])
  );
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [dueTime, setDueTime] = useState(task.dueTime || "");
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateTask(teamId, task.id, {
        description,
        assignedToIds,
        assignedTo: assignedToIds[0] || null,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
      }, { projectName, taskTitle: task.title });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await addTaskComment(teamId, task.id, commentText.trim(), { projectName, taskTitle: task.title });
      setCommentText("");
    } finally {
      setPostingComment(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-space-md"
      onClick={onClose}
    >
      <div
        className="motion-card animate-pop bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-y-auto p-space-lg flex flex-col gap-space-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-space-sm">
          <h2 className="text-headline-sm text-on-surface">{task.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-on-surface-variant hover:text-on-surface shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {task.origin === "ai_recommendation" && (
          <span className="self-start inline-flex items-center gap-1 text-label-sm px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant">
            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
            Recomendación IA
          </span>
        )}

        <div className="flex flex-col gap-space-xs">
          <label className="text-label-md text-on-surface-variant" htmlFor="task-desc">
            Descripción
          </label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Agrega detalles sobre esta tarea..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <fieldset className="flex flex-col gap-space-xs">
          <legend className="text-label-md text-on-surface-variant">Responsables</legend>
          {Object.entries(memberNames).length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Este equipo aún no tiene miembros.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs rounded-xl bg-surface-container-low p-space-sm">
              {Object.entries(memberNames).map(([uid, name]) => (
                <label key={uid} className="flex items-center gap-space-sm rounded-lg px-space-sm py-1.5 text-body-sm text-on-surface hover:bg-surface-container">
                  <input
                    type="checkbox"
                    checked={assignedToIds.includes(uid)}
                    onChange={(event) => setAssignedToIds((current) =>
                      event.target.checked
                        ? [...current, uid]
                        : current.filter((id) => id !== uid)
                    )}
                    className="accent-primary"
                  />
                  {name}
                </label>
              ))}
            </div>
          )}
          <p className="text-label-sm text-on-surface-variant">
            Puedes asignar esta tarea a varias personas.
          </p>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface-variant" htmlFor="task-due-date">
            Fecha de entrega <span className="font-normal">(opcional)</span>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface-variant" htmlFor="task-due-time">
            Hora de entrega <span className="font-normal">(opcional)</span>
            <input
              id="task-due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
              className={`${inputClass} disabled:opacity-50`}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="motion-press rounded-full bg-primary text-on-primary px-space-lg py-2 text-label-md disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="border-t border-outline-variant pt-space-md flex flex-col gap-space-sm">
          <h3 className="text-label-md text-on-surface-variant uppercase tracking-wide">Comentarios</h3>
          <div className="flex flex-col gap-space-sm max-h-52 overflow-y-auto">
            {(task.comments || []).length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Aún no hay comentarios.</p>
            ) : (
              task.comments.map((comment, index) => (
                <div key={index} className="flex gap-space-sm">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center text-label-sm font-semibold shrink-0">
                    {initials(comment.authorName)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-label-md text-on-surface font-semibold">{comment.authorName}</span>
                    <span className="text-body-sm text-on-surface-variant">{comment.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-space-xs">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-full bg-surface-container-low border border-outline-variant px-space-md py-2 text-body-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || postingComment}
              className="motion-press rounded-full bg-secondary text-on-secondary px-space-md py-2 text-label-md disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>

        <div className="border-t border-outline-variant pt-space-md flex flex-col gap-space-sm">
          <h3 className="text-label-md text-on-surface-variant uppercase tracking-wide">Actividad reciente</h3>
          {(task.activity || []).length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Todavía no hay actividad registrada.</p>
          ) : (
            <ol className="flex flex-col gap-space-sm">
              {[...(task.activity || [])].slice(-12).reverse().map((event, index) => (
                <li key={`${event.createdAt?.seconds || index}-${index}`} className="flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-[17px] text-primary mt-0.5">history</span>
                  <div className="min-w-0">
                    <p className="text-body-sm text-on-surface">
                      <strong>{event.actorName || "Colaborador"}</strong> {event.message}
                    </p>
                    <time className="text-label-sm text-on-surface-variant">
                      {formatActivityDate(event.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
