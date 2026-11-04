export function departmentName(id, departments = [], fallback = "—") {
  if (!id) return fallback;
  return departments.find((department) => department.id === id)?.name || id;
}
