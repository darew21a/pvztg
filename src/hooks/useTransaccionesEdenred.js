import { useEffect, useState } from "react";
import { obtenerCargasEdenred, suscribirCargasEdenred } from "../data/edenredStore.js";

/** Hook reactivo sobre las cargas de Edenred (cada subida de reporte, con su propio detalle). */
export function useCargasEdenred() {
  const [cargas, setCargas] = useState(obtenerCargasEdenred());

  useEffect(() => {
    return suscribirCargasEdenred(setCargas);
  }, []);

  return cargas;
}
