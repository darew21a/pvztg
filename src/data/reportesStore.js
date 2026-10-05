/**
 * ============================================================================
 * STORE DE REPORTES DE UNIDAD
 * ============================================================================
 * Registro en memoria de los reportes formales sobre una o varias unidades
 * - los genera un Jefe de Departamento (anomalía, mantenimiento o
 * siniestro) o el Administrador. Se separa del store de unidades porque
 * una unidad puede acumular varios reportes a lo largo del tiempo y el
 * Dashboard solo necesita contarlos, no anidarlos dentro de cada unidad.
 *
 * El backend es la fuente de verdad persistente; este módulo sólo mantiene
 * una caché reactiva en memoria para compartir resultados entre vistas.
 * ============================================================================
 */

/** @typedef {"leve" | "moderada" | "grave"} GravedadReporte */
/** @typedef {"anomalia" | "mantenimiento" | "siniestro"} TipoReporte */
/** @typedef {"robo" | "asalto" | "secuestro" | null} DetalleSiniestro */
export const ESTADOS_REPORTE = [
  { value: "recibido", label: "Recibido", color: "secondary" },
  { value: "en-revision", label: "En revisión", color: "tertiary" },
  { value: "en-atencion", label: "En atención", color: "primary" },
  { value: "resuelto", label: "Resuelto", color: "success" },
];

let reportes = [];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(reportes));
}

export function reemplazarReportes(reportesRemotos) {
  reportes = Array.isArray(reportesRemotos) ? reportesRemotos : [];
  notificar();
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
 * aquí - nunca los captura quien reporta, para que sean confiables.
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



export function agregarReporteRemoto(datos, remoto) {
  const reporte = {
    id: String(remoto.id),
    folio: remoto.folio,
    ...datos,
    ...remoto,
  };
  reportes = [reporte, ...reportes.filter((item) => item.id !== reporte.id)];
  notificar();
  return reporte;
}

export function actualizarReporte(id, cambios) {
  reportes = reportes.map((reporte) => (reporte.id === id ? { ...reporte, ...cambios } : reporte));
  notificar();
  return reportes.find((reporte) => reporte.id === id) ?? null;
}

export function eliminarReporte(id) {
  reportes = reportes.filter((reporte) => String(reporte.id) !== String(id));
  notificar();
}

export function agregarSeguimientoReporte(id, { autorTipo, autorNombre, mensaje }) {
  const texto = String(mensaje ?? "").trim();
  if (!texto) return null;
  const reporte = reportes.find((item) => item.id === id);
  if (!reporte) return null;
  const seguimiento = {
    id: `SEG-${Date.now()}`,
    autorTipo,
    autorNombre,
    mensaje: texto,
    fecha: new Date().toISOString(),
  };
  return actualizarReporte(id, { seguimiento: [...(reporte.seguimiento ?? []), seguimiento] });
}

export function obtenerReportesPorUnidad(unidadId) {
  return reportes.filter((reporte) => reporte.unidadId === unidadId || reporte.unidadesIds?.includes(unidadId));
}
