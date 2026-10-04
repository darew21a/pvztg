import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDefaultRouteForRole, hasAccessForRole, normalizeRole } from "../../config/roles.js";
import { useAuth } from "../../hooks/useAuth.js";
import LoadingState from "../ui/LoadingState.jsx";

function ProtectedRoute({ allowedRoles, fallbackRoute, children }) {
  const { usuario, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState label="Verificando sesión" fullScreen />;
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (usuario.debeCambiarPassword && location.pathname !== "/cambiar-contrasena") {
    return <Navigate to="/cambiar-contrasena" replace />;
  }

  const rol = normalizeRole(usuario.rol);
  const rutasPermitidas = Array.isArray(allowedRoles) && allowedRoles.length > 0 ? allowedRoles : ["apv", "stt", "jefe-departamento"];

  if (!hasAccessForRole(rol, rutasPermitidas)) {
    const destino = fallbackRoute ?? getDefaultRouteForRole(rol) ?? "/";
    return <Navigate to={destino} replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
