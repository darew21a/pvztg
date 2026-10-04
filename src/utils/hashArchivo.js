/** Calcula un SHA-256 estable sobre los bytes originales del archivo. */
export async function hashArchivo(archivo) {
  const bytes = await archivo.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ordenar(valor) {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, ordenar(valor[clave])]));
  }
  return valor;
}

export async function hashObjeto(valor) {
  const bytes = new TextEncoder().encode(JSON.stringify(ordenar(valor)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
