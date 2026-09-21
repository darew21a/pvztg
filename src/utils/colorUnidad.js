/**
 * ============================================================================
 * ÍNDICE DE COLORES DE UNIDAD (MÓDULO 1)
 * ============================================================================
 * Una sola función, totalmente desacoplada de la UI, que evalúa el estado
 * de una unidad contra el resto de la flota y los reportes activos, y
 * regresa UN color - el de mayor prioridad si la unidad cumple varias
 * condiciones a la vez. Cuando exista el backend, esta misma función se
 * reutiliza tal cual (recibe datos planos, no depende de React).
 *
 * Jerarquía de prioridad (de más a menos crítico):
 *   1. Naranja  - anomalía de integridad de datos (VIN o placa duplicados
 *                 con otra unidad). Es lo más grave: si esto está mal, no
 *                 se puede confiar en el resto de los datos de la unidad.
 *   2. Rojo     - tiene reportes activos (anomalía/mantenimiento/siniestro
 *                 levantados por un Jefe de Departamento). Ya se sabe que
 *                 algo concreto está pasando con la unidad.
 *   3. Amarillo - sin departamento asignado. Falta administrativa: nadie
 *                 la está viendo desde el panel de Jefe de Departamento.
 *   4. Azul     - sin número económico. La unidad existe pero no está
 *                 dada de alta formalmente (por eso ni siquiera aparece
 *                 en el Buscador de Flota, que ya filtra por esto).
 *   (sin color) - todo en orden.
 * ============================================================================
 */

export const COLORES_UNIDAD = {
  ANOMALIA: "naranja",
  CON_REPORTES: "rojo",
  SIN_DEPARTAMENTO: "amarillo",
  SIN_ECONOMICO: "azul",
  OK: null,
};

/** Clases Tailwind por color - un solo lugar para no repetir el mapeo en cada componente. */
export const CLASES_COLOR_UNIDAD = {
  naranja: { fila: "bg-tertiary-container/20 border-l-4 border-tertiary", texto: "text-tertiary", etiqueta: "Anomalía de datos" },
  rojo: { fila: "bg-error-container/20 border-l-4 border-error", texto: "text-error", etiqueta: "Con reportes" },
  amarillo: { fila: "bg-yellow-100 border-l-4 border-yellow-500", texto: "text-yellow-700", etiqueta: "Sin departamento" },
  azul: { fila: "bg-blue-50 border-l-4 border-blue-400", texto: "text-blue-600", etiqueta: "Sin económico" },
};

/**
 * Detecta si una unidad tiene VIN o placa duplicados con alguna otra
 * unidad de la flota (misma lógica que `detectarVinDuplicados`, pero a
 * nivel de una sola unidad y también cubriendo placa, no solo VIN).
 * @param {Object} unidad
 * @param {Array<Object>} todasLasUnidades
 * @returns {boolean}
 */
function tieneAnomaliaDeDuplicidad(unidad, todasLasUnidades) {
  const otras = todasLasUnidades.filter((otra) => otra.id !== unidad.id);
  const vinDuplicado = unidad.numeroSerie && otras.some((otra) => otra.numeroSerie === unidad.numeroSerie);
  const placaDuplicada =
    unidad.placas && unidad.placas !== "BLANCA" && otras.some((otra) => otra.placas === unidad.placas && otra.placas !== "BLANCA");
  return Boolean(vinDuplicado || placaDuplicada);
}

/**
 * Evalúa el color de UNA unidad. Recibe la flota completa (para detectar
 * duplicados) y los reportes activos (para saber si tiene alguno).
 * @param {Object} unidad
 * @param {Array<Object>} todasLasUnidades
 * @param {Array<Object>} reportes  Del store de reportes (cada uno con `unidadesIds`).
 * @returns {{ color: string | null, razones: string[] }}  `razones` lista TODAS las condiciones que aplican, no solo la de mayor prioridad - útil para un tooltip explicativo.
 */
export function evaluarColorUnidad(unidad, todasLasUnidades, reportes) {
  const razones = [];

  const tieneAnomalia = tieneAnomaliaDeDuplicidad(unidad, todasLasUnidades);
  if (tieneAnomalia) razones.push(CLASES_COLOR_UNIDAD.naranja.etiqueta);

  const tieneReportes = reportes.some((reporte) => reporte.unidadesIds?.includes(unidad.id));
  if (tieneReportes) razones.push(CLASES_COLOR_UNIDAD.rojo.etiqueta);

  const sinDepartamento = !unidad.departamento;
  if (sinDepartamento) razones.push(CLASES_COLOR_UNIDAD.amarillo.etiqueta);

  const sinEconomico = !unidad.economico;
  if (sinEconomico) razones.push(CLASES_COLOR_UNIDAD.azul.etiqueta);

  // La jerarquía de prioridad decide CUÁL de las condiciones que aplican
  // es la que se pinta - pero `razones` ya trae todas, sin perder ninguna.
  let color = COLORES_UNIDAD.OK;
  if (tieneAnomalia) color = COLORES_UNIDAD.ANOMALIA;
  else if (tieneReportes) color = COLORES_UNIDAD.CON_REPORTES;
  else if (sinDepartamento) color = COLORES_UNIDAD.SIN_DEPARTAMENTO;
  else if (sinEconomico) color = COLORES_UNIDAD.SIN_ECONOMICO;

  return { color, razones };
}
