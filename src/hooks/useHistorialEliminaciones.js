import { useEffect, useState } from "react";
import { obtenerHistorialEliminaciones, suscribirHistorialEliminaciones } from "../data/historialEliminacionesStore.js";

export function useHistorialEliminaciones() {
  const [historial, setHistorial] = useState(obtenerHistorialEliminaciones());

  useEffect(() => {
    return suscribirHistorialEliminaciones(setHistorial);
  }, []);

  return historial;
}
