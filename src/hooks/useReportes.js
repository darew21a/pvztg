import { useEffect, useState } from "react";
import { obtenerReportes, suscribirReportes } from "../data/reportesStore.js";
import { reemplazarReportes } from "../data/reportesStore.js";
import { obtenerReportesApi } from "../services/reporteService.js";
import { crearCargaCompartida } from "../utils/cargaCompartida.js";

const cargarReportesCompartidos = crearCargaCompartida(() => obtenerReportesApi().then((remotos) => {
  reemplazarReportes(remotos);
  return remotos;
}));

/** Hook reactivo sobre el store de reportes de unidad (ver `useUnidades` para el patrón equivalente). */
export function useReportes() {
  const [reportes, setReportes] = useState(obtenerReportes());

  useEffect(() => {
    const limpiar = suscribirReportes(setReportes);
    cargarReportesCompartidos().catch((error) => {
      console.error("No fue posible cargar reportes desde la API.", error);
    });
    const timer = window.setInterval(() => {
      cargarReportesCompartidos(true).catch((error) => console.error("No fue posible actualizar reportes desde la API.", error));
    }, 15000);
    return () => {
      window.clearInterval(timer);
      limpiar();
    };
  }, []);

  return reportes;
}
