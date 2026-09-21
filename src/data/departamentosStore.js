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
 * Semilla inicial: los 9 departamentos reales de CFE Transmisión Zona
 * Guerrero ya confirmados. Cuando exista el backend, este store se
 * reemplaza por llamadas a la tabla `Departamentos` (ver
 * `server-design/esquema-relacional.js`) sin tocar los componentes.
 * ============================================================================
 */

let departamentos = [
  { id: "jefatura", nombre: "Jefatura", icono: "badge" },
  { id: "lineas", nombre: "Líneas", icono: "power" },
  { id: "subestaciones", nombre: "Subestaciones", icono: "electrical_services" },
  { id: "protecciones", nombre: "Protecciones", icono: "shield" },
  { id: "comunicaciones", nombre: "Comunicaciones", icono: "cell_tower" },
  { id: "control", nombre: "Control", icono: "settings_input_antenna" },
  { id: "ixtapa-potencia", nombre: "Ixtapa Potencia", icono: "bolt" },
  { id: "chilpancingo-potencia", nombre: "Chilpancingo Potencia", icono: "bolt" },
  { id: "zona-operacion-transmision", nombre: "Zona de Operación de Transmisión Guerrero-Morelos", icono: "hub" },
];

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

export function obtenerNombreDepartamento(id) {
  return departamentos.find((departamento) => departamento.id === id)?.nombre ?? "Sin departamento asignado";
}

/**
 * Da de alta un departamento nuevo - el sistema no tiene límite de
 * cuántos puede haber. `id` se genera a partir del nombre si no se da uno.
 * @param {{ nombre: string, icono?: string }} datos
 */
export function agregarDepartamento({ nombre, icono = "corporate_fare" }) {
  const id = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const nuevoDepartamento = { id, nombre, icono };
  departamentos = [...departamentos, nuevoDepartamento];
  notificar();
  return nuevoDepartamento;
}
