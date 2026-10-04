/**
 * Extrae hasta 2 iniciales de un nombre completo para los avatares de usuario.
 * @param {string | null | undefined} nombre
 * @returns {string}
 */
export function obtenerIniciales(nombre) {
  if (!nombre) return "??";
  const partes = nombre.trim().split(/\s+/);
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}
