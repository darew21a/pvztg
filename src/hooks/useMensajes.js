import { useEffect, useState } from "react";
import { obtenerMensajes, suscribirMensajes } from "../data/mensajesStore.js";

export function useMensajes() {
  const [mensajes, setMensajes] = useState(obtenerMensajes());

  useEffect(() => {
    return suscribirMensajes(setMensajes);
  }, []);

  return mensajes;
}
