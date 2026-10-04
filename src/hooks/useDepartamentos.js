import { useEffect, useState } from "react";
import { obtenerDepartamentos, suscribirDepartamentos, reemplazarDepartamentos } from "../data/departamentosStore.js";
import { obtenerDepartamentos as obtenerDepartamentosApi } from "../services/departamentoService.js";
import { crearCargaCompartida } from "../utils/cargaCompartida.js";

const cargarDepartamentosCompartidos = crearCargaCompartida(() => obtenerDepartamentosApi().then((remotos) => {
  reemplazarDepartamentos(remotos);
  return remotos;
}));

/** Lista de departamentos, reactiva a altas nuevas (N departamentos, sin límite fijo). */
export function useDepartamentos() {
  const [departamentos, setDepartamentos] = useState(obtenerDepartamentos());

  useEffect(() => {
    const limpiar = suscribirDepartamentos(setDepartamentos);
    cargarDepartamentosCompartidos().catch((error) => {
      console.error("No fue posible cargar departamentos desde la API.", error);
    });
    return limpiar;
  }, []);

  return departamentos;
}
