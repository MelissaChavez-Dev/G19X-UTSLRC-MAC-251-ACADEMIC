import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const departments = [
  { id: "desarrollo-software", name: "Desarrollo de Software", headcount: 25, riskBias: 0.7 },
  { id: "comercial", name: "Comercial", headcount: 12, riskBias: 0.5 },
  { id: "operaciones", name: "Operaciones", headcount: 15, riskBias: 0.4 },
  { id: "capacitacion", name: "Capacitación (TODO Academy)", headcount: 18, riskBias: 0.3 },
  { id: "recursos-humanos", name: "Recursos Humanos", headcount: 8, riskBias: 0.2 },
];

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
  console.log("Creando departamentos...");
  for (const dept of departments) {
    await db.collection("departments").doc(dept.id).set({
      name: dept.name,
      headcount: dept.headcount,
    });
  }

  console.log("Generando respuestas historicas (8 semanas)...");
  let batch = db.batch();
  let count = 0;

  for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - weeksAgo * 7);
    const weekId = getISOWeek(date);

    for (const dept of departments) {
      const responsesThisWeek = Math.floor(dept.headcount * randomBetween(0.6, 0.95));

      for (let i = 0; i < responsesThisWeek; i++) {
        const bias = dept.riskBias;
        const ref = db.collection("responses").doc();

        const sentiment =
          Math.random() < 0.3 + bias * 0.3 ? "negative" :
          Math.random() < 0.6 ? "neutral" : "positive";

        batch.set(ref, {
          departmentId: dept.id,
          weekId,
          submittedAt: Timestamp.fromDate(date),
          workLifeBalance: Math.max(1, Math.min(10, Math.round(randomBetween(8 - bias * 5, 10 - bias * 3)))),
          cognitiveLoad: ["shift-handoff", "emr-integration", "unclear-protocols", "balanced"][
            Math.floor(Math.random() * 4)
          ],
          psychosocialFactors: {
            cognitiveLoad: randomBetween(1.5 + bias * 2, 3 + bias * 2),
            roleAmbiguity: randomBetween(1.5, 3.5),
            emotionalLabor: randomBetween(1.5 + bias * 2, 3 + bias * 2.5),
            shiftFatigue: randomBetween(1.5 + bias * 1.5, 3 + bias * 2),
            autonomy: randomBetween(2, 4 - bias),
            psychSafety: randomBetween(2, 4 - bias),
          },
          enps: Math.max(0, Math.min(10, Math.round(randomBetween(9 - bias * 5, 10)))),
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