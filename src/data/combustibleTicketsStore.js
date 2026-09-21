/**
 * ============================================================================
 * STORE DE TICKETS DE COMBUSTIBLE (ALTA FRECUENCIA)
 * ============================================================================
 * A diferencia del historial mensual agregado (`historialCombustible` en
 * `unidadesStore.js`, que viene del análisis de Edenred), este store
 * guarda cada RECARGA individual que el Jefe de Departamento sube desde
 * su interfaz, con sus 3 comprobantes: Ticket Bomba (gasolinera física),
 * Comprobante Edenred (digital) y, opcionalmente, un PDF único que
 * fusiona ambos.
 *
 * Es la fuente del Módulo de Auditoría Global de Tickets Bomba del
 * Administrador - cada registro ya sabe a qué unidad pertenece, y de ahí
 * se deriva a qué departamento (vía `unidad.departamento`).
 * ============================================================================
 */

let tickets = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(tickets));
}

export function suscribirTicketsCombustible(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerTicketsCombustible() {
  return tickets;
}

/**
 * Registra una recarga de combustible con sus comprobantes.
 * @param {{
 *   unidadId: string,
 *   fechaHora: string,      ISO - cuándo se hizo la recarga (no cuándo se sube el ticket).
 *   litros: number,
 *   importe: number,
 *   urlTicketBomba: string | null,
 *   urlTicketEdenred: string | null,
 *   urlPdfFusionado: string | null,
 *   subidoPor: string,       Nombre del Jefe de Departamento que lo cargó.
 * }} datos
 * @returns {Object} el ticket creado.
 */
export function agregarTicketCombustible(datos) {
  const ticket = { id: `TCK-${Date.now()}`, ...datos };
  tickets = [ticket, ...tickets];
  notificar();
  return ticket;
}

export function obtenerTicketsPorUnidad(unidadId) {
  return tickets.filter((ticket) => ticket.unidadId === unidadId);
}
