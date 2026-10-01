import { httpsCallable } from "firebase/functions";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db, functions } from "./firebase";

/** Crea una cuenta de empleado (solo admin). Devuelve { uid, temporaryPassword }. */
export async function createEmployeeAccount(payload) {
  const callable = httpsCallable(functions, "create_employee_account");
  const result = await callable(payload);
  return result.data;
}

/** Actualiza rol / departamento / equipo / horario / estado de un usuario (solo admin). */
export async function updateUserAccount(uid, payload) {
  const callable = httpsCallable(functions, "update_user_account");
  const result = await callable({ uid, ...payload });
  return result.data;
}

export async function resetUserPassword(uid) {
  const callable = httpsCallable(functions, "reset_user_password");
  const result = await callable({ uid });
  return result.data;
}

export async function deleteUserAccount(uid) {
  const callable = httpsCallable(functions, "delete_user_account");
  const result = await callable({ uid });
  return result.data;
}

/**
 * Bootstrap de la primera cuenta admin: solo funciona si todavía no existe
 * ningún usuario con rol admin en Firestore (migración desde el MVP).
 */
export async function bootstrapAdmin() {
  const callable = httpsCallable(functions, "bootstrap_admin");
  const result = await callable();
  return result.data;
}

/** Une al usuario actual a un equipo mediante su código (joinCode). */
export async function joinTeamByCode(code) {
  const callable = httpsCallable(functions, "join_team_by_code");
  const result = await callable({ code });
  return result.data;
}

/** Crea un equipo nuevo (solo admin). Devuelve { teamId, joinCode }. */
export async function createTeam(payload) {
  const callable = httpsCallable(functions, "create_team");
  const result = await callable(payload);
  return result.data;
}

export async function listUsers() {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("displayName")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listTeams() {
  const snapshot = await getDocs(query(collection(db, "teams"), orderBy("name")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
