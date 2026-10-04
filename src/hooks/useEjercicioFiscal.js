import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ============================================================================
 * EJERCICIO FISCAL (MÓDULO 2)
 * ============================================================================
 * Ni el Dashboard ni el Perfil de unidad deben acumular datos
 * infinitamente - siempre se opera sobre UN año a la vez (12 meses,
 * enero-diciembre). Este hook es la única fuente de esa regla: recibe el
 * historial completo (de una unidad o de toda la flota ya combinado) y
 * regresa SOLO los 12 meses del año seleccionado, con los meses faltantes
 * rellenados en cero - nunca mezcla dos años en el mismo total.
 *
 * El año actual se vuelve a comprobar al cambiar de año, incluso si la
 * pantalla permanece abierta. La selección que estaba en el año actual
 * avanza al nuevo año; una selección histórica intencional se conserva.
 * ============================================================================
 */

/**
 * @param {Array<{ mes: string, km: number, litros: number, importe: number }>} historial
 * @returns {{
 *   anioActual: number,
 *   anioSeleccionado: number,
 *   setAnioSeleccionado: (anio: number) => void,
 *   aniosDisponibles: number[],
 *   mesesDelAnio: Array<{ mes: string, km: number, litros: number, importe: number }>,  Siempre 12, enero a diciembre, ceros donde no hay dato.
 *   totales: { km: number, litros: number, importe: number },
 *   esAnioActual: boolean,
 * }}
 */
export function useEjercicioFiscal(historial) {
  const anioActual = useActualYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
  const anioActualAnterior = useRef(anioActual);

  const historialSeguro = historial ?? EMPTY_ARRAY;

  const aniosDisponibles = useMemo(() => {
    return obtenerAniosDisponibles(historialSeguro.map((registro) => Number(registro.mes.slice(0, 4))), anioActual);
  }, [historialSeguro, anioActual]);

  useEffect(() => {
    const anioAnterior = anioActualAnterior.current;
    if (anioAnterior !== anioActual) {
      anioActualAnterior.current = anioActual;
      setAnioSeleccionado((seleccionado) => (seleccionado === anioAnterior ? anioActual : seleccionado));
    }
  }, [anioActual]);

  const mesesDelAnio = useMemo(
    () =>
      Array.from({ length: 12 }, (_, indiceMes) => {
        const clave = `${anioSeleccionado}-${String(indiceMes + 1).padStart(2, "0")}`;
        return historialSeguro.find((registro) => registro.mes === clave) ?? { mes: clave, km: 0, litros: 0, importe: 0 };
      }),
    [historialSeguro, anioSeleccionado],
  );

  const totales = useMemo(
    () =>
      mesesDelAnio.reduce(
        (acumulado, registro) => ({
          km: acumulado.km + registro.km,
          litros: acumulado.litros + registro.litros,
          importe: acumulado.importe + registro.importe,
        }),
        { km: 0, litros: 0, importe: 0 },
      ),
    [mesesDelAnio],
  );

  return {
    anioActual,
    anioSeleccionado,
    setAnioSeleccionado,
    aniosDisponibles,
    mesesDelAnio,
    totales,
    esAnioActual: anioSeleccionado === anioActual,
  };
}

export function useActualYear() {
  const [revisionAnual, setRevisionAnual] = useState(0);
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    const milisegundosHastaProximoAnio = new Date(anioActual + 1, 0, 1).getTime() - Date.now();
    const demora = Math.min(Math.max(milisegundosHastaProximoAnio + 50, 50), MAX_TIMEOUT);
    const timeout = setTimeout(() => setRevisionAnual((revision) => revision + 1), demora);
    return () => clearTimeout(timeout);
  }, [anioActual, revisionAnual]);

  return anioActual;
}

/**
 * Muestra los años desde el inicio del sistema hasta el actual, además de
 * cualquier año con registros históricos. Así no se anuncian años futuros
 * vacíos y los ejercicios nuevos se van agregando al avanzar el calendario.
 */
export function obtenerAniosDisponibles(aniosRegistrados = [], anioActual = new Date().getFullYear()) {
  const anioInicial = Math.min(ANIO_INICIO_SISTEMA, anioActual);
  const anios = new Set();
  for (let anio = anioInicial; anio <= anioActual; anio += 1) {
    anios.add(anio);
  }
  aniosRegistrados.forEach((anio) => {
    if (Number.isInteger(anio)) anios.add(anio);
  });
  return [...anios].sort((a, b) => b - a);
}

const EMPTY_ARRAY = [];
const ANIO_INICIO_SISTEMA = 2026;
const MAX_TIMEOUT = 2_147_000_000;
