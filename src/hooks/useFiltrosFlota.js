import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useActualYear } from "./useEjercicioFiscal.js";

/**
 * ============================================================================
 * NÚCLEO ARQUITECTÓNICO: FILTRADO CRUZADO CENTRALIZADO
 * ============================================================================
 * Un solo lugar para toda la lógica de "embudo de filtros" del ecosistema:
 * Detalle de Transacciones (Edenred), Historial de Combustible (Flota),
 * Buscador de Flota Vehicular y Módulo de Análisis de Combustible. Se
 * importa aquí, no se reescribe en cada pantalla.
 *
 * Diseño: la UI mantiene los campos SEPARADOS (input de Placa, input de
 * Económico, select de Año, select de Mes, etc. - nunca una sola barra de
 * búsqueda). Este hook recibe esos valores independientes y los fusiona
 * en cadena con `&&`: cada filtro con valor activo debe cumplirse para
 * que el registro pase - así se pueden cruzar varios campos a la vez.
 *
 * Como cada pantalla trabaja con una forma de dato distinta (transacciones
 * crudas de Edenred, unidades de Flota, registros mensuales de combustible),
 * el hook no asume la forma del objeto: recibe "extractores" - funciones
 * que saben cómo sacarle la placa/económico/fecha a CADA tipo de dato. Así
 * el mismo hook sirve para los 4 módulos sin duplicar la lógica de cruce.
 * ============================================================================
 */

/**
 * @typedef {Object} ExtractoresFiltro
 * @property {(item: any) => string | null} [obtenerPlaca]
 * @property {(item: any) => string | null} [obtenerEconomico]
 * @property {(item: any) => string | null} [obtenerDepartamento]  Id del departamento del registro (ej. "lineas") - el filtro compara contra este id, no contra el nombre visible.
 * @property {(item: any) => Date | null} [obtenerFecha]  Debe regresar un objeto Date (o null si no aplica) para ese registro.
 */

/** Normaliza texto para comparar identificadores de forma exacta, sin importar mayúsculas/espacios. */
function normalizar(valor) {
  return String(valor ?? "").trim().toUpperCase();
}

/**
 * Hook de estado de los filtros - cada pantalla lo usa para controlar sus
 * propios inputs separados (Placa, Económico, Año, Mes, Día, Hora), sin
 * duplicar el patrón de `useState` + `setFiltro` en cada módulo.
 * @returns {{ filtros: Object, setFiltro: Function, limpiarFiltros: Function }}
 */
export function useEstadoFiltrosFlota() {
  const anioActual = useActualYear();
  const anioAnterior = useRef(anioActual);
  const [filtros, setFiltros] = useState(() => ({
    placa: "",
    economico: "",
    departamento: "",
    anio: String(anioActual),
    mes: "",
    dia: "",
    hora: "",
  }));

  useEffect(() => {
    const anioPrevio = anioAnterior.current;
    if (anioPrevio === anioActual) return;
    anioAnterior.current = anioActual;
    setFiltros((actuales) => (
      actuales.anio === String(anioPrevio)
        ? { ...actuales, anio: String(anioActual) }
        : actuales
    ));
  }, [anioActual]);

  const setFiltro = useCallback((campo, valor) => {
    setFiltros((anteriores) => ({ ...anteriores, [campo]: valor }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      placa: "",
      economico: "",
      departamento: "",
      anio: String(anioActual),
      mes: "",
      dia: "",
      hora: "",
    });
  }, [anioActual]);

  return { filtros, setFiltro, limpiarFiltros };
}

/**
 * FASE A - Embudo de filtros cruzados. Aplica, en cadena con `&&`, cada
 * filtro que tenga valor. Un filtro vacío ("") no descarta nada (se salta).
 *
 * @param {Array<any>} items                 Lista cruda a filtrar (transacciones, unidades, registros mensuales…).
 * @param {Object} filtros                    Del estado de `useEstadoFiltrosFlota` - { placa, economico, anio, mes, dia, hora }.
 * @param {ExtractoresFiltro} extractores     Funciones para leer placa/económico/fecha de CADA tipo de item.
 * @returns {Array<any>} Los items que cumplen todos los filtros activos.
 */
export function useFiltrosFlota(items, filtros, extractores) {
  const { obtenerPlaca, obtenerEconomico, obtenerDepartamento, obtenerFecha } = extractores;

  return useMemo(() => {
    const placaBuscada = filtros.placa ? normalizar(filtros.placa) : null;
    const economicoBuscado = filtros.economico ? normalizar(filtros.economico) : null;
    const departamentoBuscado = filtros.departamento || null; // los id de departamento ya vienen normalizados (slug), no necesitan mayúsculas
    const anioBuscado = filtros.anio ? Number(filtros.anio) : null;
    const mesBuscado = filtros.mes ? Number(filtros.mes) : null; // 1-12
    const diaBuscado = filtros.dia ? Number(filtros.dia) : null;
    const horaBuscada = filtros.hora !== "" && filtros.hora != null ? Number(filtros.hora) : null; // 0-23

    return items.filter((item) => {
      // Identificación - comparación EXACTA (normalizada), como pide el cruce de datos.
      if (placaBuscada && obtenerPlaca && normalizar(obtenerPlaca(item)) !== placaBuscada) return false;
      if (economicoBuscado && obtenerEconomico && normalizar(obtenerEconomico(item)) !== economicoBuscado) return false;
      if (departamentoBuscado && obtenerDepartamento && obtenerDepartamento(item) !== departamentoBuscado) return false;

      // Temporales - cada uno se evalúa por separado sobre la misma fecha del registro.
      if ((anioBuscado || mesBuscado || diaBuscado || horaBuscada !== null) && obtenerFecha) {
        const fecha = obtenerFecha(item);
        if (!fecha) return false;
        if (anioBuscado && fecha.getFullYear() !== anioBuscado) return false;
        if (mesBuscado && fecha.getMonth() + 1 !== mesBuscado) return false;
        if (diaBuscado && fecha.getDate() !== diaBuscado) return false;
        if (horaBuscada !== null && fecha.getHours() !== horaBuscada) return false;
      }

      return true;
    });
  }, [items, filtros.placa, filtros.economico, filtros.departamento, filtros.anio, filtros.mes, filtros.dia, filtros.hora, obtenerPlaca, obtenerEconomico, obtenerDepartamento, obtenerFecha]);
}
