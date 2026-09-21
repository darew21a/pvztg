/**
 * Extrae hasta 2 iniciales de un nombre completo. Se usa como avatar del
 * auditor en toda la app: por requisito, el perfil del auditor nunca usa
 * una foto subida, siempre son las iniciales de su nombre.
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
