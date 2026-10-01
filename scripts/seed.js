import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const SYNTHETIC_RESPONSES_PER_DEPARTMENT_PER_WEEK = 8;

const openTextSamples = {
  positive: [
    "Buen ambiente de trabajo esta semana",
    "El equipo me apoyo bastante con la carga de trabajo",
    "Me siento escuchado por mi lider",
  ],
  neutral: [
    "Semana normal, sin cambios relevantes",
    "Cumpli con mis pendientes a tiempo",
  ],
  negative: [
    "Demasiadas juntas seguidas sin tiempo de transicion",
    "Poca claridad sobre las prioridades del sprint",
    "Carga de trabajo elevada esta semana",
  ],
};

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function seed() {
  const departmentSnapshot = await db.collection("departments").get();
  const departments = departmentSnapshot.docs
    .filter((department) => department.data().active !== false)
    .map((department) => ({ id: department.id, ...department.data() }));

  if (departments.length === 0) {
    throw new Error("No hay departamentos activos. Agrégalos desde Gestión de Usuarios antes de generar datos sintéticos.");
  }

  console.log(`Generando respuestas sintéticas para ${departments.length} departamentos activos (8 semanas)...`);
  let batch = db.batch();
  let count = 0;

  for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - weeksAgo * 7);
    const weekId = getISOWeek(date);

    for (const dept of departments) {
      const responsesThisWeek = SYNTHETIC_RESPONSES_PER_DEPARTMENT_PER_WEEK;

      for (let i = 0; i < responsesThisWeek; i++) {
        const ref = db.collection("responses").doc();

        const sentiment =
          Math.random() < 0.25 ? "negative" :
          Math.random() < 0.6 ? "neutral" : "positive";

        batch.set(ref, {
          departmentId: dept.id,
          source: "synthetic_seed",
          weekId,
          submittedAt: Timestamp.fromDate(date),
          workLifeBalance: Math.round(randomBetween(3, 10)),
          cognitiveLoad: ["shift-handoff", "emr-integration", "unclear-protocols", "balanced"][
            Math.floor(Math.random() * 4)
          ],
          psychosocialFactors: {
            cognitiveLoad: randomBetween(1.5, 4.5),
            roleAmbiguity: randomBetween(1.5, 3.5),
            emotionalLabor: randomBetween(1.5, 4.5),
            shiftFatigue: randomBetween(1.5, 4.5),
            autonomy: randomBetween(1.5, 4.5),
            psychSafety: randomBetween(1.5, 4.5),
          },
          enps: Math.round(randomBetween(0, 10)),
          openText: openTextSamples[sentiment][
            Math.floor(Math.random() * openTextSamples[sentiment].length)
          ],
        });

        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
          console.log(`  ${count} respuestas escritas...`);
        }
      }
    }
  }

  await batch.commit();
  console.log(`Listo. ${count} respuestas generadas en total.`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});