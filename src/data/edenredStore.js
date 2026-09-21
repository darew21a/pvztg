import { aplicarContribucionEdenred, revertirContribucionEdenred, revertirKilometrajeSiNoCambio } from "./unidadesStore.js";
import { agregarRegistroEliminacion } from "./historialEliminacionesStore.js";

/**
 * ============================================================================
 * STORE DE CARGAS DE EDENRED
 * ============================================================================
 * Cada vez que el Administrador sube y confirma un reporte de Edenred, se
 * guarda como una "carga" independiente - con su fecha/hora de carga, el
 * periodo que cubre, sus transacciones crudas, Y el detalle exacto de lo
 * que se aplicó a cada unidad (`resumenAplicado`) - en vez de mezclar
 * todo en una sola lista plana. Guardar ese detalle es lo que permite el
 * rollback en cascada del Módulo 3: para deshacer una carga, basta con
 * revertir exactamente `resumenAplicado`, sin adivinar qué le tocaba a
 * cada unidad.
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
 * Registra una nueva carga de Edenred con sus transacciones crudas y el
 * detalle de lo que se aplicó a cada unidad - necesario para poder
 * revertirla exactamente más adelante (Módulo 3).
 * @param {{
 *   periodo: string[],
 *   transacciones: Array<Object>,
 *   resumenAplicado: Array<{ unidadId: string, mes: string, km: number, litros: number, importe: number, kilometrajeAnterior: number, kilometrajeAplicado: number }>,
 * }} datos
 * @returns {Object} la carga creada, con id y fecha de carga ya asignados.
 */
export function agregarCargaEdenred({ periodo, transacciones, resumenAplicado }) {
  const carga = {
    id: `carga-${Date.now()}`,
    fechaCarga: new Date().toISOString(),
    periodo,
    transacciones,
    resumenAplicado: resumenAplicado ?? [],
  };
  cargas = [carga, ...cargas];
  notificar();
  return carga;
}

/**
 * ELIMINACIÓN LIBRE + ROLLBACK EN CASCADA (Módulo 3).
 * El Administrador puede dar de baja cualquier reporte de Edenred en
 * cualquier momento. Al eliminarlo:
 *   1. Por cada unidad que esa carga había afectado, se resta EXACTAMENTE
 *      lo que se le había sumado (km/litros/importe) - nunca se borra el
 *      mes completo a ciegas, porque otra carga pudo haber aportado al
 *      mismo mes.
 *   2. El kilometraje se revierte solo si nadie lo actualizó después.
 *   3. Los contadores globales de la flota (Dashboard) no se tocan aparte
 *      - se recalculan solos, porque siempre se derivan en vivo de los
 *      datos de las unidades (nunca se guarda un total global aparte que
 *      se pudiera desincronizar).
 * @param {string} cargaId
 * @param {string} eliminadoPor  Nombre de quien elimina el reporte, para el log de auditoría.
 */
export function eliminarCargaEdenred(cargaId, eliminadoPor = "Administrador") {
  const carga = cargas.find((c) => c.id === cargaId);
  if (!carga) return;

  carga.resumenAplicado.forEach(({ unidadId, mes, km, litros, importe, kilometrajeAnterior, kilometrajeAplicado }) => {
    revertirContribucionEdenred(unidadId, { mes, km, litros, importe });
    revertirKilometrajeSiNoCambio(unidadId, kilometrajeAplicado, kilometrajeAnterior);
  });

  // El HECHO de la eliminación queda para siempre en el log de auditoría,
  // aunque la carga en sí ya no exista.
  agregarRegistroEliminacion({
    cargaId: carga.id,
    periodo: carga.periodo,
    totalTransacciones: carga.transacciones.length,
    resumenRevertido: carga.resumenAplicado,
    eliminadoPor,
  });

  cargas = cargas.filter((c) => c.id !== cargaId);
  notificar();
}

// Re-exportado por conveniencia: quien aplica una carga (ver AuditoriaEdenredPage)
// usa esta misma función aditiva para que el registro de `resumenAplicado`
// y lo que de verdad se sumó en `unidadesStore` nunca queden desincronizados.
export { aplicarContribucionEdenred };
