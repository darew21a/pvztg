import unidadesIniciales from "./unidades.json";

/**
 * ============================================================================
 * FUENTE DE DATOS DE UNIDADES
 * ============================================================================
 * Datos reales extraídos y normalizados del Excel "VEHICULOS_ACTUALIZADOS_
 * 2026_TRASPASOS" (hoja "RECEPCION DE VEHI"). El archivo original tenía
 * varias sub-tablas de resumen mezcladas (totales, arrendados/propios) y
 * columnas con valores corruptos por celdas combinadas; esta lista ya viene
 * filtrada a únicamente las 131 unidades con datos de vehículo válidos.
 *
 * `numeroSerie` (VIN) se usa como llave interna porque es el único dato
 * garantizado y sin duplicados — muchas unidades aún no tienen ECONOMICO
 * asignado en el Excel original.
 *
 * Mientras no exista el backend PHP, este módulo es la única fuente de
 * verdad en memoria: los componentes lo mutan directamente (ver
 * `actualizarUnidad`, `agregarUnidad`, `eliminarUnidad`). Cuando el backend
 * exista, estas funciones se reemplazan por llamadas a la API sin tener que
 * tocar los componentes que las consumen.
 * ============================================================================
 */

/** @typedef {"en-ruta" | "en-estacion" | "taller" | "baja"} EstadoUnidad */

export const ESTADOS_UNIDAD = [
  { value: "en-ruta", label: "En Ruta", color: "primary" },
  { value: "en-estacion", label: "En Estación", color: "secondary" },
  { value: "taller", label: "En Taller", color: "tertiary" },
  { value: "baja", label: "Dada de Baja", color: "error" },
];

export const TIPOS_COMBUSTIBLE = ["Gasolina", "Diésel", "Eléctrico", "Híbrido"];

// Copia mutable en memoria — ver nota de arquitectura arriba.
let unidades = [...unidadesIniciales];
const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(unidades));
}

/** Suscribe un callback a cambios en la lista de unidades. Devuelve la función de limpieza. */
export function suscribirUnidades(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerUnidades() {
  return unidades;
}

export function obtenerUnidadPorId(id) {
  return unidades.find((unidad) => unidad.id === id) ?? null;
}

/** Aplica una actualización parcial a una unidad existente (edición desde el Expediente). */
export function actualizarUnidad(id, cambios) {
  unidades = unidades.map((unidad) => (unidad.id === id ? { ...unidad, ...cambios } : unidad));
  notificar();
}

/** Da de alta una unidad nueva. `datos` debe incluir al menos `numeroSerie` (llave interna). */
export function agregarUnidad(datos) {
  const nuevaUnidad = {
    economico: null,
    marca: null,
    submarca: null,
    tipo: null,
    modelo: null,
    numeroSerie: null,
    placas: null,
    placas2025: null,
    centroGestor: null,
    centroCostos: null,
    ubicacionTecnica: null,
    rpeResguardante: null,
    arrendadora: null,
    conductorAsignado: null,
    kilometraje: null,
    tipoCombustible: null,
    estado: "en-estacion",
    imagenUrl: null,
    documentos: [],
    ...datos,
    id: datos.numeroSerie,
  };
  unidades = [nuevaUnidad, ...unidades];
  notificar();
  return nuevaUnidad;
}

/** Baja lógica: no se borra el registro (se conserva el historial), solo cambia su estado. */
export function darDeBajaUnidad(id) {
  actualizarUnidad(id, { estado: "baja" });
}

/**
 * Agrega o actualiza (upsert por mes) el historial de combustible de una
 * unidad a partir del análisis de un reporte de Edenred. Si el mes ya
 * existía (se volvió a subir el mismo reporte), se sobreescribe en vez de
 * duplicarse.
 * @param {string} id
 * @param {{ mes: string, km: number, litros: number, importe: number }} registroMensual
 */
export function registrarConsumoMensual(id, registroMensual) {
  const unidad = obtenerUnidadPorId(id);
  if (!unidad) return;
  const historialCombustible = unidad.historialCombustible ?? [];
  const sinMesActual = historialCombustible.filter((registro) => registro.mes !== registroMensual.mes);
  actualizarUnidad(id, {
    historialCombustible: [...sinMesActual, registroMensual].sort((a, b) => a.mes.localeCompare(b.mes)),
  });
}

/**
 * Agrega un documento (seguro, tarjeta de circulación, etc.) al historial de
 * la unidad, ordenado por fecha de carga — nunca se sobreescribe uno
 * anterior, así siempre queda disponible para descargar.
 * @param {string} id
 * @param {{ tipo: string, nombreArchivo: string, fechaCarga: string, url: string }} documento
 */
export function agregarDocumentoUnidad(id, documento) {
  const unidad = obtenerUnidadPorId(id);
  if (!unidad) return;
  const documentos = [...unidad.documentos, documento].sort(
    (a, b) => new Date(b.fechaCarga) - new Date(a.fechaCarga),
  );
  actualizarUnidad(id, { documentos });
}
