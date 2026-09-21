/**
 * ============================================================================
 * ACUMULACIÓN DE CICLOS DE 12 MESES (HISTÓRICO CONGELADO)
 * ============================================================================
 * Suma el km recorrido, litros consumidos e importe facturado de TODA la
 * flota (no de una sola unidad) mes por mes, hasta completar un ciclo de
 * 12 meses. Esto es lo que el Dashboard grafica/imprime como acumulado
 * anual, y es también la unidad de trabajo que se "congela" (consolida)
 * hacia el histórico de largo plazo una vez que el ciclo se completa -
 * ver `server-design/historico-anual.route.js` para el diseño del backend
 * que hará esa consolidación cuando exista.
 * ============================================================================
 */

/**
 * Suma el historial de combustible de TODAS las unidades, agrupado por
 * mes ("AAAA-MM"), y regresa los últimos 12 meses con datos (o menos, si
 * la flota todavía no acumula un año completo).
 * @param {Array<Object>} unidades  Flota completa (de `unidadesStore`).
 * @returns {{
 *   meses: Array<{ mes: string, km: number, litros: number, importe: number }>,
 *   totalKm: number, totalLitros: number, totalImporte: number,
 *   cicloCompleto: boolean,
 * }}
 */
export function calcularCicloDoceMeses(unidades) {
  const acumuladoPorMes = new Map();

  unidades.forEach((unidad) => {
    (unidad.historialCombustible ?? []).forEach((registro) => {
      const actual = acumuladoPorMes.get(registro.mes) ?? { mes: registro.mes, km: 0, litros: 0, importe: 0 };
      actual.km += registro.km;
      actual.litros += registro.litros;
      actual.importe += registro.importe;
      acumuladoPorMes.set(registro.mes, actual);
    });
  });

  const mesesOrdenados = [...acumuladoPorMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  const ultimos12 = mesesOrdenados.slice(-12);

  const totales = ultimos12.reduce(
    (acumulado, registro) => ({
      totalKm: acumulado.totalKm + registro.km,
      totalLitros: acumulado.totalLitros + registro.litros,
      totalImporte: acumulado.totalImporte + registro.importe,
    }),
    { totalKm: 0, totalLitros: 0, totalImporte: 0 },
  );

  return { meses: ultimos12, ...totales, cicloCompleto: mesesOrdenados.length >= 12 };
}

/**
 * Arma el "payload" que se enviaría al backend para congelar un ciclo de
 * 12 meses ya completo como histórico anual - ver
 * `server-design/historico-anual.route.js` para el endpoint que lo recibe.
 * No hace ninguna llamada de red todavía (no hay backend); es la forma
 * final que tendrá esa llamada cuando exista.
 * @param {{ meses: Array<Object>, totalKm: number, totalLitros: number, totalImporte: number }} ciclo
 * @returns {{ anioInicio: string, anioFin: string, meses: Array<Object>, totales: Object, consolidadoEn: string }}
 */
export function construirPayloadConsolidacion(ciclo) {
  return {
    anioInicio: ciclo.meses[0]?.mes ?? null,
    anioFin: ciclo.meses[ciclo.meses.length - 1]?.mes ?? null,
    meses: ciclo.meses,
    totales: { km: ciclo.totalKm, litros: ciclo.totalLitros, importe: ciclo.totalImporte },
    consolidadoEn: new Date().toISOString(),
  };
}
