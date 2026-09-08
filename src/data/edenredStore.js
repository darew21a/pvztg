/**
 * ============================================================================
 * STORE DE CARGAS DE EDENRED
 * ============================================================================
 * Cada vez que el Administrador sube y confirma un reporte de Edenred, se
 * guarda como una "carga" independiente — con su fecha/hora de carga y el
 * periodo que cubre — en vez de mezclar todas las transacciones en una
 * sola lista plana. Así, cuando se sube un reporte nuevo, el detalle del
 * anterior NO se pierde: quedan anidadas por carga (día, mes, año y hora
 * de cuándo se subieron), y el Administrador puede ver el detalle de
 * cualquiera de ellas cuando quiera, no solo la más reciente.
 * ============================================================================
 */

let cargas = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(cargas));
}

export function suscribirCargasEdenred(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Cargas ordenadas de la más reciente a la más antigua. */
export function obtenerCargasEdenred() {
  return cargas;
}

/**
 * Registra una nueva carga de Edenred con sus transacciones crudas.
 * @param {{ periodo: string[], transacciones: Array<Object> }} datos
 * @returns {Object} la carga creada, con id y fecha de carga ya asignados.
 */
export function agregarCargaEdenred({ periodo, transacciones }) {
  const carga = {
    id: `carga-${Date.now()}`,
    fechaCarga: new Date().toISOString(),
    periodo,
    transacciones,
  };
  cargas = [carga, ...cargas];
  notificar();
  return carga;
}
