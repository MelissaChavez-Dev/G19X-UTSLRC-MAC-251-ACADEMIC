import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

function slugifyDepartment(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createDepartment(name) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const id = slugifyDepartment(normalizedName);
  if (!id) throw new Error("Escribe un nombre válido para el departamento.");

  const ref = doc(db, "departments", id);
  if ((await getDoc(ref)).exists()) {
    throw new Error("Ya existe un departamento con ese nombre.");
  }

  await setDoc(ref, {
    name: normalizedName,
    createdAt: serverTimestamp(),
  });

  return { id, name: normalizedName };
}

export async function renameDepartment(departmentId, name) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) throw new Error("El nombre del departamento no puede quedar vacío.");

  await setDoc(
    doc(db, "departments", departmentId),
    { name: normalizedName, displayName: normalizedName },
    { merge: true }
  );
}

export function departmentsCollection() {
  return collection(db, "departments");
}

export async function setDepartmentActive(departmentId, active) {
  await updateDoc(doc(db, "departments", departmentId), { active });
}