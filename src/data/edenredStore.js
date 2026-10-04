import { aplicarContribucionEdenred, reemplazarUnidades } from "./unidadesStore.js";
import { agregarRegistroEliminacion } from "./historialEliminacionesStore.js";
import { getAuthHeaders } from "../services/apiAuth.js";
import { obtenerUnidadesApi } from "../services/unidadService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * ============================================================================
 * STORE DE CARGAS DE EDENRED
 * ============================================================================
 * Cada vez que el Administrador sube y confirma un reporte de Edenred, se
 * guarda como una "carga" independiente - con su fecha/hora de carga, el
 * periodo que cubre, sus transacciones crudas, Y el detalle exacto de lo
 * que se aplicó a cada unidad (`resumenAplicado`) - en vez de mezclar
 * todo en una sola lista plana. Guardar ese detalle es lo que permite el
 * detalle que el servidor necesita para revertir exactamente los aportes
 * dentro de la transacción de eliminación.
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

export function reemplazarCargasEdenred(remotas) {
  cargas = Array.isArray(remotas) ? remotas : [];
  notificar();
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
 * El servidor revierte los aportes transaccionalmente; después se refresca
 * el cache de unidades desde la fuente de verdad.
 * @param {string} cargaId
 * @param {string} eliminadoPor  Nombre de quien elimina el reporte, para el log de auditoría.
 */
export async function eliminarCargaEdenred(cargaId, eliminadoPor = "Administrador") {
  const carga = cargas.find((c) => c.id === cargaId);
  if (!carga) throw new Error("El reporte ya no está disponible.");

  const response = await fetch(`${API_BASE_URL}/edenred/cargas/${encodeURIComponent(cargaId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible eliminar el reporte.");

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
  obtenerUnidadesApi()
    .then(reemplazarUnidades)
    .catch((error) => console.error("La carga se eliminó, pero no fue posible refrescar las unidades desde la API.", error));
}

// Re-exportado por conveniencia: quien aplica una carga (ver AuditoriaEdenredPage)
// aplica una carga ya confirmada en la API al store de la sesión.
export { aplicarContribucionEdenred };
