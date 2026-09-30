import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { logActivity } from "./activityService";

function taskDoc(teamId, taskId) {
  return doc(db, "teams", teamId, "tasks", taskId);
}

export async function createTask(teamId, {
  title,
  description = "",
  origin = "manual",
  sourceMetric = null,
  assignedTo = null,
}) {
  await addDoc(collection(db, "teams", teamId, "tasks"), {
    title,
    description,
    status: "todo",
    origin,
    sourceMetric,
    createdBy: auth.currentUser?.uid ?? null,
    assignedTo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action");
}

export async function updateTaskStatus(teamId, taskId, status) {
  await updateDoc(taskDoc(teamId, taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action");
}

export async function deleteTask(teamId, taskId) {
  await deleteDoc(taskDoc(teamId, taskId));
  logActivity("kanban_action");
}

/** Actualiza descripción, responsable u otros campos editables de la tarea. */
export async function updateTask(teamId, taskId, updates) {
  await updateDoc(taskDoc(teamId, taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action");
}

/** Agrega un comentario a la tarea (arrayUnion no admite serverTimestamp, se usa Timestamp.now()). */
export async function addTaskComment(teamId, taskId, text) {
  const user = auth.currentUser;
  await updateDoc(taskDoc(teamId, taskId), {
    comments: arrayUnion({
      authorId: user?.uid ?? null,
      authorName: user?.displayName || "Colaborador",
      text,
      createdAt: Timestamp.now(),
    }),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action");
}
