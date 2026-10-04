import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { normalizeRole } from "../config/roles.js";
import { loginUsuario, loginSuperAdmin, loginJefeDepartamento as loginJefeDepartamentoService, obtenerPerfilActual } from "../services/authService.js";
import { setAccessToken } from "../services/apiAuth.js";

/**
 * ==========================================================================
 * CONTEXTO DE AUTENTICACIÓN
 * ==========================================================================
 * Fuente única de verdad para la sesión del usuario. El modelo de roles se
 * normaliza a un estándar backend-ready:
 *   - stt: SuperAdministrador
 *   - apv: Administrador / APV
 *   - jefe-departamento: jefe de departamento
 *
 * El token sólo vive en memoria del proceso del navegador. No se persisten
 * credenciales ni datos operativos en el navegador.
 * ==========================================================================
 */
const AuthContext = createContext(null);

function normalizarSesion(sesion) {
  if (!sesion?.usuario) return null;

  return {
    ...sesion,
    usuario: {
      ...sesion.usuario,
      rol: normalizeRole(sesion.usuario.rol),
    },
  };
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [interfaceTheme, setInterfaceTheme] = useState("standard");
  const isLoading = false;

  useEffect(() => {
    setAccessToken(sesion?.token ?? "");
  }, [sesion?.token]);

  useEffect(() => {
    if (!sesion?.token) return undefined;
    const actualizarPerfil = () => {
      obtenerPerfilActual()
        .then((perfil) => setSesion((actual) => actual ? normalizarSesion({
          ...actual,
          usuario: {
            ...actual.usuario,
            ...perfil,
            departamentoId: perfil.departamento_id,
            departamento: perfil.departamento,
          },
        }) : actual))
        .catch((error) => console.error("No fue posible actualizar el perfil de la sesión.", error));
    };
    const timer = window.setInterval(actualizarPerfil, 15000);
    return () => window.clearInterval(timer);
  }, [sesion?.token]);

  const login = useCallback(async (credenciales, _recordarSesion) => {
    const nuevaSesion = await loginUsuario(credenciales);

    const sesionNormalizada = normalizarSesion(nuevaSesion);
    setSesion(sesionNormalizada);
    setInterfaceTheme("standard");
    setAccessToken(sesionNormalizada.token);
    return sesionNormalizada;
  }, []);

  const loginAdmin = useCallback(async (credenciales, _recordarSesion) => {
    const nuevaSesion = await loginSuperAdmin(credenciales);

    const sesionNormalizada = normalizarSesion(nuevaSesion);
    setSesion(sesionNormalizada);
    setInterfaceTheme("stt");
    setAccessToken(sesionNormalizada.token);
    return sesionNormalizada;
  }, []);

  const loginJefeDepartamento = useCallback(async (credenciales, _recordarSesion) => {
    const nuevaSesion = await loginJefeDepartamentoService(credenciales);

    const sesionNormalizada = normalizarSesion(nuevaSesion);
    setSesion(sesionNormalizada);
    setInterfaceTheme("standard");
    setAccessToken(sesionNormalizada.token);
    return sesionNormalizada;
  }, []);

  const logout = useCallback(() => {
    setSesion(null);
    setInterfaceTheme("standard");
    setAccessToken("");
  }, []);

  const value = useMemo(
    () => ({
      usuario: sesion?.usuario ?? null,
      token: sesion?.token ?? null,
      rol: normalizeRole(sesion?.usuario?.rol) ?? null,
      isAuthenticated: Boolean(sesion?.token),
      isLoading,
      login,
      loginAdmin,
      loginJefeDepartamento,
      logout,
      interfaceTheme,
      setInterfaceTheme,
    }),
    [sesion, isLoading, login, loginAdmin, loginJefeDepartamento, logout, interfaceTheme],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
