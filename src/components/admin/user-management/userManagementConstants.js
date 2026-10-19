export const DAY_OPTIONS = [
  { id: "mon", label: "L", name: "Lunes" },

  { id: "tue", label: "M", name: "Martes" },

  { id: "wed", label: "X", name: "Miércoles" },

  { id: "thu", label: "J", name: "Jueves" },

  { id: "fri", label: "V", name: "Viernes" },

  { id: "sat", label: "S", name: "Sábado" },

  { id: "sun", label: "D", name: "Domingo" },
];

export const ROLE_OPTIONS = [
  { id: "employee", label: "Colaborador" },

  { id: "admin", label: "Administrador" },
];

export const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.id, r.label]));

export const EMPLOYMENT_OPTIONS = [
  { id: "full_time", label: "Tiempo completo" },

  { id: "part_time", label: "Medio tiempo" },

  { id: "temporary", label: "Temporal" },

  { id: "contract", label: "Contrato" },

  { id: "intern", label: "Prácticas" },
];

// Paleta de alto contraste: cada departamento conserva su color aunque cambie el conteo.
export const DEPARTMENT_COLORS = [
  "#4F46E5", // Índigo
  "#0F766E", // Verde azulado
  "#D97706", // Ámbar
  "#DB2777", // Rosa
  "#0284C7", // Azul cielo
  "#7C3AED", // Violeta
  "#65A30D", // Verde
  "#64748B", // Gris azulado
];

export const UNASSIGNED_DEPARTMENT_COLOR = "#94A3B8";

export function getDepartmentColor(departmentId, allDepartments = []) {
  if (departmentId === "unassigned") return UNASSIGNED_DEPARTMENT_COLOR;

  const index = allDepartments.findIndex((department) => department.id === departmentId);

  return DEPARTMENT_COLORS[(index < 0 ? 0 : index) % DEPARTMENT_COLORS.length];
}

export const EMPTY_FORM = {
  displayName: "",

  email: "",

  employeeId: "",

  jobTitle: "",

  employmentType: "full_time",

  hireDate: "",

  role: "employee",

  departmentId: "",

  teamId: "",

  days: ["mon", "tue", "wed", "thu", "fri"],

  startTime: "09:00",

  endTime: "18:00",
};

export const inputClass =
  "w-full rounded-lg bg-surface-container-low border border-outline-variant px-space-md py-2.5 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

export const accountInputClass = inputClass;

export function departmentName(id, departments) {
  return departments.find((department) => department.id === id)?.name || id || "—";
}

export function employeeCode(user) {
  return (
    user.employeeId ||
    `EMP-${String(user.id || "")
      .slice(0, 8)
      .toUpperCase()}`
  );
}

export function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";

  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}
