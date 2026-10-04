/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * ============================================================================
 * Cliente para los endpoints REST del backend Node.js/Express.
 *
 * Todas las llamadas usan `fetch` nativo (sin librerías HTTP externas, según
 * el requisito de sintaxis 2026 / cero dependencias innecesarias) y devuelven
 * el JSON ya parseado o lanzan un Error con el mensaje que el backend regrese.
 * ============================================================================
 */

// Base de la API. En producción se define vía variable de entorno de Vite
// (.env → VITE_API_BASE_URL=http://pv-ztg.cfe.local/api) y nunca hardcodeada.
import { getAuthHeaders } from "./apiAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * @typedef {"apv"} RolOperativo
 * Rol principal del administrador operativo de la flota (APV). El
 * SuperAdministrador (STT) y el Jefe de Departamento usan flujos separados.
 */

/**
 * @typedef {Object} CredencialesLogin
 * @property {string} rcf         Clave RCF / usuario, proporcionada por el administrador.
 * @property {string} password    Contraseña del usuario.
 * @property {RolOperativo} rol   Siempre "apv" - se envía explícito para que el backend lo valide igual.
 */

/**
 * @typedef {Object} SesionUsuario
 * @property {string} token           Token de sesión (JWT o equivalente) emitido por el backend.
 * @property {Object} usuario         Datos del usuario autenticado.
 * @property {string} usuario.id      ID único del usuario (RCF).
 * @property {string} usuario.nombre  Nombre completo.
 * @property {RolOperativo | "stt" | "jefe-departamento"} usuario.rol  Rol confirmado por el backend.
 */

/**
 * Autentica a un Auditor contra el backend.
 * POST /auth/login
 * @param {CredencialesLogin} credenciales
 * @returns {Promise<SesionUsuario>}
 */
export async function loginUsuario(credenciales) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credenciales),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "No fue posible iniciar sesión. Verifique sus credenciales.");
  }

  return response.json();
}

/**
 * Autentica al SuperAdministrador. Flujo y endpoint separados del login
 * operativo por requisito explícito de seguridad (credencial específica).
 * POST /auth/login-superadmin
 * @param {{ usuario: string, password: string }} credenciales
 * @returns {Promise<SesionUsuario>}
 */
export async function loginSuperAdmin(credenciales) {
  const response = await fetch(`${API_BASE_URL}/auth/login-superadmin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credenciales),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "No fue posible iniciar sesión como SuperAdministrador.");
  }

  return response.json();
}

/**
 * Autentica a un Jefe de Departamento. Flujo y endpoint separados del
 * login de Administrador - además de usuario/contraseña, requiere el
 * departamento (define qué unidades podrá ver).
 * POST /auth/login-jefe-departamento
 * @param {{ usuario: string, password: string, departamento: string }} credenciales
 * @returns {Promise<SesionUsuario>}
 */
export async function loginJefeDepartamento(credenciales) {
  const response = await fetch(`${API_BASE_URL}/auth/login-jefe-departamento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credenciales),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "No fue posible iniciar sesión. Verifique sus credenciales y departamento.");
  }

  return response.json();
}

/**
 * Cambia la contraseña de la sesión autenticada.
 */
export async function cambiarPassword({ passwordActual, nuevaPassword }) {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ passwordActual, nuevaPassword }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible actualizar la contraseña.");
  return body;
}

export async function obtenerPerfilActual() {
  const response = await fetch(`${API_BASE_URL}/usuarios/perfil`, {
    headers: getAuthHeaders(),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible actualizar el perfil.");
  return body;
}
