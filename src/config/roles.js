export const ROLES = Object.freeze({
  STT: "stt",
  APV: "apv",
  JEFE_DEPARTAMENTO: "jefe-departamento",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.STT]: "SuperAdministrador (STT)",
  [ROLES.APV]: "Administrador (APV)",
  [ROLES.JEFE_DEPARTAMENTO]: "Jefe de Departamento",
});

export const NAV_ITEMS_BY_ROLE = Object.freeze({
  [ROLES.STT]: [
    { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/flota", icon: "local_shipping", label: "Flota" },
    { to: "/auditoria-edenred", icon: "fact_check", label: "Edenred" },
    { to: "/analisis-combustible", icon: "local_gas_station", label: "Análisis Combustible" },
    { to: "/tickets-combustible", icon: "receipt_long", label: "Tickets Bomba" },
    { to: "/reportes", icon: "analytics", label: "Reportes" },
    { to: "/accesos", icon: "admin_panel_settings", label: "Gestión de accesos" },
  ],
  [ROLES.APV]: [
    { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { to: "/flota", icon: "local_shipping", label: "Flota" },
    { to: "/auditoria-edenred", icon: "fact_check", label: "Edenred" },
    { to: "/analisis-combustible", icon: "local_gas_station", label: "Análisis Combustible" },
    { to: "/tickets-combustible", icon: "receipt_long", label: "Tickets Bomba" },
    { to: "/reportes", icon: "analytics", label: "Reportes" },
  ],
  [ROLES.JEFE_DEPARTAMENTO]: [
    { to: "/jefe-departamento", icon: "home_work", label: "Mi Departamento" },
  ],
});

export function normalizeRole(value) {
  if (value == null) return null;

  const normalizado = String(value).trim().toLowerCase();
  const aliasMap = {
    auditor: ROLES.APV,
    administrador: ROLES.APV,
    apv: ROLES.APV,
    admin: ROLES.STT,
    superadmin: ROLES.STT,
    stt: ROLES.STT,
    "super-admin": ROLES.STT,
    "jefe-departamento": ROLES.JEFE_DEPARTAMENTO,
    "jefe departamento": ROLES.JEFE_DEPARTAMENTO,
    jefe: ROLES.JEFE_DEPARTAMENTO,
  };

  return aliasMap[normalizado] ?? normalizado;
}

export function hasAccessForRole(rol, allowedRoles = []) {
  const rolNormalizado = normalizeRole(rol);
  return allowedRoles.some((role) => normalizeRole(role) === rolNormalizado);
}

export function getDefaultRouteForRole(rol) {
  const rolNormalizado = normalizeRole(rol);

  if (rolNormalizado === ROLES.JEFE_DEPARTAMENTO) return "/jefe-departamento";
  return "/dashboard";
}

export function getNavItemsForRole(rol) {
  const rolNormalizado = normalizeRole(rol);
  return NAV_ITEMS_BY_ROLE[rolNormalizado] ?? NAV_ITEMS_BY_ROLE[ROLES.APV];
}
