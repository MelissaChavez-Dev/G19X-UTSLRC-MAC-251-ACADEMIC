import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Contenido                                                           */
/* Los títulos se mantienen en inglés porque coinciden con las          */
/* plantillas del reporte (HR_TEMPLATES); las descripciones están en    */
/* español para explicar qué responde cada módulo.                     */
/* ------------------------------------------------------------------ */
const GROUPS = [
  {
    id: "conocer",
    label: "Conocer la plantilla",
    startIndex: 12, // el anillo empieza en la etapa 13 y llega hasta la 5
    count: 6,
    ring: "text-primary",
    dot: "bg-primary",
    badge: "bg-primary text-on-primary",
  },
  {
    id: "ingreso",
    label: "Ingreso y desempeño",
    startIndex: 5,
    count: 4,
    ring: "text-primary-container",
    dot: "bg-primary-container",
    badge: "bg-primary-container text-on-primary-container",
  },
  {
    id: "salida",
    label: "Salida y riesgo",
    startIndex: 9,
    count: 3,
    ring: "text-on-surface-variant/60",
    dot: "bg-on-surface-variant/60",
    badge: "bg-surface-container-high text-on-surface",
  },
];

const STAGES = [
  { id: 1, title: "Recursos Humanos de un vistazo", icon: "dashboard", group: "conocer", desc: "Plantilla, contrataciones y bajas del año en una vista" },
  { id: 2, title: "Análisis demográfico", icon: "badge", group: "conocer", desc: "Edad, antigüedad, tipo de contratación y regiones" },
  { id: 3, title: "Análisis de diversidad", icon: "diversity_3", group: "conocer", desc: "Género, generaciones y educación por nivel y unidad" },
  { id: 4, title: "Perfil del empleado", icon: "account_circle", group: "conocer", desc: "Ficha individual con licencias y desempeño" },
  { id: 5, title: "Historial y tendencias", icon: "timeline", group: "conocer", desc: "Cómo cambia la plantilla mes a mes y año a año" },
  { id: 6, title: "Nuevas contrataciones", icon: "person_add", group: "ingreso", desc: "Quién ingresa, cuándo y a qué unidad" },
  { id: 7, title: "Evaluación frente a expectativas", icon: "rate_review", group: "ingreso", desc: "Desempeño frente a lo esperado, por edad y antigüedad" },
  { id: 8, title: "Ausentismo", icon: "event_busy", group: "ingreso", desc: "Ausentismo por turno, género y departamento" },
  { id: 9, title: "Licencias por departamento", icon: "beach_access", group: "ingreso", desc: "Licencias anuales y por enfermedad por departamento" },
  { id: 10, title: "Perfil de bajas", icon: "person_remove", group: "salida", desc: "Quién se va y por qué motivo" },
  { id: 11, title: "Análisis de rotación", icon: "logout", group: "salida", desc: "Rotación voluntaria e involuntaria en el tiempo" },
  { id: 12, title: "Predicción de rotación", icon: "psychology", group: "salida", desc: "Empleados con mayor riesgo de salir" },
  { id: 13, title: "Perfil del departamento", icon: "domain", group: "conocer", desc: "Resumen de cada departamento en una sola vista" },
];

const groupById = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

/* ------------------------------------------------------------------ */
/* Geometría de la órbita. Todo vive en las coordenadas del viewBox,    */
/* así el anillo, las líneas y los botones siempre quedan alineados.   */
/* ------------------------------------------------------------------ */
const W = 1500;
const H = 680;
const CX = W / 2;
const CY = H / 2;
const RING_R = 200;
const RING_STROKE = 56;
const ORBIT_RX = W * 0.43;
const ORBIT_RY = H * 0.43;
const STEP = 360 / STAGES.length;
const rad = (deg) => (deg * Math.PI) / 180;
const angleOf = (index) => -90 + STEP * index;

function polar(angle, r) {
  return [CX + r * Math.cos(rad(angle)), CY + r * Math.sin(rad(angle))];
}

function arcPath(startAngle, endAngle, r) {
  const [x1, y1] = polar(startAngle, r);
  const [x2, y2] = polar(endAngle, r);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function groupArc(group) {
  const gap = 2.4;
  const start = angleOf(group.startIndex) - STEP / 2 + gap / 2;
  const end = angleOf(group.startIndex) + STEP * (group.count - 1) + STEP / 2 - gap / 2;
  return arcPath(start, end, RING_R);
}

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */
function OrbitStage({ stage, index, onSelect, onFocusGroup }) {
  const group = groupById[stage.group];
  const a = rad(angleOf(index));
  return (
    <div
      className="absolute z-20 w-[clamp(8.5rem,14cqw,12.5rem)] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${50 + Math.cos(a) * 43}%`, top: `${50 + Math.sin(a) * 43}%` }}
    >
      <motion.button
        type="button"
        title={stage.desc}
        aria-label={`${stage.id}. ${stage.title}. ${stage.desc}`}
        onClick={() => onSelect(stage.id)}
        onMouseEnter={() => onFocusGroup(stage.group)}
        onMouseLeave={() => onFocusGroup(null)}
        onFocus={() => onFocusGroup(stage.group)}
        onBlur={() => onFocusGroup(null)}
        whileTap={{ scale: 0.97 }}
        className={`flex w-full items-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest py-1.5 pl-1.5 pr-3 text-left shadow-xs transition-colors hover:border-primary ${FOCUS}`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${group.badge}`}>
          {stage.id}
        </span>
        <span className="text-[11px] font-semibold leading-tight text-on-surface xl:text-xs">{stage.title}</span>
      </motion.button>
    </div>
  );
}

function ListStage({ stage, onSelect }) {
  const group = groupById[stage.group];
  return (
    <button
      type="button"
      onClick={() => onSelect(stage.id)}
      className={`flex w-full items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-md text-left transition-colors hover:border-primary ${FOCUS}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${group.badge}`}>
        {stage.id}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-on-surface">{stage.title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-on-surface-variant">{stage.desc}</span>
      </span>
      <span className="material-symbols-outlined shrink-0 text-[22px] text-on-surface-variant" aria-hidden="true">
        {stage.icon}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla                                                            */
/* ------------------------------------------------------------------ */
export default function LifeCycleScreen({ onSelectScreen }) {
  const [focusGroup, setFocusGroup] = useState(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="@container flex w-full flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-x-space-lg gap-y-2 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-space-md py-space-sm">
        <p className="text-body-sm text-on-surface-variant">
          Elige un módulo para abrir su reporte. El color agrupa los módulos por etapa del ciclo.
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Etapas del ciclo">
          {GROUPS.map((g) => (
            <li key={g.id} className="flex items-center gap-1.5 text-label-sm text-on-surface">
              <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} aria-hidden="true" />
              {g.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Órbita: solo cuando el contenedor es lo bastante ancho para que las etiquetas no se encimen */}
      <section
        aria-label="Módulos del ciclo de vida del empleado"
        className="relative mx-auto hidden w-full max-w-[1500px] @5xl:block"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {STAGES.map((stage, index) => {
            const group = groupById[stage.group];
            const a = angleOf(index);
            const [x1, y1] = polar(a, RING_R + RING_STROKE / 2 + 4);
            const x2 = CX + Math.cos(rad(a)) * ORBIT_RX;
            const y2 = CY + Math.sin(rad(a)) * ORBIT_RY;
            const dim = focusGroup && focusGroup !== group.id;
            return (
              <g key={stage.id} className={`${group.ring} transition-opacity duration-200`} style={{ opacity: dim ? 0.2 : 1 }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="text-outline-variant" stroke="currentColor" strokeWidth="1.5" />
                <circle cx={x1} cy={y1} r="5" fill="currentColor" />
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={RING_R} fill="none" className="text-surface-container-high" stroke="currentColor" strokeWidth={RING_STROKE} />

          {GROUPS.map((group, i) => {
            const dim = focusGroup && focusGroup !== group.id;
            return (
              <motion.path
                key={group.id}
                d={groupArc(group)}
                fill="none"
                stroke="currentColor"
                strokeWidth={RING_STROKE}
                className={group.ring}
                initial={reduceMotion ? false : { pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: dim ? 0.25 : 1 }}
                transition={{
                  pathLength: { duration: 0.9, delay: i * 0.18, ease: "easeOut" },
                  opacity: { duration: 0.2 },
                }}
              />
            );
          })}
        </svg>

        <div className="absolute left-1/2 top-1/2 z-10 w-[clamp(9rem,17cqw,13rem)] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[clamp(1.1rem,2.4cqw,1.75rem)] font-semibold leading-tight text-on-surface">
            Ciclo de vida
            <br />
            del empleado
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{STAGES.length} módulos</p>
        </div>

        {STAGES.map((stage, index) => (
          <OrbitStage
            key={stage.id}
            stage={stage}
            index={index}
            onSelect={onSelectScreen}
            onFocusGroup={setFocusGroup}
          />
        ))}
      </section>

      {/* Lista agrupada para contenedores angostos */}
      <div className="flex flex-col gap-space-md @5xl:hidden">
        {GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`lc-group-${group.id}`}>
            <h3
              id={`lc-group-${group.id}`}
              className="mb-2 flex items-center gap-2 text-label-lg font-semibold text-on-surface"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} aria-hidden="true" />
              {group.label}
            </h3>
            <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
              {STAGES.filter((s) => s.group === group.id).map((stage) => (
                <ListStage key={stage.id} stage={stage} onSelect={onSelectScreen} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}