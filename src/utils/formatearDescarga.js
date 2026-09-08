/**
 * Genera un nombre de archivo limpio y estandarizado para las descargas de la flota.
 * @param {string} economico - Número económico del vehículo (Ej: "ECO 102")
 * @param {string} tipoDocumento - Tipo de archivo (Ej: "seguro", "tarjeta-circulacion")
 * @param {string} fechaCarga - Fecha en formato ISO string
 * @returns {string} Nombre formateado listo para el atributo download (Ej: "ECO-102-poliza-seguro-2026.pdf")
 */
export function obtenerNombreDescarga(economico, tipoDocumento, fechaCarga) {
  // 1. Limpiar el número económico: quitar espacios y poner guiones
  const economicoLimpio = (economico || "unidad")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");

  // 2. Traducir el tipo de documento a un nombre legible e institucional
  let tipoLegible = "documento";
  if (tipoDocumento === "seguro") {
    tipoLegible = "poliza-seguro";
  } else if (tipoDocumento === "tarjeta-circulacion" || tipoDocumento === "tarjeta") {
    tipoLegible = "tarjeta-circulacion";
  }

  // 3. Extraer el año de la fecha de carga
  const anio = fechaCarga ? new Date(fechaCarga).getFullYear() : new Date().getFullYear();

  // 4. Retornar el nombre final estructurado con extensión PDF
  return `${economicoLimpio}-${tipoLegible}-${anio}.pdf`;
}