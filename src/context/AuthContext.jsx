import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { loginUsuario, loginSuperAdmin, loginJefeDepartamento as loginJefeDepartamentoService } from "../services/authService.js";

/**
 * ============================================================================
 * CONTEXTO DE AUTENTICACIÓN
 * ============================================================================
 * Única fuente de verdad sobre quién está autenticado y con qué rol, para
 * que rutas y componentes decidan qué mostrar sin duplicar lógica de sesión.
 *
 * Persistencia: si el usuario marca "recordar sesión" en el login, el token
 * se guarda en `localStorage` (sobrevive a cerrar el navegador); si no, se
 * guarda en `sessionStorage` (se pierde al cerrar la pestaña). Nunca se
 * guarda la contraseña, solo el token de sesión emitido por el backend.
 *
 * ── MODO DESARROLLO (BYPASS TEMPORAL) ──────────────────────────────────────
 * Mientras el backend PHP no exista, `DEV_BYPASS_AUTH` permite iniciar
 * sesión con cualquier valor escrito en los campos: primero se intenta la
 * llamada real (`authService`); si falla (no hay backend aún), se arma una
 * sesión local de prueba en vez de bloquear al usuario. Esto es SOLO para
 * poder navegar el prototipo — se debe poner en `false` (o borrar el bloque
 * marcado abajo) en cuanto el backend real esté disponible.
 * ============================================================================
 */
const DEV_BYPASS_AUTH = true; // TODO: quitar/poner en false cuando exista el backend PHP real.

const SESSION_STORAGE_KEY = "pvztg_session";

const AuthContext = createContext(null);

/** Lee la sesión persistida (localStorage primero, luego sessionStorage). */
function leerSesionPersistida() {
  const crudoLocal = localStorage.getItem(SESSION_STORAGE_KEY);
  const crudoSesion = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const crudo = crudoLocal ?? crudoSesion;
  if (!crudo) return null;
  try {
    return JSON.parse(crudo);
  } catch {
    // Sesión corrupta o manipulada: se descarta en vez de fallar silenciosamente.
    return null;
  }
}

function guardarSesion(sesion, recordar) {
  const payload = JSON.stringify(sesion);
  if (recordar) {
    localStorage.setItem(SESSION_STORAGE_KEY, payload);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, payload);
  }
}

function limpiarSesionPersistida() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * ── SOLO MODO DESARROLLO ──
 * Arma una sesión de prueba con lo que sea que el usuario haya escrito,
 * sin validar nada contra un backend. `identificador` es lo que haya
 * puesto en el primer campo del formulario (RCF, o usuario del SuperAdmin)
 * — se usa solo para mostrarlo en pantalla.
 */
function crearSesionDev(rol, identificador) {
  return {
    token: `dev-${Date.now()}`,
    usuario: {
      id: identificador || "SIN-ID",
      nombre: identificador || "Usuario de prueba",
      rol,
    },
  };
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  // Distingue "aún no sabemos si hay sesión" de "sabemos que no hay" para
  // evitar que las rutas protegidas redirijan al login antes de rehidratar.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sesionPersistida = leerSesionPersistida();
    setSesion(sesionPersistida);
    setIsLoading(false);
  }, []);

  /**
   * Inicia sesión como Auditor.
   * @param {import("../services/authService.js").CredencialesLogin} credenciales
   * @param {boolean} recordarSesion
   */
  const login = useCallback(async (credenciales, recordarSesion) => {
    let nuevaSesion;
    try {
      nuevaSesion = await loginUsuario(credenciales);
    } catch (error) {
      if (!DEV_BYPASS_AUTH) throw error;
      // Backend real no disponible todavía: sesión de prueba local.
      nuevaSesion = crearSesionDev(credenciales.rol, credenciales.rcf);
    }
    setSesion(nuevaSesion);
    guardarSesion(nuevaSesion, recordarSesion);
    return nuevaSesion;
  }, []);

  /**
   * Inicia sesión como SuperAdministrador (flujo y endpoint separados).
   * @param {{ usuario: string, password: string }} credenciales
   * @param {boolean} recordarSesion
   */
  const loginAdmin = useCallback(async (credenciales, recordarSesion) => {
    let nuevaSesion;
    try {
      nuevaSesion = await loginSuperAdmin(credenciales);
    } catch (error) {
      if (!DEV_BYPASS_AUTH) throw error;
      nuevaSesion = crearSesionDev("superadmin", credenciales.usuario);
    }
    setSesion(nuevaSesion);
    guardarSesion(nuevaSesion, recordarSesion);
    return nuevaSesion;
  }, []);

  /**
   * Inicia sesión como Jefe de Departamento. El departamento elegido se
   * guarda en la sesión — es lo que determina qué unidades puede ver.
   * @param {{ usuario: string, password: string, departamento: string }} credenciales
   * @param {boolean} recordarSesion
   */
  const loginJefeDepartamento = useCallback(async (credenciales, recordarSesion) => {
    let nuevaSesion;
    try {
      nuevaSesion = await loginJefeDepartamentoService(credenciales);
    } catch (error) {
      if (!DEV_BYPASS_AUTH) throw error;
      nuevaSesion = crearSesionDev("jefe-departamento", credenciales.usuario);
      nuevaSesion.usuario.departamento = credenciales.departamento;
    }
    setSesion(nuevaSesion);
    guardarSesion(nuevaSesion, recordarSesion);
    return nuevaSesion;
  }, []);

  const logout = useCallback(() => {
    setSesion(null);
    limpiarSesionPersistida();
  }, []);

  const value = useMemo(
    () => ({
      usuario: sesion?.usuario ?? null,
      token: sesion?.token ?? null,
      rol: sesion?.usuario?.rol ?? null,
      isAuthenticated: Boolean(sesion?.token),
      isLoading,
      login,
      loginAdmin,
      loginJefeDepartamento,
      logout,
    }),
    [sesion, isLoading, login, loginAdmin, loginJefeDepartamento, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
