import { coincideBusqueda } from "./coincideBusqueda.js";
import { ESTADOS_UNIDAD } from "../data/unidadesStore.js";

function obtenerValoresPrimitivos(valor, visitados = new WeakSet()) {
  if (valor === null || valor === undefined) return [];
  if (typeof valor === "string") return [valor];
  if (typeof valor === "number" || typeof valor === "bigint" || typeof valor === "boolean") return [String(valor)];
  if (typeof valor !== "object" || visitados.has(valor)) return [];

  visitados.add(valor);
  return Object.values(valor).flatMap((contenido) => obtenerValoresPrimitivos(contenido, visitados));
}

export function obtenerCamposBusquedaUnidad(unidad, obtenerNombreDepartamento = (id) => id) {
  const estado = ESTADOS_UNIDAD.find((opcion) => opcion.value === unidad.estado);
  const campos = {
    kilometraje: unidad.kilometraje,
    "tipo de combustible": unidad.tipoCombustible,
    departamento: unidad.departamento ?? obtenerNombreDepartamento(unidad.departamentoId),
    "número económico": unidad.economico,
    económico: unidad.economico,
    resguardante: unidad.conductorAsignado,
    "resguardante 2": unidad.resguardante2 ?? unidad.conductorAsignado2,
    marca: unidad.marca,
    submarca: unidad.submarca,
    tipo: unidad.tipo,
    modelo: unidad.modelo,
    placas: unidad.placas,
    "placas vigentes": unidad.placas2025,
    "no. de serie": unidad.numeroSerie,
    vin: unidad.numeroSerie,
    "r.p.e. resguardante": unidad.rpeResguardante,
    "centro gestor": unidad.centroGestor,
    "centro de costos": unidad.centroCostos,
    "ubicación técnica": unidad.ubicacionTecnica,
    arrendadora: unidad.arrendadora,
    estado: unidad.estado,
    "estado de la unidad": estado?.label ?? unidad.estado,
  };

  return {
    ...campos,
    "búsqueda global": [...obtenerValoresPrimitivos(unidad), ...obtenerValoresPrimitivos(campos)].join(" "),
  };
}

export function coincideUnidadBusqueda(unidad, texto, obtenerNombreDepartamento) {
  return coincideBusqueda(obtenerCamposBusquedaUnidad(unidad, obtenerNombreDepartamento), texto);
}
