import * as XLSX from "xlsx";

/**
 * ============================================================================
 * ANÁLISIS DE REPORTES DE EDENRED
 * ============================================================================
 * Este módulo hace todo el trabajo pesado cuando el Administrador sube un
 * reporte de Edenred (el archivo crudo de la tarjeta de combustible, con
 * las columnas originales que Edenred entrega — no un resumen ya
 * procesado). El flujo es:
 *
 *   1. `leerArchivoEdenred`  → lee el .xlsx y regresa las transacciones
 *      crudas como objetos (una fila = una transacción de carga).
 *   2. `analizarTransacciones` → cruza cada transacción con la unidad
 *      correspondiente (por Placa), agrupa por unidad+mes, calcula
 *      kilómetros/litros/importe del periodo, y detecta anomalías.
 *
 * El resultado de `analizarTransacciones` es solo una VISTA PREVIA — nada
 * se guarda todavía. El componente que llama a esta función decide cuándo
 * confirmar y aplicar los cambios a `unidadesStore` (así el Administrador
 * puede revisar antes de que se actualice la flota).
 * ============================================================================
 */

/**
 * Las 48 columnas reales del reporte de Edenred, en el orden en que vienen
 * en el archivo. Se usa para el selector de columnas de la tabla detallada
 * (el Administrador puede elegir cuáles ver, más allá de las 3 principales:
 * kilómetros recorridos, litros consumidos e importe).
 */
export const CAMPOS_EDENRED = [

  "Num Tarjeta",
  "Id Vehículo",
  "No Comprobante",
  "Fecha transacción",
  "Razón social Afiliado",
  "Km Ant Transacción",
  "Km Transacción",
  "Recorrido",
  "Descripción Mercancía",
  "Cantidad Mercancía",
  "Precio Unitario Merc",
  "Saldo Ant Transacción",
  "Saldo Actual Después de Transacción",
  "Importe Neto",
  "Monto IVA",
  "% IVA",
  "Importe Transacción",
  "Placa",
  
];

/** Columnas que se muestran por defecto en la tabla detallada (las 3 que de verdad usan hoy, más contexto mínimo). */
export const CAMPOS_EDENRED_DEFAULT = ["Fecha transacción", "Placa", "Recorrido", "Cantidad Mercancía", "Importe Transacción"];

// Desviación de rendimiento real vs. de ficha técnica que dispara una alerta de anomalía.
const UMBRAL_DESVIACION_RENDIMIENTO = 0.15;

/**
 * Lee el archivo .xlsx de Edenred y regresa las transacciones como arreglo
 * de objetos. Busca automáticamente la fila de encabezados (el archivo real
 * trae varias filas de metadatos antes de la tabla), buscando la primera
 * fila que contenga "Placa" y "Fecha transacción" como valores de celda.
 * @param {File} archivo
 * @returns {Promise<Array<Object>>}
 */
export async function leerArchivoEdenred(archivo) {
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  // raw: true (por defecto) conserva las fechas como objetos Date reales.
  // Con raw:false, SheetJS las formatea a texto "DD/MM/AAAA" y JavaScript
  // interpreta esa cadena como MM/DD/AAAA (convención EE. UU.) al hacer
  // `new Date(...)`, leyendo "01/07/2026" (1 de julio) como 7 de enero.
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null });

  const indiceEncabezado = filas.findIndex(
    (fila) => fila.includes("Placa") && fila.some((valor) => String(valor).startsWith("Fecha transacción")),
  );
  if (indiceEncabezado === -1) {
    throw new Error("No se reconoce el formato del archivo: no se encontraron las columnas de Edenred esperadas.");
  }

  const encabezados = filas[indiceEncabezado].map((valor) => String(valor ?? "").trim().replace(/\s+$/, ""));
  const filasDeDatos = filas.slice(indiceEncabezado + 1).filter((fila) => fila.some((valor) => valor !== null && valor !== ""));

  return filasDeDatos.map((fila) => {
    const transaccion = {};
    encabezados.forEach((encabezado, indice) => {
      if (encabezado) transaccion[encabezado] = fila[indice];
    });
    return transaccion;
  });
}

/** Normaliza una placa para comparar sin importar mayúsculas/espacios. */
function normalizarPlaca(placa) {
  return String(placa ?? "").trim().toUpperCase();
}

/**
 * Distancia de Levenshtein simple, para sugerir la placa más parecida
 * cuando una placa de Edenred no coincide con ninguna unidad — útil para
 * detectar typos o placas reasignadas que difieren en 1-2 caracteres
 * (ej. "NVW3000" vs "NXW5000").
 */
function distanciaEdicion(a, b) {
  const filas = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  filas[0] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      filas[i][j] =
        a[i - 1] === b[j - 1]
          ? filas[i - 1][j - 1]
          : 1 + Math.min(filas[i - 1][j], filas[i][j - 1], filas[i - 1][j - 1]);
    }
  }
  return filas[a.length][b.length];
}

/**
 * Busca, entre las placas conocidas de la flota, la más parecida a una
 * placa sin coincidencia (a lo más 2 caracteres de diferencia). Se usa
 * para sugerir una posible reconciliación en vez de dejar la placa como
 * un callejón sin salida.
 */
function sugerirPlacaParecida(placaSinCoincidencia, placasConocidas) {
  let mejor = null;
  let mejorDistancia = 3; // más de 2 diferencias ya no se considera un typo razonable
  for (const candidata of placasConocidas) {
    const distancia = distanciaEdicion(placaSinCoincidencia, candidata);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = candidata;
    }
  }
  return mejor;
}

/** Convierte una fecha de transacción (Date, string o serial de Excel) al formato "AAAA-MM". */
function obtenerMes(fechaTransaccion) {
  const fecha = fechaTransaccion instanceof Date ? fechaTransaccion : new Date(fechaTransaccion);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Construye el índice placa→unidad para el cruce. Si dos unidades de la
 * flota comparten la misma placa (ocurre en los datos reales, ej.
 * "NXW5000"), no se le puede atribuir la transacción a una sola con
 * certeza — esas placas se separan en `placasAmbiguas` y su consumo se
 * cuenta igual (nada se pierde), pero queda pendiente de que el
 * Administrador decida a cuál unidad aplicarlo (ver `resumenAmbiguo`).
 */
export function construirIndicePorPlaca(unidades) {
  const conteoPorPlaca = new Map();
  unidades
    .filter((unidad) => unidad.placas && unidad.placas !== "BLANCA")
    .forEach((unidad) => {
      const clave = normalizarPlaca(unidad.placas);
      const lista = conteoPorPlaca.get(clave) ?? [];
      lista.push(unidad);
      conteoPorPlaca.set(clave, lista);
    });

  const indice = new Map();
  const placasAmbiguas = new Set();
  for (const [placa, unidadesConEsaPlaca] of conteoPorPlaca) {
    if (unidadesConEsaPlaca.length > 1) {
      placasAmbiguas.add(placa);
    } else {
      indice.set(placa, unidadesConEsaPlaca[0]);
    }
  }
  return { indice, placasAmbiguas };
}

/**
 * Analiza las transacciones crudas contra la flota actual. No modifica
 * nada — regresa un reporte de vista previa para que el Administrador lo
 * confirme antes de aplicarlo.
 *
 * @param {Array<Object>} transacciones  Resultado de `leerArchivoEdenred`.
 * @param {Array<Object>} unidades       Flota actual (de `unidadesStore`).
 * @returns {{
 *   meses: string[],
 *   resumenPorUnidad: Array<{ unidad: Object, mes: string, km: number, litros: number, importe: number, kilometrajeActual: number, anomalias: string[] }>,
 *   resumenAmbiguo: Array<{ placa: string, mes: string, km: number, litros: number, importe: number, kilometrajeActual: number, candidatos: Object[] }>,
 *   unidadesConMovimiento: Set<string>,
 *   unidadesSinMovimiento: Array<Object>,
 *   placasSinCoincidencia: Array<{ placa: string, sugerencia: string | null }>,
 *   totalTransaccionesAprobadas: number,
 *   totalTransaccionesRechazadas: number,
 * }}
 */
export function analizarTransacciones(transacciones, unidades) {
  const { indice: indicePorPlaca, placasAmbiguas } = construirIndicePorPlaca(unidades);

  const aprobadas = transacciones.filter((transaccion) => transaccion["Estado Transacción"] === "APROBADA");
  const totalTransaccionesRechazadas = transacciones.length - aprobadas.length;

  const acumuladoPorUnidadMes = new Map(); // clave: `${unidadId}|${mes}`
  const acumuladoAmbiguoPorPlacaMes = new Map(); // clave: `${placa}|${mes}` — placas de 2+ unidades, requieren decisión manual
  const placasSinCoincidencia = new Set();
  const mesesEncontrados = new Set();

  for (const transaccion of aprobadas) {
    const mes = obtenerMes(transaccion["Fecha transacción"]);
    if (!mes) continue;
    mesesEncontrados.add(mes);

    const placaNormalizada = normalizarPlaca(transaccion["Placa"]);

    // Placa compartida por 2+ unidades: SÍ se cuenta (no se pierde el dato),
    // pero queda en un grupo aparte hasta que el Administrador decida a
    // cuál unidad aplicarla — no se le puede atribuir a una sola sin que
    // alguien confirme cuál es la correcta.
    if (placasAmbiguas.has(placaNormalizada)) {
      const claveAmbigua = `${placaNormalizada}|${mes}`;
      const acumulado = acumuladoAmbiguoPorPlacaMes.get(claveAmbigua) ?? {
        placa: placaNormalizada,
        mes,
        km: 0,
        litros: 0,
        importe: 0,
        kilometrajeActual: 0,
        candidatos: unidades.filter((unidad) => normalizarPlaca(unidad.placas) === placaNormalizada),
      };
      acumulado.km += Number(transaccion["Recorrido"]) || 0;
      acumulado.litros += Number(transaccion["Cantidad Mercancía"]) || 0;
      acumulado.importe += Number(transaccion["Importe Transacción"]) || 0;
      acumulado.kilometrajeActual = Math.max(acumulado.kilometrajeActual, Number(transaccion["Km Transacción"]) || 0);
      acumuladoAmbiguoPorPlacaMes.set(claveAmbigua, acumulado);
      continue;
    }

    const unidad = indicePorPlaca.get(placaNormalizada);
    if (!unidad) {
      placasSinCoincidencia.add(placaNormalizada);
      continue;
    }

    const clave = `${unidad.id}|${mes}`;
    const acumulado = acumuladoPorUnidadMes.get(clave) ?? {
      unidad,
      mes,
      km: 0,
      litros: 0,
      importe: 0,
      kilometrajeActual: 0,
      anomalias: [],
    };

    acumulado.km += Number(transaccion["Recorrido"]) || 0;
    acumulado.litros += Number(transaccion["Cantidad Mercancía"]) || 0;
    acumulado.importe += Number(transaccion["Importe Transacción"]) || 0;
    // El odómetro real más reciente es el mayor "Km Transacción" visto en el
    // periodo — así el Kilometraje de la unidad refleja la lectura real más
    // actual, no solo el recorrido acumulado del mes.
    acumulado.kilometrajeActual = Math.max(acumulado.kilometrajeActual, Number(transaccion["Km Transacción"]) || 0);

    // Regla 1: desviación de rendimiento real vs. de ficha técnica.
    const rendimientoFicha = Number(transaccion["Rendimiento Vehículo"]);
    const rendimientoReal = Number(transaccion["Rendimiento Real"]);
    if (rendimientoFicha > 0 && rendimientoReal >= 0) {
      const desviacion = Math.abs(rendimientoReal - rendimientoFicha) / rendimientoFicha;
      if (desviacion > UMBRAL_DESVIACION_RENDIMIENTO) {
        acumulado.anomalias.push(
          `Desviación de rendimiento del ${(desviacion * 100).toFixed(0)}% el ${obtenerMes(transaccion["Fecha transacción"])}`,
        );
      }
    }

    // Regla 2: capacidad de tanque excedida en una sola carga.
    const capacidadTanque = Number(transaccion["Capacidad de Tanque"]);
    const litrosCargados = Number(transaccion["Cantidad Mercancía"]);
    if (capacidadTanque > 0 && litrosCargados > capacidadTanque) {
      acumulado.anomalias.push(`Carga de ${litrosCargados}L excede la capacidad del tanque (${capacidadTanque}L)`);
    }

    acumuladoPorUnidadMes.set(clave, acumulado);
  }

  const resumenPorUnidad = [...acumuladoPorUnidadMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  const unidadesConMovimiento = new Set(resumenPorUnidad.map((registro) => registro.unidad.id));
  const unidadesSinMovimiento = unidades.filter((unidad) => unidad.estado !== "baja" && !unidadesConMovimiento.has(unidad.id));

  const todasLasPlacasConocidas = [...indicePorPlaca.keys(), ...placasAmbiguas];
  const placasSinCoincidenciaConSugerencia = [...placasSinCoincidencia].map((placa) => ({
    placa,
    sugerencia: sugerirPlacaParecida(placa, todasLasPlacasConocidas),
  }));

  const resumenAmbiguo = [...acumuladoAmbiguoPorPlacaMes.values()];

  return {
    meses: [...mesesEncontrados].sort(),
    resumenPorUnidad,
    resumenAmbiguo,
    unidadesConMovimiento,
    unidadesSinMovimiento,
    placasSinCoincidencia: placasSinCoincidenciaConSugerencia,
    totalTransaccionesAprobadas: aprobadas.length,
    totalTransaccionesRechazadas,
  };
}

/**
 * Detecta unidades con el mismo VIN duplicado dentro de la flota (ocurre
 * en los datos reales migrados de hojas de "traspasos", donde el mismo
 * vehículo queda registrado dos veces con económicos distintos). Como el
 * VIN se usa como llave interna, un duplicado hace que una de las dos
 * filas quede inaccesible — se reporta para que el Administrador fusione
 * o depure manualmente cuál es el registro vigente.
 * @param {Array<Object>} unidades
 * @returns {Array<{ numeroSerie: string, unidades: Array<Object> }>}
 */
export function detectarVinDuplicados(unidades) {
  const porVin = new Map();
  unidades.forEach((unidad) => {
    if (!unidad.numeroSerie) return;
    const lista = porVin.get(unidad.numeroSerie) ?? [];
    lista.push(unidad);
    porVin.set(unidad.numeroSerie, lista);
  });
  return [...porVin.entries()]
    .filter(([, lista]) => lista.length > 1)
    .map(([numeroSerie, lista]) => ({ numeroSerie, unidades: lista }));
}
