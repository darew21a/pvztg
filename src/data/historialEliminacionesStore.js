/**
 * ============================================================================
 * HISTORIAL DE ELIMINACIONES DE REPORTES (LOG DE AUDITORÍA)
 * ============================================================================
 * Cuando el Administrador elimina un reporte de Edenred (Módulo 3), el
 * reporte en sí desaparece del store de cargas - pero el HECHO de que se
 * eliminó, quién lo hizo, cuándo, y exactamente qué se revirtió, se
 * conserva aquí para siempre. Este log nunca se borra (a diferencia de
 * las cargas, que sí se pueden eliminar libremente) - es la evidencia de
 * auditoría de esa eliminación.
 * ============================================================================
 */

let historial = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(historial));
}

export function suscribirHistorialEliminaciones(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerHistorialEliminaciones() {
  return historial;
}

/**
 * Registra que un reporte fue eliminado y qué se revirtió exactamente.
 * @param {{
 *   cargaId: string,
 *   periodo: string[],
 *   totalTransacciones: number,
 *   resumenRevertido: Array<{ unidadId: string, mes: string, km: number, litros: number, importe: number }>,
 *   eliminadoPor: string,
 * }} datos
 */
export function agregarRegistroEliminacion(datos) {
  const registro = { id: `LOG-${Date.now()}`, fechaEliminacion: new Date().toISOString(), ...datos };
  historial = [registro, ...historial];
  notificar();
  return registro;
}
