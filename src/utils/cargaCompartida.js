import { getAuthHeaders } from "../services/apiAuth.js";

function obtenerClaveSesion() {
  return getAuthHeaders().Authorization ?? "";
}

export function crearCargaCompartida(cargar) {
  const cargas = new Map();
  return (forzar = false, token) => {
    const clave = token ?? obtenerClaveSesion();
    if (forzar) cargas.delete(clave);
    if (!cargas.has(clave)) {
      cargas.set(clave, cargar(token).catch((error) => {
        cargas.delete(clave);
        throw error;
      }));
    }
    return cargas.get(clave);
  };
}
