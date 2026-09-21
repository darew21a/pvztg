import { useEffect, useState } from "react";
import { obtenerDepartamentos, suscribirDepartamentos } from "../data/departamentosStore.js";

/** Lista de departamentos, reactiva a altas nuevas (N departamentos, sin límite fijo). */
export function useDepartamentos() {
  const [departamentos, setDepartamentos] = useState(obtenerDepartamentos());

  useEffect(() => {
    return suscribirDepartamentos(setDepartamentos);
  }, []);

  return departamentos;
}
