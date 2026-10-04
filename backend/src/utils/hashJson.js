import crypto from "node:crypto";

function ordenar(valor) {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, ordenar(valor[clave])]));
  }
  return valor;
}

export function hashJson(valor) {
  return crypto.createHash("sha256").update(JSON.stringify(ordenar(valor))).digest("hex");
}
