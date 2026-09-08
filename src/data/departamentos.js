/**
 * Catálogo de departamentos de CFE Transmisión Zona Guerrero. Cada unidad
 * de la flota se asigna a uno de estos departamentos (por el Administrador,
 * desde el Expediente en Flota) para que el Jefe de Departamento
 * correspondiente pueda verla en su panel — nunca las de otro departamento.
 */
export const DEPARTAMENTOS = [
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

export function obtenerNombreDepartamento(id) {
  return DEPARTAMENTOS.find((departamento) => departamento.id === id)?.nombre ?? "Sin departamento asignado";
}
