/**
 * Suma el historial de combustible de TODAS las unidades, agrupado por
 * mes ("AAAA-MM"). Es el insumo que el Dashboard le pasa a
 * `useEjercicioFiscal` para ver el año completo de la flota entera, en
 * vez de una sola unidad.
 * @param {Array<Object>} unidades
 * @returns {Array<{ mes: string, km: number, litros: number, importe: number }>}
 */
export function combinarHistorialDeFlota(unidades) {
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

  return [...acumuladoPorMes.values()];
}
