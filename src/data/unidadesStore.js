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
 * garantizado y sin duplicados - muchas unidades aún no tienen ECONOMICO
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

export const TIPOS_COMBUSTIBLE = ["MAGNA", "DIESEL", "G SUPER"];

// Copia mutable en memoria - ver nota de arquitectura arriba.
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

const CAMPOS_PARQUE_VEHICULAR = new Set([
  "marca",
  "submarca",
  "tipo",
  "modelo",
  "numeroSerie",
  "placas",
  "placas2025",
  "centroGestor",
  "centroCostos",
  "ubicacionTecnica",
  "rpeResguardante",
  "arrendadora",
  "conductorAsignado",
  "departamento",
]);

/**
 * Actualiza únicamente datos maestros importados por número económico.
 * Los campos de Edenred, documentos, fotografías y demás datos operativos
 * quedan intactos porque nunca forman parte de la lista importable.
 */
export function actualizarParqueVehicular(actualizaciones) {
  const cambiosPorId = new Map();
  actualizaciones.forEach(({ unidad, cambios }) => {
    const cambiosPermitidos = Object.fromEntries(
      Object.entries(cambios).filter(([campo, valor]) => CAMPOS_PARQUE_VEHICULAR.has(campo) && valor !== null && valor !== undefined && String(valor).trim() !== ""),
    );
    if (unidad && Object.keys(cambiosPermitidos).length > 0) cambiosPorId.set(unidad.id, cambiosPermitidos);
  });

  if (cambiosPorId.size === 0) return 0;
  unidades = unidades.map((unidad) => (cambiosPorId.has(unidad.id) ? { ...unidad, ...cambiosPorId.get(unidad.id) } : unidad));
  notificar();
  return cambiosPorId.size;
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
 * Establece (SOBREESCRIBE) el valor absoluto de un mes del historial de
 * combustible. Se usa SOLO para la edición manual del Administrador
 * (botón "Editar" en el Historial de Combustible) - cuando el dato
 * automático de Edenred no es el real y hay que corregirlo a mano.
 *
 * Para aplicar un reporte de Edenred usar `aplicarContribucionEdenred`
 * (suma, no sobreescribe) - así, si dos reportes distintos traen datos
 * del mismo mes, no se pierde ninguno, y se puede revertir uno sin tocar
 * al otro (ver `revertirContribucionEdenred`).
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
 * SUMA la contribución de un reporte de Edenred al mes correspondiente
 * (no sobreescribe). Si el mes no existía, lo crea; si ya existía (otro
 * reporte ya había aportado datos de ese mes), se le suma encima.
 * @param {string} id
 * @param {{ mes: string, km: number, litros: number, importe: number }} contribucion
 */
export function aplicarContribucionEdenred(id, contribucion) {
  const unidad = obtenerUnidadPorId(id);
  if (!unidad) return;
  const historialCombustible = unidad.historialCombustible ?? [];
  const existente = historialCombustible.find((registro) => registro.mes === contribucion.mes);
  const registroActualizado = existente
    ? {
        mes: contribucion.mes,
        km: existente.km + contribucion.km,
        litros: existente.litros + contribucion.litros,
        importe: existente.importe + contribucion.importe,
      }
    : { ...contribucion };
  const sinEseMes = historialCombustible.filter((registro) => registro.mes !== contribucion.mes);
  actualizarUnidad(id, {
    historialCombustible: [...sinEseMes, registroActualizado].sort((a, b) => a.mes.localeCompare(b.mes)),
  });
}

/**
 * ROLLBACK EN CASCADA (Módulo 3) - resta exactamente lo que
 * `aplicarContribucionEdenred` había sumado, cuando se elimina el reporte
 * que lo originó. Nunca deja el mes en negativo (se limita a 0: si por
 * cualquier motivo la resta pasaría de cero, se detiene ahí en vez de
 * generar un número negativo sin sentido de negocio).
 * @param {string} id
 * @param {{ mes: string, km: number, litros: number, importe: number }} contribucion  La misma que se había aplicado, para revertirla exacta.
 */
export function revertirContribucionEdenred(id, contribucion) {
  const unidad = obtenerUnidadPorId(id);
  if (!unidad) return;
  const historialCombustible = unidad.historialCombustible ?? [];
  const existente = historialCombustible.find((registro) => registro.mes === contribucion.mes);
  if (!existente) return; // ya no hay nada que revertir en ese mes (dato inconsistente externo, no truena)
  const registroCorregido = {
    mes: contribucion.mes,
    km: Math.max(0, existente.km - contribucion.km),
    litros: Math.max(0, existente.litros - contribucion.litros),
    importe: Math.max(0, existente.importe - contribucion.importe),
  };
  const sinEseMes = historialCombustible.filter((registro) => registro.mes !== contribucion.mes);
  actualizarUnidad(id, {
    historialCombustible: [...sinEseMes, registroCorregido].sort((a, b) => a.mes.localeCompare(b.mes)),
  });
}

/**
 * Revierte el kilometraje a su valor anterior, PERO solo si nadie más lo
 * actualizó desde entonces (si el kilometraje actual ya no es el que esta
 * contribución había puesto, algún reporte más reciente lo superó y no
 * hay que pisarlo con un valor viejo).
 * @param {string} id
 * @param {number} kilometrajeQueSeHabiaAplicado  El valor que esta contribución dejó en su momento.
 * @param {number} kilometrajeAnterior            El valor que tenía la unidad ANTES de esa contribución.
 */
export function revertirKilometrajeSiNoCambio(id, kilometrajeQueSeHabiaAplicado, kilometrajeAnterior) {
  const unidad = obtenerUnidadPorId(id);
  if (!unidad) return;
  if (unidad.kilometraje === kilometrajeQueSeHabiaAplicado) {
    actualizarUnidad(id, { kilometraje: kilometrajeAnterior });
  }
}

/**
 * Agrega un documento (seguro, tarjeta de circulación, etc.) al historial de
 * la unidad, ordenado por fecha de carga - nunca se sobreescribe uno
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
