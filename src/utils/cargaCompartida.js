import { getAuthHeaders } from "../services/apiAuth.js";

function obtenerClaveSesion() {
  return getAuthHeaders().Authorization ?? "";
}

export function crearCargaCompartida(cargar) {
  const cargas = new Map();
  return (forzar = false) => {
    const clave = obtenerClaveSesion();
    if (forzar) cargas.delete(clave);
    if (!cargas.has(clave)) {
      cargas.set(clave, cargar().catch((error) => {
        cargas.delete(clave);
        throw error;
      }));
    }
    return cargas.get(clave);
  };
}
