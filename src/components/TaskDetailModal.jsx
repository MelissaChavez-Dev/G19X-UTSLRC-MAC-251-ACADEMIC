import { useState } from "react";
import { updateTask, addTaskComment } from "../services/taskService";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

/** Modal de detalle de una tarea del kanban: descripción, responsable y comentarios. */
export default function TaskDetailModal({ teamId, task, memberNames = {}, onClose }) {
  const [description, setDescription] = useState(task.description || "");
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || "");
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateTask(teamId, task.id, { description, assignedTo: assignedTo || null });
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
      await addTaskComment(teamId, task.id, commentText.trim());
      setCommentText("");
    } finally {
      setPostingComment(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-space-md"
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

        <div className="flex flex-col gap-space-xs">
          <label className="text-label-md text-on-surface-variant" htmlFor="task-assignee">
            Responsable
          </label>
          <select
            id="task-assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={inputClass}
          >
            <option value="">Sin asignar</option>
            {Object.entries(memberNames).map(([uid, name]) => (
              <option key={uid} value={uid}>{name}</option>
            ))}
          </select>
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
      </div>
    </div>
  );
}
