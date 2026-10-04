import { useEffect, useState } from "react";
import { obtenerUnidades, suscribirUnidades, reemplazarUnidades } from "../data/unidadesStore.js";
import { obtenerUnidadesApi } from "../services/unidadService.js";
import { crearCargaCompartida } from "../utils/cargaCompartida.js";

const cargarUnidadesCompartidas = crearCargaCompartida(() => obtenerUnidadesApi().then((remotas) => {
  reemplazarUnidades(remotas);
  return remotas;
}));

/**
 * Hook que expone la lista de unidades y se mantiene sincronizado cuando
 * cualquier componente edita, agrega o da de baja una unidad (el store es
 * la única fuente de verdad, ver `data/unidadesStore.js`).
 * @returns {Array<Object>} lista de unidades actualizada en tiempo real
 */
export function useUnidades() {
  const [unidades, setUnidades] = useState(obtenerUnidades());

  useEffect(() => {
    const limpiar = suscribirUnidades(setUnidades);
    cargarUnidadesCompartidas().catch((error) => {
      console.error("No fue posible cargar unidades desde la API.", error);
    });
    const timer = window.setInterval(() => {
      cargarUnidadesCompartidas(true).catch((error) => console.error("No fue posible actualizar unidades desde la API.", error));
    }, 15000);
    return () => {
      window.clearInterval(timer);
      limpiar();
    };
  }, []);

  return unidades;
}
