import { useEffect, useState } from "react";
import { obtenerUnidades, suscribirUnidades } from "../data/unidadesStore.js";

/**
 * Hook que expone la lista de unidades y se mantiene sincronizado cuando
 * cualquier componente edita, agrega o da de baja una unidad (el store es
 * la única fuente de verdad, ver `data/unidadesStore.js`).
 * @returns {Array<Object>} lista de unidades actualizada en tiempo real
 */
export function useUnidades() {
  const [unidades, setUnidades] = useState(obtenerUnidades());

  useEffect(() => {
    return suscribirUnidades(setUnidades);
  }, []);

  return unidades;
}
