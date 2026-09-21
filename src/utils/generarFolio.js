// src/utils/generarFolio.js

/**
 * Genera un folio institucional único e irrepetible para la plataforma.
 * Estructura resultante: PREFIJO-AAAAMMDD-HHMMSS-AA (Ej: PVZTG-20260907-143205-83)
 * 
 * @param {string} prefijo - Siglas que identifican el módulo (Ej: 'PVZTG', 'RPT', 'MNT')
 * @returns {string} Folio formal inalterable y único por segundo.
 */
export function generarFolioAleatorio(prefijo = "PVZTG") {
  const ahora = new Date();

  // 1. Formatear la fecha (AAAAMMDD)
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const fechaEstructurada = `${anio}${mes}${dia}`;

  // 2. Formatear el tiempo exacto (HHMMSS)
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
  const tiempoEstructurado = `${horas}${minutos}${segundos}`;

  // 3. Agregar un verificador aleatorio de 2 dígitos (00 a 99) para concurrencia simultánea
  const sufijoAleatorio = String(Math.floor(Math.random() * 100)).padStart(2, "0");

  // Resultado final: PVZTG-20260907-143205-83
  return `${prefijo}-${fechaEstructurada}-${tiempoEstructurado}-${sufijoAleatorio}`;
}
