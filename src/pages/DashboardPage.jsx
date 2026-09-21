import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { detectarVinDuplicados } from "../utils/edenredParser.js";
import { combinarHistorialDeFlota } from "../utils/combinarHistorialFlota.js";
import { useEjercicioFiscal } from "../hooks/useEjercicioFiscal.js";
import { generarPdfCierreAnual } from "../utils/generarPdfCierreAnual.js";
import SelectorAnioFiscal from "../components/flota/SelectorAnioFiscal.jsx";
import BandejaReportes from "../components/flota/BandejaReportes.jsx";

/**
 * ============================================================================
 * DASHBOARD PRINCIPAL
 * ============================================================================
 * Todos los KPIs se calculan en vivo a partir del store de unidades/reportes
 * (no hay números fijos). El widget de "Bitácora Reciente" del prototipo
 * original se quitó por completo - dependía de fotos de odómetro que el
 * conductor ya no captura - y se sustituyó por "Unidades por Completar":
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

  // Acumulado de 12 meses de TODA la flota (no por unidad) - ver
  // src/utils/historicoAnual.js. Cuando el ciclo llega a 12 meses queda
  // listo para "congelarse" como histórico anual (ver server-design/).
  const ejercicioFiscalFlota = useEjercicioFiscal(useMemo(() => combinarHistorialDeFlota(unidades), [unidades]));

  function handleDescargarPdfFlota() {
    const url = generarPdfCierreAnual({
      anio: ejercicioFiscalFlota.anioSeleccionado,
      titulo: "Flota Vehicular Completa - CFE Transmisión Zona Guerrero",
      mesesDelAnio: ejercicioFiscalFlota.mesesDelAnio,
      totales: ejercicioFiscalFlota.totales,
    });
    window.open(url, "_blank");
  }

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

        <BandejaReportes />

        {/* Ejercicio Fiscal de la flota - año en curso por defecto, 12 meses fijos, sin acumulación infinita (Módulo 2) */}
        <div className="bento-item bg-surface-container-lowest rounded-xl p-6 mt-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h3 className="font-title-md text-title-md text-on-surface">Acumulado de Flota - Ejercicio Fiscal</h3>
            <SelectorAnioFiscal
              anioSeleccionado={ejercicioFiscalFlota.anioSeleccionado}
              setAnioSeleccionado={ejercicioFiscalFlota.setAnioSeleccionado}
              aniosDisponibles={ejercicioFiscalFlota.aniosDisponibles}
              esAnioActual={ejercicioFiscalFlota.esAnioActual}
              onDescargarPdf={handleDescargarPdfFlota}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TarjetaAcumulado etiqueta="Km recorridos (flota entera)" valor={`${ejercicioFiscalFlota.totales.km.toLocaleString("es-MX")} km`} />
            <TarjetaAcumulado etiqueta="Litros consumidos (flota entera)" valor={`${ejercicioFiscalFlota.totales.litros.toLocaleString("es-MX")} L`} />
            <TarjetaAcumulado etiqueta="Importe total (flota entera)" valor={`$${ejercicioFiscalFlota.totales.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
          </div>
        </div>

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
                          {unidad.marca} {unidad.submarca} - {unidad.numeroSerie.slice(-6)}
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
                <span>{unidad.economico ?? unidad.numeroSerie.slice(-6)} - {unidad.marca} {unidad.submarca}</span>
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
                <span>{unidad.economico ?? unidad.numeroSerie.slice(-6)} - {unidad.marca} {unidad.submarca}</span>
                <span className="font-technical-mono text-technical-mono">{totalLitros.toFixed(0)} L · {totalKm.toLocaleString("es-MX")} km</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Kilómetros recorridos totales por unidad - antes solo se mostraban litros en este ranking. */}
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
                  <td className="py-1 pr-4">{unidad.economico ?? unidad.numeroSerie.slice(-6)} - {unidad.marca} {unidad.submarca}</td>
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

function GraficaConsumoMensual({ unidades }) {
  const [metrica, setMetrica] = useState("litros");
  const [mesActivo, setMesActivo] = useState(null);

  const datosMensuales = useMemo(() => {
    const acumulado = new Map();
    unidades.forEach((unidad) => {
      unidad.historialCombustible.forEach(({ mes, km, litros, importe }) => {
        const actual = acumulado.get(mes) ?? { totalKm: 0, totalLitros: 0, totalImporte: 0, unidades: 0 };
        acumulado.set(mes, {
          totalKm: actual.totalKm + (Number(km) || 0),
          totalLitros: actual.totalLitros + (Number(litros) || 0),
          totalImporte: actual.totalImporte + (Number(importe) || 0),
          unidades: actual.unidades + 1,
        });
      });
    });
    return [...acumulado.entries()]
      .map(([mes, datos]) => ({
        mes,
        ...datos,
        promedioKm: datos.totalKm / datos.unidades,
        promedioLitros: datos.totalLitros / datos.unidades,
        promedioImporte: datos.totalImporte / datos.unidades,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [unidades]);

  const metricas = {
    litros: { etiqueta: "Litros promedio", unidad: "L", valor: (dato) => dato.promedioLitros, color: "#006847", colorSuave: "#9ff4c9" },
    km: { etiqueta: "Kilómetros promedio", unidad: "km", valor: (dato) => dato.promedioKm, color: "#0f766e", colorSuave: "#99f6e4" },
    importe: { etiqueta: "Importe promedio", unidad: "$", valor: (dato) => dato.promedioImporte, color: "#b45309", colorSuave: "#fde68a" },
  };
  const metricaActual = metricas[metrica];
  const puntos = datosMensuales.map((dato) => ({ ...dato, valor: metricaActual.valor(dato) }));
  const maximo = Math.max(...puntos.map((punto) => punto.valor), 1);
  const datoActivo = puntos.find((punto) => punto.mes === mesActivo);
  const formatearValor = (valor) => metrica === "importe" ? `$${Math.round(valor).toLocaleString("es-MX")}` : `${Math.round(valor).toLocaleString("es-MX")} ${metricaActual.unidad}`;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Tendencia mensual</p>
          <p className="mt-1 text-sm text-on-surface-variant">Promedio entre unidades con movimiento registrado</p>
        </div>
        <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-low p-1" role="tablist" aria-label="Métrica de consumo">
          {Object.entries(metricas).map(([clave, datos]) => (
            <button key={clave} type="button" onClick={() => setMetrica(clave)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${metrica === clave ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>
              {datos.etiqueta.replace(" promedio", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px]">
        <div className="relative min-w-0 overflow-hidden rounded-xl border border-outline-variant/50 bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary-fixed/20 blur-2xl" />
          <div className="relative h-[280px]" role="img" aria-label={`Gráfica de ${metricaActual.etiqueta.toLowerCase()} por mes`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-9 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((nivel) => (
                <div key={nivel} className="flex items-center gap-2"><span className="w-8 text-right text-[10px] text-on-surface-variant/70">{Math.round((maximo * nivel) / 100).toLocaleString("es-MX")}</span><span className="h-px flex-1 border-t border-dashed border-outline-variant/50" /></div>
              ))}
            </div>
            <div className="absolute inset-x-10 top-3 bottom-9 flex items-end justify-around gap-2 sm:gap-4">
              {puntos.map((punto, indice) => {
                const porcentaje = Math.max((punto.valor / maximo) * 100, 3);
                const activo = mesActivo === punto.mes;
                return (
                  <button key={punto.mes} type="button" onClick={() => setMesActivo((actual) => actual === punto.mes ? null : punto.mes)} className={`chart-bar-in group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${activo ? "bg-primary/10" : "hover:bg-primary/5"}`} style={{ animationDelay: `${indice * 70}ms` }} aria-label={`${punto.mes}: ${formatearValor(punto.valor)}`}>
                    <span className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-all group-hover:-translate-y-1 group-hover:opacity-100">{formatearValor(punto.valor)}</span>
                    <span className={`relative block w-full max-w-10 rounded-t-xl transition-all duration-500 group-hover:brightness-110 sm:max-w-14 ${activo ? "ring-2 ring-white ring-offset-2" : ""}`} style={{ height: `${porcentaje}%`, background: `linear-gradient(to top, ${metricaActual.color}, ${metricaActual.colorSuave})` }}><span className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/60" /></span>
                    <span className={`absolute -bottom-7 text-[10px] font-semibold ${activo ? "text-primary" : "text-on-surface-variant"}`}>{punto.mes.slice(5)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
          <div><div className="flex items-center justify-between gap-2"><p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Mes seleccionado</p><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metricaActual.color }} /></div><p className="mt-3 font-technical-mono text-technical-mono text-2xl font-semibold text-on-surface">{datoActivo?.mes ?? "Selecciona un mes"}</p><p className="mt-1 text-sm text-on-surface-variant">{datoActivo ? metricaActual.etiqueta : "Consulta el detalle de cualquier barra"}</p><p className="mt-2 font-headline-lg-mobile text-headline-lg-mobile font-bold" style={{ color: metricaActual.color }}>{datoActivo ? formatearValor(datoActivo.valor) : "-"}</p></div>
          {datoActivo && <div className="mt-6 space-y-2 border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant"><p className="flex justify-between gap-2"><span>Unidades con datos</span><strong className="text-on-surface">{datoActivo.unidades}</strong></p><p className="flex justify-between gap-2"><span>Litros acumulados</span><strong className="text-on-surface">{Math.round(datoActivo.totalLitros).toLocaleString("es-MX")} L</strong></p><p className="flex justify-between gap-2"><span>Km acumulados</span><strong className="text-on-surface">{Math.round(datoActivo.totalKm).toLocaleString("es-MX")}</strong></p></div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {puntos.map((punto, indice) => (
          <button key={`resumen-${punto.mes}`} type="button" onClick={() => setMesActivo((actual) => actual === punto.mes ? null : punto.mes)} className={`chart-month-in group rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${mesActivo === punto.mes ? "border-primary bg-primary text-on-primary shadow-lift" : "border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50"}`} style={{ animationDelay: `${indice * 55}ms` }}>
            <span className={`block text-xs font-semibold uppercase ${mesActivo === punto.mes ? "text-on-primary/75" : "text-on-surface-variant"}`}>{punto.mes}</span><span className={`mt-2 block font-technical-mono text-technical-mono text-lg font-bold ${mesActivo === punto.mes ? "text-on-primary" : "text-on-surface"}`}>{formatearValor(punto.valor)}</span><span className={`mt-1 block text-xs ${mesActivo === punto.mes ? "text-on-primary/75" : "text-on-surface-variant"}`}>{punto.unidades} unidad{punto.unidades === 1 ? "" : "es"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TarjetaAcumulado({ etiqueta, valor }) {
  return (
    <div className="bg-surface-container-low rounded-lg p-4">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">{etiqueta}</p>
      <p className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">{valor}</p>
    </div>
  );
}

export default DashboardPage;
