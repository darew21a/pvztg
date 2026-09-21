import { useEffect, useState } from "react";
import { obtenerReportes, suscribirReportes } from "../data/reportesStore.js";

/** Hook reactivo sobre el store de reportes de unidad (ver `useUnidades` para el patrón equivalente). */
export function useReportes() {
  const [reportes, setReportes] = useState(obtenerReportes());

  useEffect(() => {
    return suscribirReportes(setReportes);
  }, []);

  return reportes;
}
