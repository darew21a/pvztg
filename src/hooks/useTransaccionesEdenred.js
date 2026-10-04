import { useEffect, useState } from "react";
import { obtenerCargasEdenred, suscribirCargasEdenred, reemplazarCargasEdenred } from "../data/edenredStore.js";
import { crearCargaCompartida } from "../utils/cargaCompartida.js";
import { obtenerTodasLasPaginas } from "../services/paginacionApi.js";

const cargarCargasCompartidas = crearCargaCompartida(() => obtenerTodasLasPaginas("/edenred/cargas")
  .then((remotas) => {
    reemplazarCargasEdenred(remotas);
    return remotas;
  }));

/** Hook reactivo sobre las cargas de Edenred (cada subida de reporte, con su propio detalle). */
export function useCargasEdenred() {
  const [cargas, setCargas] = useState(obtenerCargasEdenred());

  useEffect(() => {
    const limpiar = suscribirCargasEdenred(setCargas);
    cargarCargasCompartidas().catch((error) => {
      console.error("No fue posible cargar cargas Edenred desde la API.", error);
    });
    const timer = window.setInterval(() => {
      cargarCargasCompartidas(true).catch((error) => console.error("No fue posible actualizar cargas Edenred desde la API.", error));
    }, 15000);
    return () => {
      window.clearInterval(timer);
      limpiar();
    };
  }, []);

  return cargas;
}
