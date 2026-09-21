import { useMemo, useState } from "react";

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
 * "Reinicio automático" del 1 de enero: no existe código especial de
 * reseteo. `anioActual` se calcula con `new Date().getFullYear()` en cada
 * carga, así que en cuanto cambia el año del sistema, el hook
 * automáticamente parte de un año sin datos (ceros) - la data histórica
 * sigue intacta en la unidad, solo que ya no es "el año en curso".
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
  const anioActual = new Date().getFullYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);

  const historialSeguro = historial ?? [];

  // El año en curso siempre aparece como opción, aunque todavía no tenga
  // ni un solo mes con datos - así el Select nunca se queda "vacío" el
  // 1 de enero mientras no ha llegado el primer reporte del año nuevo.
  const aniosDisponibles = useMemo(() => {
    const anios = new Set(historialSeguro.map((registro) => Number(registro.mes.slice(0, 4))));
    anios.add(anioActual);
    return [...anios].sort((a, b) => b - a); // más reciente primero
  }, [historialSeguro, anioActual]);

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
