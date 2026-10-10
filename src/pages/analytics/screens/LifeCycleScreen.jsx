import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const STAGES = [
  { id: 1, title: "HR at a Glance", icon: "dashboard" },
  { id: 2, title: "Demographic Analysis", icon: "badge" },
  { id: 3, title: "Diversity Analysis", icon: "diversity_3" },
  { id: 4, title: "Employee Profile", icon: "account_circle" },
  { id: 5, title: "Historical & Trends", icon: "timeline" },
  { id: 6, title: "New Starters", icon: "person_add" },
  { id: 7, title: "Expectation Rating", icon: "rate_review" },
  { id: 8, title: "Absenteeism", icon: "event_busy" },
  { id: 9, title: "Department Leave Analysis", icon: "beach_access" },
  { id: 10, title: "Termination Profile", icon: "person_remove" },
  { id: 11, title: "Attrition Analysis", icon: "logout" },
  { id: 12, title: "Attrition Prediction", icon: "psychology" },
  { id: 13, title: "Department Profile", icon: "domain" },
];

function getOrbitPosition(index) {
  const angle = (-90 + (360 * index) / STAGES.length) * (Math.PI / 180);
  return {
    left: `${50 + Math.cos(angle) * 43}%`,
    top: `${50 + Math.sin(angle) * 43}%`,
  };
}

function StageButton({ stage, onClick, className = "", style }) {
  return (
    <div className={className} style={style}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3, scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center gap-2 border border-[#e2e2e2] bg-white px-2.5 py-2 text-left shadow-[0_5px_12px_rgba(0,0,0,0.16)] transition-colors hover:border-[#e2bd00]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#edc400] bg-[#fff8d9] text-[11px] font-bold text-[#3e3721]">
          {stage.id}
        </span>
        <span className="material-symbols-outlined hidden shrink-0 text-[#8a8a8a] sm:block" aria-hidden="true">
          {stage.icon}
        </span>
        <span className="text-[11px] font-semibold leading-tight text-[#333] sm:text-xs">{stage.title}</span>
      </motion.button>
    </div>
  );
}

export default function LifeCycleScreen({ onSelectScreen }) {
  return (
    <div className="flex w-full flex-col gap-3">
      <section className="border-b-2 border-[#e8bf00] bg-gradient-to-r from-[#f5f5f5] to-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black tracking-tight text-[#d2ad00]">HR</span>
          <div className="border-l-2 border-[#e8bf00] pl-3">
            <h2 className="text-3xl font-normal tracking-tight text-[#222] sm:text-4xl">HR Analytics</h2>
            <p className="text-xs text-[#777]">Employee Life Cycle · explora un módulo para abrir su reporte interactivo</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/analytics/import"
            className="inline-flex items-center gap-1 border border-[#c9c9c9] bg-white px-3 py-2 text-xs font-medium text-[#444] hover:bg-[#fafafa]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">upload_file</span>
            Importar datos HR
          </Link>
        </div>
      </section>

      <section aria-label="Módulos del ciclo de vida de empleados">
        <div className="relative mx-auto hidden h-[680px] w-full max-w-[1500px] overflow-hidden lg:block">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1500 680" aria-hidden="true">
            <circle cx="750" cy="340" r="258" fill="none" stroke="#676767" strokeWidth="78" />
            <path d="M 553 492 A 258 258 0 0 1 820 94" fill="none" stroke="#edc400" strokeWidth="50" />
            <path d="M 900 105 A 258 258 0 0 1 551 494" fill="none" stroke="#979797" strokeWidth="18" />
          </svg>
          <div className="absolute left-1/2 top-1/2 z-10 flex h-44 w-56 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center bg-white/90 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d0aa00]">Talent Intelligence</span>
            <h3 className="mt-2 text-3xl font-medium leading-tight text-[#555]">Employee<br />Life Cycle</h3>
            <span className="mt-2 text-[11px] text-[#888]">13 interactivos · sin métricas salariales</span>
          </div>
          {STAGES.map((stage, index) => (
            <StageButton
              key={stage.id}
              stage={stage}
              onClick={() => onSelectScreen(stage.id)}
              className="absolute z-20 w-[205px] -translate-x-1/2 -translate-y-1/2"
              style={getOrbitPosition(index)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden">
          {STAGES.map((stage) => (
            <StageButton
              key={stage.id}
              stage={stage}
              onClick={() => onSelectScreen(stage.id)}
              className="w-full"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
