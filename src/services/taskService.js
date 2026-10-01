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
import { functions } from "./firebase";
import { logActivity } from "./activityService";
import { httpsCallable } from "firebase/functions";

function taskDoc(teamId, taskId) {
  return doc(db, "teams", teamId, "tasks", taskId);
}

function activityEvent(type, message) {
  const user = auth.currentUser;
  return {
    type,
    message,
    actorId: user?.uid ?? null,
    actorName: user?.displayName || "Colaborador",
    createdAt: Timestamp.now(),
  };
}

export async function createTask(teamId, {
  title,
  description = "",
  origin = "manual",
  sourceMetric = null,
  assignedTo = null,
  assignedToIds = null,
  dueDate = null,
  dueTime = null,
  projectName = "",
}) {
  const assignees = assignedToIds || (assignedTo ? [assignedTo] : []);
  await addDoc(collection(db, "teams", teamId, "tasks"), {
    title,
    description,
    status: "todo",
    origin,
    sourceMetric,
    createdBy: auth.currentUser?.uid ?? null,
    assignedTo: assignees[0] || null,
    assignedToIds: assignees,
    dueDate: dueDate || null,
    dueTime: dueTime || null,
    activity: [activityEvent("created", "Creó la tarea")],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action", {
    action: "task_created",
    projectId: teamId,
    projectName,
    taskTitle: title,
  });
}

export async function updateTaskStatus(teamId, taskId, status, { projectName = "", taskTitle = "", fromStatus = "" } = {}) {
  const labels = { todo: "Por hacer", in_progress: "En progreso", done: "Hecho" };
  await updateDoc(taskDoc(teamId, taskId), {
    status,
    activity: arrayUnion(activityEvent("status", `Movió la tarea a «${labels[status] || status}»`)),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action", {
    action: "task_moved",
    projectId: teamId,
    projectName,
    taskId,
    taskTitle,
    fromStatus: labels[fromStatus] || fromStatus,
    toStatus: labels[status] || status,
  });
}

export async function deleteTask(teamId, taskId, { projectName = "", taskTitle = "" } = {}) {
  await deleteDoc(taskDoc(teamId, taskId));
  logActivity("kanban_action", { action: "task_deleted", projectId: teamId, projectName, taskId, taskTitle });
}

/** Actualiza descripción, responsable u otros campos editables de la tarea. */
export async function updateTask(teamId, taskId, updates, { projectName = "", taskTitle = "" } = {}) {
  await updateDoc(taskDoc(teamId, taskId), {
    ...updates,
    activity: arrayUnion(activityEvent("updated", "Actualizó los detalles de la tarea")),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action", { action: "task_updated", projectId: teamId, projectName, taskId, taskTitle });
}

/** Agrega un comentario a la tarea (arrayUnion no admite serverTimestamp, se usa Timestamp.now()). */
export async function addTaskComment(teamId, taskId, text, { projectName = "", taskTitle = "" } = {}) {
  const user = auth.currentUser;
  await updateDoc(taskDoc(teamId, taskId), {
    comments: arrayUnion({
      authorId: user?.uid ?? null,
      authorName: user?.displayName || "Colaborador",
      text,
      createdAt: Timestamp.now(),
    }),
    activity: arrayUnion(activityEvent("comment", "Añadió un comentario")),
    updatedAt: serverTimestamp(),
  });
  logActivity("kanban_action", { action: "task_comment_added", projectId: teamId, projectName, taskId, taskTitle });
}

export async function createTeamTaskList(teamId, name) {
  if (!name.trim()) throw new Error("Escribe el nombre de la lista.");
  const callable = httpsCallable(functions, "create_team_task_list");
  const result = await callable({ teamId, name });
  return result.data;
}

export async function updateTeamTaskList(teamId, listId, name) {
  if (!name.trim()) throw new Error("Escribe el nombre de la lista.");
  const callable = httpsCallable(functions, "update_team_task_list");
  const result = await callable({ teamId, listId, name });
  return result.data;
}

export async function deleteTeamTaskList(teamId, listId) {
  const callable = httpsCallable(functions, "delete_team_task_list");
  const result = await callable({ teamId, listId });
  return result.data;
}
