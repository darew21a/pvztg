/**
 * ============================================================================
 * STORE DE MENSAJES RÁPIDOS
 * ============================================================================
 * Comunicación directa entre un Jefe de Departamento y las cuentas de
 * Administrador/SuperAdministrador. Un mensaje nace sin respuesta; cuando
 * alguien responde, se marca `notificado: false` para que el Jefe de
 * Departamento vea la notificación en su panel hasta que la abra.
 * ============================================================================
 */

let mensajes = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(mensajes));
}

export function suscribirMensajes(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerMensajes() {
  return mensajes;
}

/**
 * Envía un mensaje rápido de un Jefe de Departamento hacia Administrador/SuperAdmin.
 * @param {{ departamento: string, autor: string, texto: string }} datos
 */
export function enviarMensaje({ departamento, autor, texto }) {
  const mensaje = {
    id: `msg-${Date.now()}`,
    departamento,
    autor,
    texto,
    fecha: new Date().toISOString(),
    respuesta: null,
  };
  mensajes = [mensaje, ...mensajes];
  notificar();
  return mensaje;
}

/**
 * Responde un mensaje existente. Marca `notificado: false` para que el
 * Jefe de Departamento que lo envió vea la notificación pendiente.
 * @param {string} mensajeId
 * @param {{ texto: string, autor: string }} respuesta
 */
export function responderMensaje(mensajeId, respuesta) {
  mensajes = mensajes.map((mensaje) =>
    mensaje.id === mensajeId
      ? { ...mensaje, respuesta: { ...respuesta, fecha: new Date().toISOString() }, notificado: false }
      : mensaje,
  );
  notificar();
}

/** Marca como vista la notificación de respuesta de un mensaje. */
export function marcarMensajeNotificado(mensajeId) {
  mensajes = mensajes.map((mensaje) => (mensaje.id === mensajeId ? { ...mensaje, notificado: true } : mensaje));
  notificar();
}

/** Mensajes de un departamento específico (vista del Jefe de Departamento). */
export function obtenerMensajesPorDepartamento(departamento) {
  return mensajes.filter((mensaje) => mensaje.departamento === departamento);
}
