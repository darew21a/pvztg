/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * ============================================================================
 * Contrato de comunicación con el backend REST (PHP 8.x + PDO). Este módulo
 * NO contiene datos de ejemplo: cada función define únicamente la forma del
 * payload de entrada/salida esperado, lista para apuntar a los endpoints
 * reales una vez que el backend exista.
 *
 * Todas las llamadas usan `fetch` nativo (sin librerías HTTP externas, según
 * el requisito de sintaxis 2026 / cero dependencias innecesarias) y devuelven
 * el JSON ya parseado o lanzan un Error con el mensaje que el backend regrese.
 * ============================================================================
 */

// Base de la API. En producción se define vía variable de entorno de Vite
// (.env → VITE_API_BASE_URL=http://pv-ztg.cfe.local/api) y nunca hardcodeada.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * @typedef {"auditor"} RolOperativo
 * Único rol operativo del software (el de Conductor se canceló: el
 * personal de campo no usará la app). El SuperAdministrador entra por un
 * flujo separado (ver `loginSuperAdmin`) y no se selecciona aquí.
 */

/**
 * @typedef {Object} CredencialesLogin
 * @property {string} rcf         Clave RCF / usuario, proporcionada por el administrador.
 * @property {string} password    Contraseña del usuario.
 * @property {RolOperativo} rol   Siempre "auditor" — se envía explícito para que el backend lo valide igual.
 */

/**
 * @typedef {Object} SesionUsuario
 * @property {string} token           Token de sesión (JWT o equivalente) emitido por el backend.
 * @property {Object} usuario         Datos del usuario autenticado.
 * @property {string} usuario.id      ID único del usuario (RCF).
 * @property {string} usuario.nombre  Nombre completo.
 * @property {RolOperativo | "superadmin"} usuario.rol  Rol confirmado por el backend.
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
 * login de Administrador — además de usuario/contraseña, requiere el
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
 * @typedef {"celular" | "correo"} MedioSSPR
 */

/**
 * Paso 1 del SSPR: solicita el envío de un código OTP al medio elegido.
 * El backend es responsable de generar el OTP y enviarlo por SMS/correo;
 * aquí solo se dispara la solicitud y se recibe un `solicitudId` para
 * amarrar los pasos siguientes.
 * POST /auth/recuperacion/solicitar
 * @param {{ rcf: string, medio: MedioSSPR }} datos
 * @returns {Promise<{ solicitudId: string }>}
 */
export async function solicitarRestablecimiento({ rcf, medio }) {
  const response = await fetch(`${API_BASE_URL}/auth/recuperacion/solicitar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rcf, medio }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "No fue posible enviar el código de verificación.");
  }

  return response.json();
}

/**
 * Paso 2 del SSPR: verifica el código OTP recibido por el usuario.
 * POST /auth/recuperacion/verificar
 * @param {{ solicitudId: string, otp: string }} datos
 * @returns {Promise<{ tokenRestablecimiento: string }>}
 */
export async function verificarOtp({ solicitudId, otp }) {
  const response = await fetch(`${API_BASE_URL}/auth/recuperacion/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ solicitudId, otp }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "El código ingresado no es válido.");
  }

  return response.json();
}

/**
 * Paso 3 del SSPR: establece la nueva contraseña usando el token emitido
 * tras verificar el OTP.
 * POST /auth/recuperacion/restablecer
 * @param {{ tokenRestablecimiento: string, nuevaPassword: string }} datos
 * @returns {Promise<{ ok: true }>}
 */
export async function restablecerPassword({ tokenRestablecimiento, nuevaPassword }) {
  const response = await fetch(`${API_BASE_URL}/auth/recuperacion/restablecer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenRestablecimiento, nuevaPassword }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.mensaje ?? "No fue posible actualizar la contraseña.");
  }

  return response.json();
}
