/**
 * ============================================================================
 * STORE DE DEPARTAMENTOS
 * ============================================================================
 * Los departamentos NO son un número fijo - el sistema debe soportar N
 * departamentos que crecen con el tiempo (nuevas áreas, reorganizaciones).
 * Por eso viven en un store con el mismo patrón pub/sub que
 * `unidadesStore.js`, no en una constante estática: cualquier pantalla que
 * necesite la lista de departamentos (selects de filtro, asignación de
 * unidad, panel del Jefe de Departamento) la consulta en vivo desde aquí,
 * y si mañana se agrega un departamento nuevo, todo el sistema lo ve sin
 * tocar código.
 *
 * La API es la única fuente de departamentos. Este store comienza vacío y
 * sólo mantiene en memoria la respuesta remota durante la sesión.
 * ============================================================================
 */

let departamentos = [];

const listeners = new Set();

function notificar() {
  listeners.forEach((callback) => callback(departamentos));
}

export function suscribirDepartamentos(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function obtenerDepartamentos() {
  return departamentos;
}

export function reemplazarDepartamentos(departamentosRemotos) {
  departamentos = Array.isArray(departamentosRemotos) ? departamentosRemotos : [];
  notificar();
}

export function obtenerNombreDepartamento(id) {
  const departamento = departamentos.find(
    (item) => String(item.id) === String(id) || item.nombre === id,
  );
  return departamento?.nombre ?? "Sin departamento asignado";
}

/**
 * Incorpora al cache reactivo un departamento confirmado por la API.
 * @param {{ id: string | number, nombre: string, icono?: string }} departamento
 */
export function agregarDepartamento(departamento) {
  const nuevoDepartamento = { ...departamento, id: String(departamento.id) };
  departamentos = [...departamentos, nuevoDepartamento];
  notificar();
  return nuevoDepartamento;
}
