const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const ANNUAL_LEAVE_TYPES = new Set(["annual", "vacation", "vacaciones"]);
const ACTIVE_LEAVE_STATUSES = new Set(["pending", "approved"]);

function parseDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new RangeError("La fecha debe tener el formato AAAA-MM-DD.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("La fecha no es válida.");
  }
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function weekdayInMonth(year, month, weekday, occurrence) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const dayOffset = (weekday - first.getUTCDay() + 7) % 7;
  return formatDate(new Date(Date.UTC(year, month - 1, 1 + dayOffset + (occurrence - 1) * 7)));
}

function anniversaryDate(hireDate, year) {
  const lastDay = new Date(Date.UTC(year, hireDate.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, hireDate.getUTCMonth(), Math.min(hireDate.getUTCDate(), lastDay)));
}

export function getMexicanHolidays(year) {
  const holidays = new Set([
    `${year}-01-01`,
    weekdayInMonth(year, 2, 1, 1),
    weekdayInMonth(year, 3, 1, 3),
    `${year}-05-01`,
    `${year}-09-16`,
    weekdayInMonth(year, 11, 1, 3),
    `${year}-12-25`,
  ]);

  if (year >= 2024 && (year - 2024) % 6 === 0) holidays.add(`${year}-10-01`);
  return holidays;
}

export function isMexicanPublicHoliday(value) {
  const date = parseDate(value);
  return getMexicanHolidays(date.getUTCFullYear()).has(formatDate(date));
}

export function isBusinessDay(value, holidays = getMexicanHolidays) {
  const date = parseDate(value);
  const isoDate = formatDate(date);
  const holidaySet = typeof holidays === "function" ? holidays(date.getUTCFullYear()) : holidays;
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidaySet.has(isoDate);
}

export function countBusinessDays(startValue, endValue, holidays = getMexicanHolidays) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (start > end) throw new RangeError("La fecha inicial no puede ser posterior a la fecha final.");

  let count = 0;
  for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += DAY_MS) {
    if (isBusinessDay(new Date(timestamp), holidays)) count += 1;
  }
  return count;
}

export function getCompletedYears(hireDateValue, asOfValue = new Date()) {
  const hireDate = parseDate(hireDateValue);
  const asOfDate = parseDate(asOfValue);
  let years = asOfDate.getUTCFullYear() - hireDate.getUTCFullYear();
  if (asOfDate < anniversaryDate(hireDate, asOfDate.getUTCFullYear())) years -= 1;
  return Math.max(0, years);
}

export function getVacationEntitlement(hireDateValue, asOfValue = new Date()) {
  const years = getCompletedYears(hireDateValue, asOfValue);
  if (years === 0) return 0;
  if (years <= 5) return 10 + years * 2;
  return 20 + (1 + Math.floor((years - 6) / 5)) * 2;
}

export function getVacationBalance(hireDateValue, requests = [], asOfValue = new Date()) {
  if (!hireDateValue) return { entitlement: 0, used: 0, available: 0, periodStart: null };

  const hireDate = parseDate(hireDateValue);
  const asOfDate = parseDate(asOfValue);
  const years = getCompletedYears(hireDate, asOfDate);
  const entitlement = getVacationEntitlement(hireDate, asOfDate);
  if (years === 0) return { entitlement, used: 0, available: 0, periodStart: null };

  const periodStart = anniversaryDate(hireDate, hireDate.getUTCFullYear() + years);
  const periodEnd = anniversaryDate(hireDate, hireDate.getUTCFullYear() + years + 1);
  const usage = requests
    .filter((request) => ACTIVE_LEAVE_STATUSES.has(request.status) && ANNUAL_LEAVE_TYPES.has(request.type))
    .reduce((totals, request) => {
      const requestStart = parseDate(request.startDate);
      const requestEnd = parseDate(request.endDate);
      const start = requestStart > periodStart ? requestStart : periodStart;
      const lastPeriodDay = new Date(periodEnd.getTime() - DAY_MS);
      const end = requestEnd < lastPeriodDay ? requestEnd : lastPeriodDay;
      if (start > end) return totals;
      const days = countBusinessDays(start, end);
      if (request.status === "approved") totals.used += days;
      else totals.reserved += days;
      return totals;
    }, { used: 0, reserved: 0 });

  return {
    entitlement,
    used: usage.used,
    reserved: usage.reserved,
    available: Math.max(0, entitlement - usage.used - usage.reserved),
    periodStart: formatDate(periodStart),
  };
}

export function findLeaveOverlap(request, existingRequests = []) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return null;

  return existingRequests.find((existing) => {
    if (!ACTIVE_LEAVE_STATUSES.has(existing.status)) return false;
    if (request.id && request.id === existing.id) return false;
    const existingStart = parseDate(existing.startDate);
    const existingEnd = parseDate(existing.endDate);
    return start <= existingEnd && end >= existingStart;
  }) || null;
}

export function isCoveredByApprovedLeave(dateValue, requests = []) {
  const date = parseDate(dateValue);
  return requests.some((request) => {
    if (request.status !== "approved") return false;
    return date >= parseDate(request.startDate) && date <= parseDate(request.endDate);
  });
}

export function classifyAttendance(record, approvedLeaves = []) {
  if (!record?.workDay) return "not_scheduled";
  if (record.present) return "present";
  return isCoveredByApprovedLeave(record.date, approvedLeaves)
    ? "justified_absence"
    : "unjustified_absence";
}

export function getCurrentAttendanceStatus({ date, schedule, activityCount = 0 }) {
  const day = parseDate(date);
  const workDays = Array.isArray(schedule?.days) ? schedule.days : [];
  if (!workDays.includes(WEEKDAY_KEYS[day.getUTCDay()]) || isMexicanPublicHoliday(day)) {
    return "not_scheduled";
  }
  return activityCount > 0 ? "present" : "in_progress";
}

export function formatLocalDateInTimeZone(date = new Date(), timeZone = "America/Hermosillo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
