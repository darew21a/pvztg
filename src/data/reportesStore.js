import { generarFolioAleatorio } from "../utils/generarFolio.js";

/**
 * ============================================================================
 * STORE DE REPORTES DE UNIDAD
 * ============================================================================
 * Registro en memoria de los reportes formales sobre una o varias unidades
 * — los genera un Jefe de Departamento (anomalía, mantenimiento o
 * siniestro) o el Administrador. Se separa del store de unidades porque
 * una unidad puede acumular varios reportes a lo largo del tiempo y el
 * Dashboard solo necesita contarlos, no anidarlos dentro de cada unidad.
 *
 * Mismo patrón que `unidadesStore.js`: mientras no exista el backend PHP,
 * esta es la única fuente de verdad en memoria.
 * ============================================================================
 */

/** @typedef {"leve" | "moderada" | "grave"} GravedadReporte */
/** @typedef {"anomalia" | "mantenimiento" | "siniestro"} TipoReporte */
/** @typedef {"robo" | "asalto" | "secuestro" | null} DetalleSiniestro */

let reportes = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(reportes));
}

export function suscribirReportes(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerReportes() {
  return reportes;
}

/**
 * Registra un nuevo reporte formal sobre una o varias unidades. El folio
 * y la fecha/hora exacta (día/mes/año, hora/minuto/segundo) se asignan
 * aquí — nunca los captura quien reporta, para que sean confiables.
 * @param {{
 *   tipoReporte: TipoReporte,
 *   unidadesIds: string[],
 *   autorNombre: string,
 *   autorDepartamento: string,
 *   descripcion: string,
 *   gravedad?: GravedadReporte,
 *   detalleSiniestro?: DetalleSiniestro,
 *   pdfUrl: string,
 * }} datos
 * @returns {Object} el reporte creado, con folio y fecha ya asignados.
 */



export function agregarReporte(datos) {
  const ahora = new Date();
  const reporte = {
    id: `RPT-${ahora.getTime()}`,
    // ¡Usas tu función utilitaria independiente!
    folio: generarFolioAleatorio("PVZTG", 4), 
    fecha: ahora.toISOString(),
    ...datos,
  };
  
  reportes = [reporte, ...reportes];
  notificar();
  return reporte;
}

export function obtenerReportesPorUnidad(unidadId) {
  return reportes.filter((reporte) => reporte.unidadId === unidadId || reporte.unidadesIds?.includes(unidadId));
}
