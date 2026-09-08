import { useMemo } from "react";
import { Link } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { detectarVinDuplicados } from "../utils/edenredParser.js";
import BandejaMensajesYReportes from "../components/flota/BandejaMensajesYReportes.jsx";

/**
 * ============================================================================
 * DASHBOARD PRINCIPAL
 * ============================================================================
 * Todos los KPIs se calculan en vivo a partir del store de unidades/reportes
 * (no hay números fijos). El widget de "Bitácora Reciente" del prototipo
 * original se quitó por completo — dependía de fotos de odómetro que el
 * conductor ya no captura — y se sustituyó por "Unidades por Completar":
 * un widget de calidad de datos que señala qué unidades migradas del Excel
 * aún no tienen económico o placas capturadas, para que el auditor sepa
 * exactamente dónde falta trabajo de captura.
 * ============================================================================
 */
function DashboardPage() {
  const unidades = useUnidades();
  const reportes = useReportes();

  const kpis = useMemo(() => {
    const activas = unidades.filter((u) => u.estado === "en-ruta" || u.estado === "en-estacion").length;
    const enTaller = unidades.filter((u) => u.estado === "taller").length;
    const idsConReporte = new Set(reportes.flatMap((r) => r.unidadesIds ?? []));
    return { activas, enTaller, conReporte: idsConReporte.size };
  }, [unidades, reportes]);

  // Consumo de combustible: se alimenta desde el análisis de archivos de
  // Edenred (módulo de Auditoría). Mientras no se haya cargado ningún
  // reporte, se muestra un estado vacío en vez de inventar cifras.
  const unidadesConConsumo = unidades.filter((u) => u.historialCombustible?.length > 0);
  const hayDatosCombustible = unidadesConConsumo.length > 0;

  const unidadesIncompletas = useMemo(
    () => unidades.filter((u) => !u.economico || !u.placas || u.placas === "BLANCA"),
    [unidades],
  );

  // VIN duplicado = el mismo vehículo quedó registrado 2 veces en el Excel
  // original (típico de hojas de "traspasos" no depuradas). Como el VIN es
  // la llave interna, un duplicado deja una de las dos filas inaccesible.
  const vinDuplicados = useMemo(() => detectarVinDuplicados(unidades), [unidades]);

  return (
    <>
      <TopNavBar activeTab="Resumen" searchPlaceholder="Buscar..." />
      <main className="p-margin-desktop pt-8 pb-20">
        <div className="mb-8">
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2">Resumen General</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Monitoreo en tiempo real de la flota CFE Transmisión.</p>
        </div>

        <BandejaMensajesYReportes />

        <div className="bento-container mt-6">
          {/* KPI 1: Unidades activas (en ruta o en estación) */}
          <div className="bento-item bg-surface-container-lowest rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-title-md text-title-md text-on-surface">Unidades Activas</span>
              <span className="material-symbols-outlined text-primary p-2 bg-primary-container/10 rounded-lg">local_shipping</span>
            </div>
            <div className="mt-auto">
              <span className="font-display-lg text-display-lg block mb-1">{kpis.activas}</span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/30 px-2 py-1 rounded-full uppercase">
                de {unidades.length} unidades
              </span>
            </div>
          </div>

          {/* KPI 2: En mantenimiento/taller */}
          <div className="bento-item bg-surface-container-lowest rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="font-title-md text-title-md text-on-surface">En Mantenimiento</span>
              <span className="material-symbols-outlined text-outline p-2 bg-surface-variant rounded-lg">build</span>
            </div>
            <div className="mt-auto">
              <span className="font-display-lg text-display-lg block mb-1">{kpis.enTaller}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-variant px-2 py-1 rounded-full uppercase">En Taller</span>
            </div>
          </div>

          {/* KPI 3: Unidades con reporte abierto */}
          <div className="bento-item bg-error-container/30 rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between border-error/20">
            <div className="flex justify-between items-start mb-4">
              <span className="font-title-md text-title-md text-on-error-container">Con Reporte</span>
              <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">error</span>
            </div>
            <div className="mt-auto">
              <span className="font-display-lg text-display-lg text-on-error-container block mb-1">{kpis.conReporte}</span>
              <Link to="/reportes" className="font-label-sm text-label-sm text-on-error-container bg-error/20 px-2 py-1 rounded-full uppercase hover:bg-error/30 transition-colors">
                Ver reportes
              </Link>
            </div>
          </div>

          {/* Gráfica: consumo de combustible promedio por mes */}
          <div className="bento-item bg-surface-container-lowest rounded-xl col-span-12 md:col-span-8 flex flex-col overflow-hidden min-h-[400px]">
            <div className="glass-header p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h3 className="font-title-md text-title-md text-on-surface">Consumo de Combustible Promedio (Mensual)</h3>
              <Link to="/auditoria-edenred" className="font-label-sm text-label-sm text-primary hover:underline">Cargar reporte Edenred</Link>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center">
              {hayDatosCombustible ? (
                <GraficaConsumoMensual unidades={unidadesConConsumo} />
              ) : (
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-5xl text-outline-variant">local_gas_station</span>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
                    Aún no hay datos de combustible. Se llenan automáticamente al subir un reporte de Edenred en Auditoría.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Widget nuevo: calidad de datos de la migración del Excel (reemplaza la bitácora) */}
          <div className="bento-item bg-surface-container-lowest rounded-xl col-span-12 md:col-span-4 flex flex-col max-h-[400px] overflow-hidden">
            <div className="glass-header p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h3 className="font-title-md text-title-md text-on-surface">Unidades por Completar</h3>
              <Link to="/flota" className="font-label-sm text-label-sm text-primary">Ir a Flota</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {vinDuplicados.length > 0 && (
                <div className="m-2 p-3 bg-error-container/20 border border-error-container/40 rounded-lg">
                  <p className="font-label-sm text-label-sm text-error uppercase mb-1">
                    {vinDuplicados.length} vehículo(s) duplicado(s) en la flota
                  </p>
                  {vinDuplicados.map(({ numeroSerie, unidades: dupes }) => (
                    <p key={numeroSerie} className="font-technical-mono text-technical-mono text-xs text-on-surface-variant">
                      VIN {numeroSerie.slice(-8)}: económicos {dupes.map((u) => u.economico ?? "s/e").join(" y ")}
                    </p>
                  ))}
                </div>
              )}
              {unidadesIncompletas.length === 0 ? (
                <p className="p-4 font-body-md text-body-md text-on-surface-variant">Todas las unidades tienen sus datos básicos completos.</p>
              ) : (
                <ul className="space-y-1">
                  {unidadesIncompletas.slice(0, 8).map((unidad) => (
                    <li key={unidad.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-tertiary">warning</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-body-md font-semibold text-on-surface truncate">
                          {unidad.marca} {unidad.submarca} — {unidad.numeroSerie.slice(-6)}
                        </p>
                        <p className="font-technical-mono text-technical-mono text-on-surface-variant text-xs truncate">
                          Falta: {!unidad.economico && "económico"} {(!unidad.placas || unidad.placas === "BLANCA") && "placas"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Ranking: unidades que más y menos combustible consumen */}
          <div className="bento-item bg-surface-container-lowest rounded-xl col-span-12 p-6">
            <h3 className="font-title-md text-title-md text-on-surface mb-4">Consumo por Unidad</h3>
            {hayDatosCombustible ? (
              <RankingConsumo unidades={unidadesConConsumo} />
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant">
                El ranking de mayor/menor consumo aparece aquí en cuanto haya al menos un reporte de Edenred cargado.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * Top 3 de unidades con mayor y menor consumo total acumulado, calculado a
 * partir del historial de combustible que Edenred aporta por unidad.
 */
function RankingConsumo({ unidades }) {
  const conTotal = unidades
    .map((unidad) => ({
      unidad,
      totalLitros: unidad.historialCombustible.reduce((suma, registro) => suma + registro.litros, 0),
      totalKm: unidad.historialCombustible.reduce((suma, registro) => suma + registro.km, 0),
    }))
    .sort((a, b) => b.totalLitros - a.totalLitros);

  const masConsumo = conTotal.slice(0, 3);
  const menosConsumo = conTotal.slice(-3).reverse();
  const porKm = [...conTotal].sort((a, b) => b.totalKm - a.totalKm);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="font-label-sm text-label-sm text-error uppercase tracking-wide mb-2">Mayor consumo (litros)</p>
          <ul className="space-y-2">
            {masConsumo.map(({ unidad, totalLitros, totalKm }) => (
              <li key={unidad.id} className="flex justify-between font-body-md text-body-md text-on-surface">
                <span>{unidad.economico ?? unidad.numeroSerie.slice(-6)} — {unidad.marca} {unidad.submarca}</span>
                <span className="font-technical-mono text-technical-mono">{totalLitros.toFixed(0)} L · {totalKm.toLocaleString("es-MX")} km</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wide mb-2">Menor consumo (litros)</p>
          <ul className="space-y-2">
            {menosConsumo.map(({ unidad, totalLitros, totalKm }) => (
              <li key={unidad.id} className="flex justify-between font-body-md text-body-md text-on-surface">
                <span>{unidad.economico ?? unidad.numeroSerie.slice(-6)} — {unidad.marca} {unidad.submarca}</span>
                <span className="font-technical-mono text-technical-mono">{totalLitros.toFixed(0)} L · {totalKm.toLocaleString("es-MX")} km</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Kilómetros recorridos totales por unidad — antes solo se mostraban litros en este ranking. */}
      <div>
        <p className="font-label-sm text-label-sm text-primary uppercase tracking-wide mb-2">Kilómetros recorridos totales (todas las unidades con datos)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="font-label-sm text-label-sm text-on-surface-variant uppercase border-b border-outline-variant/30">
              <tr>
                <th className="py-1 pr-4">Unidad</th>
                <th className="py-1 text-right">Km recorridos totales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {porKm.map(({ unidad, totalKm }) => (
                <tr key={unidad.id}>
                  <td className="py-1 pr-4">{unidad.economico ?? unidad.numeroSerie.slice(-6)} — {unidad.marca} {unidad.submarca}</td>
                  <td className="py-1 text-right font-technical-mono text-technical-mono">{totalKm.toLocaleString("es-MX")} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Gráfica de barras simple (SVG + Tailwind, sin librería externa) del
 * promedio de litros consumidos por mes entre todas las unidades con
 * historial de combustible cargado desde Edenred.
 */
function GraficaConsumoMensual({ unidades }) {
  const promediosPorMes = useMemo(() => {
    const acumulado = new Map();
    unidades.forEach((unidad) => {
      unidad.historialCombustible.forEach(({ mes, litros }) => {
        const actual = acumulado.get(mes) ?? { total: 0, conteo: 0 };
        acumulado.set(mes, { total: actual.total + litros, conteo: actual.conteo + 1 });
      });
    });
    return [...acumulado.entries()]
      .map(([mes, { total, conteo }]) => ({ mes, promedio: total / conteo }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [unidades]);

  const maximo = Math.max(...promediosPorMes.map((p) => p.promedio), 1);

  return (
    <div className="w-full h-full flex items-end justify-around gap-3 px-4">
      {promediosPorMes.map(({ mes, promedio }) => (
        <div key={mes} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
          <span className="font-technical-mono text-technical-mono text-xs text-on-surface-variant">{Math.round(promedio)} L</span>
          <div
            className="w-full bg-gradient-to-t from-primary to-primary-fixed rounded-t-md transition-all duration-700"
            style={{ height: `${(promedio / maximo) * 100}%` }}
          ></div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{mes}</span>
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;
