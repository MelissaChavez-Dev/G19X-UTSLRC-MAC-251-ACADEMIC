/**
 * HR Analytics Constants, Catalogs and Derived Field Calculators.
 * Prohibits any salary or financial attributes per system specification.
 */

export const GENDERS = ["Male", "Female", "Other"];
export const ORG_LEVELS = ["Operational", "Mid-Level", "High-Level"];
export const HIRE_TYPES = ["Regular", "Contract"];
export const EMPLOYEE_STATUSES = ["Active", "Terminated"];
export const SHIFTS = ["Day", "Evening", "Night"];
export const PERFORMANCE_RATINGS = [
  "Minimum Acceptable",
  "Met",
  "Ideal",
  "Exceeded Expectation",
];

export const TERMINATION_CATEGORIES = ["Voluntary", "Involuntary", "Death"];

export const TERMINATION_REASONS = {
  Voluntary: [
    "Better Opportunity",
    "Relocation",
    "Career Change",
    "Personal Reasons",
    "Retirement",
    "Work-Life Balance",
  ],
  Involuntary: [
    "Poor Conduct",
    "Poor Performance",
    "Punctuality",
    "Company Restructure",
    "Redundancy",
  ],
  Death: ["Deceased"],
};

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];

export const EDUCATION_LEVELS = [
  "High School",
  "Technical Diploma",
  "Bachelor's",
  "Master's",
  "Doctorate",
];

export const REGIONS = ["North", "South", "East", "West", "Central"];

export const LOCATIONS = [
  { city: "Monterrey", region: "North", country: "Mexico" },
  { city: "Tijuana", region: "North", country: "Mexico" },
  { city: "Guadalajara", region: "West", country: "Mexico" },
  { city: "CDMX", region: "Central", country: "Mexico" },
  { city: "Querétaro", region: "Central", country: "Mexico" },
  { city: "Puebla", region: "East", country: "Mexico" },
  { city: "Mérida", region: "South", country: "Mexico" },
];

export const BUSINESS_UNITS = [
  {
    name: "Technology",
    departments: [
      { name: "Software Engineering", designations: ["Frontend Dev", "Backend Dev", "DevOps Engineer", "Tech Lead", "Engineering Director"] },
      { name: "Product & Design", designations: ["UI/UX Designer", "Product Owner", "Product Manager", "Design Lead"] },
      { name: "Cybersecurity", designations: ["Security Analyst", "SecOps Specialist", "Cybersecurity Director"] },
      { name: "IT Operations", designations: ["IT Support Specialist", "System Admin", "Infrastructure Lead"] },
    ],
  },
  {
    name: "Operations",
    departments: [
      { name: "Customer Support", designations: ["Support Agent", "Senior Support Specialist", "Support Supervisor", "Support Manager"] },
      { name: "Field Operations", designations: ["Field Technician", "Operations Coordinator", "Field Manager"] },
      { name: "Quality Assurance", designations: ["QA Analyst", "QA Lead", "Compliance Auditor"] },
    ],
  },
  {
    name: "Commercial",
    departments: [
      { name: "Sales", designations: ["Sales Executive", "Account Executive", "Sales Manager", "Sales VP"] },
      { name: "Marketing", designations: ["Marketing Specialist", "Growth Lead", "Brand Strategist", "Marketing Director"] },
      { name: "Account Management", designations: ["Client Success Rep", "Senior Account Manager", "Client Director"] },
    ],
  },
  {
    name: "Corporate",
    departments: [
      { name: "Human Resources", designations: ["People Ops Specialist", "Talent Acquisition Lead", "HR Business Partner", "HR Director"] },
      { name: "Finance", designations: ["Financial Analyst", "Accountant", "Finance Manager", "Controller"] },
      { name: "Legal & Compliance", designations: ["Legal Counsel", "Compliance Officer", "Chief Legal Counsel"] },
    ],
  },
  {
    name: "Logistics",
    departments: [
      { name: "Supply Chain", designations: ["Supply Planner", "Procurement Specialist", "Supply Chain Lead"] },
      { name: "Warehouse", designations: ["Warehouse Associate", "Inventory Lead", "Warehouse Supervisor"] },
      { name: "Distribution", designations: ["Logistics Coordinator", "Fleet Manager", "Distribution Director"] },
    ],
  },
];

export const NATIVE_COUNTRIES = [
  "Mexico",
  "Colombia",
  "Argentina",
  "Chile",
  "Spain",
  "United States",
  "Peru",
];

export const LEAVE_TYPES = ["Annual", "Sick"];

export const AGE_BANDS = ["<30", "30-40", "40-50", ">50"];
export const TENURE_BANDS = ["0-1", "1-3", "3-5", "5+"];
export const GENERATIONS = ["Baby Boomers", "Gen X", "Gen Y", "Gen Z"];
export const RISK_LEVELS = ["Low", "Medium", "Peak"];

export const PROHIBITED_SALARY_KEYWORDS = [
  "salary",
  "pay",
  "income",
  "wage",
  "compensation",
  "encashment",
  "remuneration",
  "basepay",
  "grosssalary",
  "netsalary",
  "sueldo",
  "salario",
  "remuneracion",
  "nomina",
];

/**
 * Checks whether an object contains any prohibited salary or financial fields.
 * Throws an Error if found.
 */
export function assertNoSalaryFields(obj) {
  if (!obj || typeof obj !== "object") return;
  const keys = Object.keys(obj);
  for (const key of keys) {
    const normalized = key.toLowerCase().replace(/[_\-\s]/g, "");
    if (PROHIBITED_SALARY_KEYWORDS.some((kw) => normalized.includes(kw))) {
      throw new Error(`Prohibited salary field detected: "${key}". The system strictly excludes salary data.`);
    }
    if (typeof obj[key] === "object" && obj[key] !== null && !(obj[key] instanceof Date)) {
      assertNoSalaryFields(obj[key]);
    }
  }
}

/**
 * Derives age in years from a birth date.
 */
export function deriveAge(dob, referenceDate = new Date()) {
  if (dob === null || dob === undefined || dob === "") return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (!Number.isFinite(d.getTime())) return null;
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Derives age band from age.
 */
export function deriveAgeBand(age) {
  if (age === null || age === undefined || !Number.isFinite(age)) return null;
  if (age < 30) return "<30";
  if (age <= 40) return "30-40";
  if (age <= 50) return "40-50";
  return ">50";
}

/**
 * Derives generation by birth year:
 * Baby Boomers: <= 1964
 * Gen X: 1965 - 1980
 * Gen Y: 1981 - 1996
 * Gen Z: 1997+
 */
export function deriveGeneration(birthYear) {
  if (!Number.isFinite(birthYear)) return null;
  if (birthYear <= 1964) return "Baby Boomers";
  if (birthYear <= 1980) return "Gen X";
  if (birthYear <= 1996) return "Gen Y";
  return "Gen Z";
}

/**
 * Derives tenure in decimal years.
 */
export function deriveTenureYears(hireDate, terminationDate = null, referenceDate = new Date()) {
  if (hireDate === null || hireDate === undefined || hireDate === "") return null;
  const hire = hireDate instanceof Date ? hireDate : new Date(hireDate);
  if (!Number.isFinite(hire.getTime())) return 0;
  const end = terminationDate ? (terminationDate instanceof Date ? terminationDate : new Date(terminationDate)) : (referenceDate instanceof Date ? referenceDate : new Date(referenceDate));
  const diffMs = end.getTime() - hire.getTime();
  if (diffMs <= 0) return 0;
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 10) / 10;
}

/**
 * Derives tenure band: "0-1", "1-3", "3-5", "5+"
 */
export function deriveTenureBand(tenureYears) {
  if (tenureYears === null || tenureYears === undefined || !Number.isFinite(tenureYears)) return null;
  if (tenureYears <= 1) return "0-1";
  if (tenureYears <= 3) return "1-3";
  if (tenureYears <= 5) return "3-5";
  return "5+";
}

/**
 * Derives risk level from probability:
 * Low: < 0.50
 * Medium: 0.50 - 0.74
 * Peak: >= 0.75
 */
export function deriveRiskLevel(probability) {
  if (probability === null || probability === undefined || !Number.isFinite(probability)) return "Low";
  if (probability < 0.5) return "Low";
  if (probability < 0.75) return "Medium";
  return "Peak";
}

/**
 * Computes all derived fields for an employee record.
 */
export function computeDerivedEmployeeFields(employee, referenceDate = new Date()) {
  assertNoSalaryFields(employee);

  const dob = employee.dob instanceof Date
    ? employee.dob
    : employee.dob
      ? new Date(employee.dob)
      : null;
  const hire = employee.hireDate instanceof Date
    ? employee.hireDate
    : employee.hireDate
      ? new Date(employee.hireDate)
      : null;
  const term = employee.terminationDate ? (employee.terminationDate instanceof Date ? employee.terminationDate : new Date(employee.terminationDate)) : null;

  const age = deriveAge(dob, referenceDate);
  const birthYear = dob && Number.isFinite(dob.getTime()) ? dob.getFullYear() : null;
  const tenureYears = deriveTenureYears(hire, term, referenceDate);

  const riskProb = Number.isFinite(employee.riskProbability)
    ? Math.max(0, Math.min(1, Math.round(employee.riskProbability * 100) / 100))
    : 0.2;

  const hireYear = hire && Number.isFinite(hire.getTime()) ? hire.getFullYear() : null;
  const hireMonth = hire && Number.isFinite(hire.getTime())
    ? `${hire.getFullYear()}-${String(hire.getMonth() + 1).padStart(2, "0")}`
    : null;

  return {
    ...employee,
    age,
    ageBand: deriveAgeBand(age),
    generation: deriveGeneration(birthYear),
    tenureYears,
    tenureBand: deriveTenureBand(tenureYears),
    hireYear,
    hireMonth,
    riskProbability: riskProb,
    riskLevel: deriveRiskLevel(riskProb),
  };
}
