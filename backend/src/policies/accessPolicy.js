export function isDepartmentAllowed(auth, departmentId) {
  if (auth?.role !== "jefe-departamento") return true;
  if (auth.departmentId === null || auth.departmentId === undefined) return false;
  return String(auth.departmentId) === String(departmentId);
}

export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
