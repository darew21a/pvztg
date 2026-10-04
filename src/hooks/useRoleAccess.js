import { useMemo } from "react";
import { getDefaultRouteForRole, hasAccessForRole, normalizeRole, ROLES } from "../config/roles.js";
import { useAuth } from "./useAuth.js";

export function useRoleAccess() {
  const { rol } = useAuth();
  const rolNormalizado = normalizeRole(rol);

  return useMemo(
    () => ({
      rol: rolNormalizado,
      isSTT: rolNormalizado === ROLES.STT,
      isAPV: rolNormalizado === ROLES.APV,
      isJefeDepartamento: rolNormalizado === ROLES.JEFE_DEPARTAMENTO,
      hasAccess: (allowedRoles) => hasAccessForRole(rolNormalizado, allowedRoles),
      defaultRoute: getDefaultRouteForRole(rolNormalizado),
    }),
    [rolNormalizado],
  );
}
