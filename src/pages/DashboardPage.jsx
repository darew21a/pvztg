import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { combinarHistorialDeFlota } from "../utils/combinarHistorialFlota.js";
import { useEjercicioFiscal } from "../hooks/useEjercicioFiscal.js";
import { generarPdfCierreAnual } from "../utils/generarPdfCierreAnual.js";
import { mostrarPdfGenerado } from "../utils/mostrarPdfGenerado.js";
import SelectorAnioFiscal from "../components/flota/SelectorAnioFiscal.jsx";

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
    return mostrarPdfGenerado(() => generarPdfCierreAnual({
      anio: ejercicioFiscalFlota.anioSeleccionado,
      titulo: "Flota Vehicular Completa - CFE Transmisión Zona Guerrero",
      mesesDelAnio: ejercicioFiscalFlota.mesesDelAnio,
    }), `cierre-flota-${ejercicioFiscalFlota.anioSeleccionado}.pdf`);
  }

  return (
    <>
      <TopNavBar searchPlaceholder="Buscar..." />
      <main className="p-margin-desktop pt-8 pb-20">
        <section className="dashboard-welcome mb-7 flex flex-col gap-6 rounded-xl bg-primary px-6 py-7 text-on-primary shadow-md md:flex-row md:items-end md:justify-between md:px-9 md:py-8">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-fixed">CFE Transmisión · Zona Guerrero</p>
            <h1 className="font-headline-lg text-headline-lg text-on-primary">Resumen general</h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-white/85">
              Consulte el estado de la flota y acceda a las tareas de gestión más utilizadas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/flota" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary-fixed">
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">local_shipping</span>
              Consultar flota
            </Link>
            <Link to="/reportes" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">assignment</span>
              Revisar reportes
            </Link>
          </div>
        </section>

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
          <div className="dashboard-metric bento-item bg-surface-container-lowest rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between">
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
          <div className="dashboard-metric dashboard-metric--maintenance bento-item bg-surface-container-lowest rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between">
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
          <div className="dashboard-metric dashboard-metric--reports bento-item bg-error-container/30 rounded-xl p-6 col-span-12 md:col-span-4 flex flex-col justify-between border-error/20">
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
        <div className="table-scroll custom-scrollbar" role="region" tabIndex={0} aria-label="Kilómetros recorridos por unidad">
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
  const [mesEnVista, setMesEnVista] = useState(null);

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
    litros: { etiqueta: "Litros promedio", unidad: "L", valor: (dato) => dato.promedioLitros },
    km: { etiqueta: "Kilómetros promedio", unidad: "km", valor: (dato) => dato.promedioKm },
    importe: { etiqueta: "Importe promedio", unidad: "$", valor: (dato) => dato.promedioImporte },
  };
  const metricaActual = metricas[metrica];
  const puntos = datosMensuales.map((dato) => ({ ...dato, valor: metricaActual.valor(dato) }));
  const maximo = Math.max(...puntos.map((punto) => punto.valor), 1);
  const mesMostrado = mesEnVista ?? mesActivo;
  const datoActivo = puntos.find((punto) => punto.mes === mesMostrado);
  const promedioPeriodo = puntos.length
    ? puntos.reduce((suma, punto) => suma + punto.valor, 0) / puntos.length
    : 0;
  const formatearValor = (valor) => metrica === "importe" ? `$${Math.round(valor).toLocaleString("es-MX")}` : `${Math.round(valor).toLocaleString("es-MX")} ${metricaActual.unidad}`;
  const formatearMes = (mes) => {
    const fecha = new Date(`${mes}-01T12:00:00`);
    return Number.isNaN(fecha.getTime())
      ? mes
      : new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" }).format(fecha).replace(/\.$/, "");
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Promedio mensual por unidad</p>
          <p className="mt-1 text-sm text-on-surface-variant">Selecciona una barra para comparar y consultar el detalle mensual.</p>
        </div>
        <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-outline-variant/70 bg-surface-container-low p-1" role="group" aria-label="Seleccionar métrica">
          {Object.entries(metricas).map(([clave, datos]) => (
            <button key={clave} type="button" aria-pressed={metrica === clave} onClick={() => setMetrica(clave)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${metrica === clave ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>
              {datos.etiqueta.replace(" promedio", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px]">
        <div className="dashboard-chart-stage relative min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5">
          <div className="dashboard-chart-stage__glow dashboard-chart-stage__glow--one" aria-hidden="true" />
          <div className="dashboard-chart-stage__glow dashboard-chart-stage__glow--two" aria-hidden="true" />
          <div className="relative z-[1] mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/70">{metricaActual.etiqueta}</p>
              <p className="mt-1 text-sm text-white/70">Evolución mensual de la flota</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-technical-mono text-lg font-bold text-white">{formatearValor(puntos.at(-1)?.valor ?? 0)}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/55">{puntos.length ? formatearMes(puntos.at(-1).mes) : "Sin periodo"}</p>
            </div>
          </div>
          <div key={metrica} className="relative z-[1] h-[250px]" role="group" aria-label={`Gráfica de barras: ${metricaActual.etiqueta.toLowerCase()} por mes`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((nivel) => (
                <div key={nivel} className="flex items-center gap-2"><span className="w-10 shrink-0 text-right font-technical-mono text-[10px] text-emerald-50/60">{Math.round((maximo * nivel) / 100).toLocaleString("es-MX")}</span><span className="h-px flex-1 border-t border-white/10" /></div>
              ))}
            </div>
            <div className="absolute inset-x-12 top-0 bottom-8 grid items-end gap-1 sm:gap-2" style={{ gridTemplateColumns: `repeat(${puntos.length}, minmax(0, 1fr))` }}>
              <span className="pointer-events-none absolute inset-x-0 z-[2] border-t border-dashed border-emerald-200/75" style={{ bottom: `${Math.max((promedioPeriodo / maximo) * 100, 0)}%` }} aria-hidden="true" />
              {puntos.map((punto, indice) => {
                const porcentaje = Math.max((punto.valor / maximo) * 100, 3);
                const activo = mesActivo === punto.mes;
                return (
                  <button
                    key={punto.mes}
                    type="button"
                    aria-pressed={activo}
                    aria-label={`${formatearMes(punto.mes)}: ${formatearValor(punto.valor)}, ${punto.unidades} unidades`}
                    onClick={() => setMesActivo((actual) => actual === punto.mes ? null : punto.mes)}
                    onMouseEnter={() => setMesEnVista(punto.mes)}
                    onMouseLeave={() => setMesEnVista(null)}
                    onFocus={() => setMesEnVista(punto.mes)}
                    onBlur={() => setMesEnVista(null)}
                    className="dashboard-chart-bar group relative flex h-full min-w-0 items-end justify-center rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#073b2d]"
                  >
                    <span className="dashboard-chart-tooltip pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold opacity-0 shadow-lg transition-all duration-150 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:opacity-100" style={{ bottom: `calc(${porcentaje}% + 7px)` }}>
                      {formatearValor(punto.valor)}
                    </span>
                    <span
                      className={`dashboard-chart-bar__fill relative z-[1] block w-[62%] min-w-[5px] max-w-10 rounded-t-md transition-[height,background-color,box-shadow] duration-500 sm:w-[70%] ${activo || mesEnVista === punto.mes ? "dashboard-chart-bar__fill--active" : ""} ${indice === puntos.length - 1 ? "dashboard-chart-bar__fill--latest" : ""}`}
                      style={{ height: `${porcentaje}%`, animationDelay: `${indice * 45}ms` }}
                    />
                    <span className={`pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium sm:text-[10px] ${activo || mesEnVista === punto.mes ? "font-bold text-emerald-100" : "text-white/55"}`}>
                      {formatearMes(punto.mes)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="relative z-[1] mt-2 flex items-center justify-between gap-2 text-[10px] text-white/60">
            <span>{puntos.length} meses con información</span>
            <span className="flex items-center gap-2"><span className="h-0 w-5 border-t border-dashed border-emerald-200/75" aria-hidden="true" />Media del periodo</span>
          </div>
        </div>

        <div className="dashboard-chart-detail flex flex-col justify-between rounded-2xl p-4" aria-live="polite">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">{datoActivo ? "Mes en foco" : "Resumen del periodo"}</p>
              <span className={`h-2 w-2 rounded-full ${mesEnVista ? "bg-primary" : "bg-outline"}`} aria-hidden="true" />
            </div>
            <p className="mt-3 font-technical-mono text-technical-mono text-xl font-semibold text-on-surface">{datoActivo ? formatearMes(datoActivo.mes) : `${puntos.length} meses`}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{datoActivo ? metricaActual.etiqueta : "Media de los meses con registro"}</p>
            <p className="mt-2 font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">{formatearValor(datoActivo?.valor ?? promedioPeriodo)}</p>
          </div>
          {datoActivo ? (
            <div className="mt-6 space-y-2 border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant">
              <p className="flex justify-between gap-2"><span>Unidades con datos</span><strong className="text-on-surface">{datoActivo.unidades}</strong></p>
              <p className="flex justify-between gap-2"><span>Litros acumulados</span><strong className="text-on-surface">{Math.round(datoActivo.totalLitros).toLocaleString("es-MX")} L</strong></p>
              <p className="flex justify-between gap-2"><span>Km acumulados</span><strong className="text-on-surface">{Math.round(datoActivo.totalKm).toLocaleString("es-MX")}</strong></p>
            </div>
          ) : (
            <p className="mt-6 border-t border-outline-variant/40 pt-3 text-xs text-on-surface-variant">{mesActivo ? "Mueve el cursor para previsualizar otro mes." : "Pasa el cursor por una barra o selecciónala para consultar el mes."}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {puntos.map((punto, indice) => (
          <button key={`resumen-${punto.mes}`} type="button" aria-pressed={mesActivo === punto.mes} aria-label={`${formatearMes(punto.mes)}: ${formatearValor(punto.valor)}, ${punto.unidades} unidades`} onClick={() => setMesActivo((actual) => actual === punto.mes ? null : punto.mes)} className={`group rounded-xl border p-3 text-left transition-all duration-200 ${mesActivo === punto.mes ? "border-primary bg-primary text-on-primary shadow-sm" : "border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/5"}`}>
            <span className={`block text-xs font-semibold uppercase ${mesActivo === punto.mes ? "text-on-primary/75" : "text-on-surface-variant"}`}>{formatearMes(punto.mes)}</span><span className={`mt-2 block font-technical-mono text-technical-mono text-lg font-bold ${mesActivo === punto.mes ? "text-on-primary" : "text-on-surface"}`}>{formatearValor(punto.valor)}</span><span className={`mt-1 block text-xs ${mesActivo === punto.mes ? "text-on-primary/75" : "text-on-surface-variant"}`}>{punto.unidades} unidad{punto.unidades === 1 ? "" : "es"}</span>
            <span className={`mt-3 block h-1.5 overflow-hidden rounded-full ${mesActivo === punto.mes ? "bg-white/20" : "bg-primary/10"}`}>
              <span className={`chart-mini-fill block h-full rounded-full ${mesActivo === punto.mes ? "bg-primary-fixed" : "bg-primary"}`} style={{ width: `${Math.max((punto.valor / maximo) * 100, 4)}%`, animationDelay: `${indice * 45}ms` }} />
            </span>
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
