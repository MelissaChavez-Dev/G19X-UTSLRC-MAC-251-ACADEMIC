import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-rules-tests",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users/employee-1"), {
        displayName: "Ana",
        role: "employee",
        mustChangePassword: true,
      }),
      setDoc(doc(db, "users/employee-2"), { displayName: "Luis", role: "employee" }),
      setDoc(doc(db, "users/admin-1"), { displayName: "Admin", role: "admin" }),
      setDoc(doc(db, "users/leader-1"), { displayName: "Líder" }),
      setDoc(doc(db, "responses/response-1"), { enps: 8 }),
      setDoc(doc(db, "teams/team-1"), { memberIds: ["employee-1"] }),
      setDoc(doc(db, "teams/team-1/tasks/task-1"), { title: "Tarea" }),
      setDoc(doc(db, "presenceSummary/employee-1_2026-10-14"), {
        userId: "employee-1",
      }),
      setDoc(doc(db, "leaveRequests/leave-1"), {
        userId: "employee-1",
        status: "pending",
      }),
      setDoc(doc(db, "leaveRequests/leave-review"), {
        userId: "employee-1",
        status: "pending",
      }),
      setDoc(doc(db, "activityLogs/log-1"), { userId: "employee-1", type: "task" }),
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("solo admin puede leer respuestas y ningún cliente las puede escribir", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const employeeDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const response = (db) => doc(db, "responses/response-1");

  await assertSucceeds(getDoc(response(adminDb)));
  await assertFails(getDoc(response(employeeDb)));
  await assertFails(setDoc(doc(employeeDb, "responses/response-2"), { enps: 10 }));
});

test("el perfil privado solo admite lectura propia y el cambio restringido de contraseña", async () => {
  const employeeDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();

  await assertSucceeds(getDoc(doc(employeeDb, "users/employee-1")));
  await assertFails(getDoc(doc(employeeDb, "users/employee-2")));
  await assertSucceeds(updateDoc(doc(employeeDb, "users/employee-1"), {
    mustChangePassword: false,
  }));
  await assertFails(updateDoc(doc(employeeDb, "users/employee-1"), {
    displayName: "Otro nombre",
  }));
});

test("solo los dos roles habilitados pueden crear perfiles públicos", async () => {
  const employeeDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const legacyLeadDb = testEnv.authenticatedContext("leader-1", { role: "team_lead" }).firestore();
  const profile = { displayName: "Ana", photoURL: "", updatedAt: "2026-10-19" };

  await assertSucceeds(setDoc(doc(employeeDb, "publicProfiles/employee-1"), profile));
  await assertFails(setDoc(doc(legacyLeadDb, "publicProfiles/leader-1"), {
    ...profile,
    displayName: "Líder",
  }));
});

test("miembros pueden leer equipos y tareas, pero la escritura del equipo queda bloqueada", async () => {
  const memberDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const otherDb = testEnv.authenticatedContext("employee-2", { role: "employee" }).firestore();

  await assertSucceeds(getDoc(doc(memberDb, "teams/team-1")));
  await assertSucceeds(getDoc(doc(memberDb, "teams/team-1/tasks/task-1")));
  await assertFails(getDoc(doc(otherDb, "teams/team-1")));
  await assertFails(updateDoc(doc(memberDb, "teams/team-1"), { name: "Cambio directo" }));
});

test("las solicitudes de permiso solo se crean mediante Cloud Functions", async () => {
  const employeeDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();

  await assertSucceeds(getDoc(doc(employeeDb, "leaveRequests/leave-1")));
  await assertFails(setDoc(doc(employeeDb, "leaveRequests/leave-2"), {
    userId: "employee-1",
    status: "pending",
  }));
  await assertSucceeds(updateDoc(doc(employeeDb, "leaveRequests/leave-1"), {
    status: "cancelled",
    cancelledAt: "2026-10-14T00:00:00Z",
  }));
});

test("solo se rechazan permisos con motivo de al menos 10 caracteres", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const request = doc(adminDb, "leaveRequests/leave-review");
  const review = {
    status: "rejected",
    reviewedBy: "admin-1",
    reviewedAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  };

  await assertFails(updateDoc(request, review));
  await assertFails(updateDoc(request, { ...review, reviewNote: "No sirve" }));
  await assertSucceeds(updateDoc(request, { ...review, reviewNote: "No procede por ahora" }));
});

test("el resumen de presencia es de solo lectura para su propietario o admin", async () => {
  const ownerDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const otherDb = testEnv.authenticatedContext("employee-2", { role: "employee" }).firestore();
  const adminDb = testEnv.authenticatedContext("admin-1", { role: "admin" }).firestore();
  const summary = (db) => doc(db, "presenceSummary/employee-1_2026-10-14");

  await assertSucceeds(getDoc(summary(ownerDb)));
  await assertFails(getDoc(summary(otherDb)));
  await assertSucceeds(getDoc(summary(adminDb)));
  await assertFails(setDoc(doc(ownerDb, "presenceSummary/other"), { userId: "employee-1" }));
});

test("activityLogs solo admite tipos conocidos y hora del servidor", async () => {
  const employeeDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const validLog = {
    userId: "employee-1",
    type: "login",
    timestamp: serverTimestamp(),
  };

  await assertFails(setDoc(doc(employeeDb, "activityLogs/invalid-type"), {
    ...validLog,
    type: "fake_presence",
  }));
  await assertFails(setDoc(doc(employeeDb, "activityLogs/backdated"), {
    ...validLog,
    timestamp: new Date("2020-01-01T00:00:00Z"),
  }));
  await assertSucceeds(setDoc(doc(employeeDb, "activityLogs/valid"), validLog));
});

test("las tareas requieren campos y tipos válidos", async () => {
  const memberDb = testEnv.authenticatedContext("employee-1", { role: "employee" }).firestore();
  const task = {
    title: "Preparar actividad",
    description: "",
    status: "todo",
    origin: "manual",
    sourceMetric: null,
    createdBy: "employee-1",
    assignedTo: null,
    assignedToIds: [],
    dueDate: null,
    dueTime: null,
    activity: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertFails(setDoc(doc(memberDb, "teams/team-1/tasks/missing-title"), {
    ...task,
    title: 123,
  }));
  await assertFails(setDoc(doc(memberDb, "teams/team-1/tasks/unknown-field"), {
    ...task,
    fakePresence: true,
  }));
  await assertSucceeds(setDoc(doc(memberDb, "teams/team-1/tasks/valid"), task));
});
