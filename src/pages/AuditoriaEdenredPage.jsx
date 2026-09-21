import { useMemo, useRef, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useCargasEdenred } from "../hooks/useTransaccionesEdenred.js";
import { useFiltrosFlota, useEstadoFiltrosFlota } from "../hooks/useFiltrosFlota.js";
import { aplicarContribucionEdenred, actualizarUnidad } from "../data/unidadesStore.js";
import { agregarCargaEdenred, eliminarCargaEdenred } from "../data/edenredStore.js";
import { leerArchivoEdenred, analizarTransacciones, construirIndicePorPlaca, obtenerEconomicoTransaccion } from "../utils/edenredParser.js";
import { useAuth } from "../hooks/useAuth.js";
import { useHistorialEliminaciones } from "../hooks/useHistorialEliminaciones.js";
import BarraFiltrosFlota from "../components/flota/BarraFiltrosFlota.jsx";
import TablaColumnasDinamicas from "../components/flota/TablaColumnasDinamicas.jsx";
import { useSearch } from "../context/SearchContext.jsx";

/** Fases del flujo de carga: inactivo → analizando → vista previa (a confirmar) → aplicado. */
const FASES = { INACTIVO: "inactivo", ANALIZANDO: "analizando", VISTA_PREVIA: "vista-previa", APLICADO: "aplicado" };

/**
 * ============================================================================
 * ANÁLISIS DE COMBUSTIBLE (EDENRED)
 * ============================================================================
 * Flujo: el Administrador sube el reporte crudo de Edenred (el archivo tal
 * cual lo entrega Edenred, con sus columnas originales) → se analiza en el
 * navegador (sin backend, ver `utils/edenredParser.js`) → se muestra una
 * vista previa con lo que va a cambiar → el Administrador confirma → recién
 * ahí se actualiza el historial de combustible de cada unidad.
 *
 * Nada se aplica automáticamente: el análisis es no-destructivo hasta que
 * se presiona "Confirmar y actualizar flota".
 * ============================================================================
 */
function AuditoriaEdenredPage() {
  const unidades = useUnidades();
  const cargasEdenred = useCargasEdenred();
  const [fase, setFase] = useState(FASES.INACTIVO);
  const [resultado, setResultado] = useState(null);
  const [transaccionesCrudas, setTransaccionesCrudas] = useState([]);
  const [errorMensaje, setErrorMensaje] = useState("");
  // Elección del Administrador para cada placa ambigua: clave "placa|mes" -> id de unidad elegida (o "" si aún no decide).
  const [resolucionesAmbiguas, setResolucionesAmbiguas] = useState({});
  const inputArchivoRef = useRef(null);

  async function manejarArchivoSeleccionado(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setErrorMensaje("");
    setFase(FASES.ANALIZANDO);
    try {
      const transacciones = await leerArchivoEdenred(archivo);
      const analisis = analizarTransacciones(transacciones, unidades);
      setTransaccionesCrudas(transacciones);
      setResultado(analisis);
      setFase(FASES.VISTA_PREVIA);
    } catch (error) {
      setErrorMensaje(error.message);
      setFase(FASES.INACTIVO);
    } finally {
      event.target.value = "";
    }
  }

  function confirmarYAplicar() {
    const resumenAplicado = [];
    const tiposCombustiblePorUnidad = new Map();

    resultado.resumenPorUnidad.forEach(({ unidad, mes, km, litros, importe, kilometrajeActual, tipoCombustible, anomalias }) => {
      const kilometrajeAnterior = unidad.kilometraje ?? 0;
      aplicarContribucionEdenred(unidad.id, { mes, km, litros, importe });
      // El kilometraje visible en Flota se actualiza con la lectura de
      // odómetro más reciente que trae Edenred - así ya no depende de que
      // alguien lo capture a mano. Se registra el valor anterior para
      // poder revertirlo si esta carga se elimina después (Módulo 3).
      const kilometrajeAplicado = kilometrajeActual > kilometrajeAnterior ? kilometrajeActual : kilometrajeAnterior;
      if (kilometrajeActual > kilometrajeAnterior) {
        actualizarUnidad(unidad.id, { kilometraje: kilometrajeActual });
      }
      if (tipoCombustible) tiposCombustiblePorUnidad.set(unidad.id, tipoCombustible);
      resumenAplicado.push({ unidadId: unidad.id, mes, km, litros, importe, kilometrajeAnterior, kilometrajeAplicado, anomalias: anomalias ?? [] });
    });

    // Placas ambiguas: solo se aplican las que el Administrador sí resolvió eligiendo una unidad.
    resultado.resumenAmbiguo.forEach(({ placa, mes, km, litros, importe, kilometrajeActual, tipoCombustible, anomalias }) => {
      const unidadElegidaId = resolucionesAmbiguas[`${placa}|${mes}`];
      if (!unidadElegidaId) return;
      const unidadElegida = unidades.find((unidad) => unidad.id === unidadElegidaId);
      const kilometrajeAnterior = unidadElegida?.kilometraje ?? 0;
      aplicarContribucionEdenred(unidadElegidaId, { mes, km, litros, importe });
      const kilometrajeAplicado = kilometrajeActual > kilometrajeAnterior ? kilometrajeActual : kilometrajeAnterior;
      if (kilometrajeActual > kilometrajeAnterior) {
        actualizarUnidad(unidadElegidaId, { kilometraje: kilometrajeActual });
      }
      if (tipoCombustible) tiposCombustiblePorUnidad.set(unidadElegidaId, tipoCombustible);
      resumenAplicado.push({ unidadId: unidadElegidaId, mes, km, litros, importe, kilometrajeAnterior, kilometrajeAplicado, anomalias: anomalias ?? [] });
    });

    tiposCombustiblePorUnidad.forEach((tipoCombustible, unidadId) => {
      actualizarUnidad(unidadId, { tipoCombustible });
    });
    agregarCargaEdenred({ periodo: resultado.meses, transacciones: transaccionesCrudas, resumenAplicado });
    setFase(FASES.APLICADO);
  }

  function cancelarVistaPrevia() {
    setResultado(null);
    setTransaccionesCrudas([]);
    setResolucionesAmbiguas({});
    setFase(FASES.INACTIVO);
  }

  return (
    <>
      <TopNavBar activeTab="Alertas" searchPlaceholder="Buscar unidad o folio..." />
      <div className="p-margin-desktop flex-1 space-y-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Análisis de Combustible</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Sube el reporte de Edenred y el sistema identifica automáticamente a qué unidad y mes pertenece cada carga.
          </p>
        </div>

        {errorMensaje && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}

        {fase === FASES.INACTIVO && (
          <div
            onClick={() => inputArchivoRef.current?.click()}
            className="border-2 border-dashed border-primary bg-surface/50 rounded-lg flex flex-col items-center justify-center p-12 hover:bg-surface transition-colors cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-primary text-[32px]">upload_file</span>
            </div>
            <p className="font-title-md text-title-md text-primary mb-2">Arrastra o selecciona el reporte de Edenred</p>
            <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-md">
              Formato: .xlsx tal como lo entrega Edenred (Consulta de Movimientos). El sistema detecta automáticamente el periodo y las unidades.
            </p>
            <input ref={inputArchivoRef} type="file" accept=".xlsx" className="hidden" onChange={manejarArchivoSeleccionado} />
          </div>
        )}

        {fase === FASES.ANALIZANDO && <PantallaAnalizando />}

        {fase === FASES.VISTA_PREVIA && resultado && (
          <VistaPrevia
            resultado={resultado}
            onConfirmar={confirmarYAplicar}
            onCancelar={cancelarVistaPrevia}
            resolucionesAmbiguas={resolucionesAmbiguas}
            setResolucionesAmbiguas={setResolucionesAmbiguas}
          />
        )}

        {fase === FASES.APLICADO && (
          <div className="bg-primary-container/10 border border-primary-container/30 rounded-lg p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-primary text-5xl icon-fill">check_circle</span>
            <p className="font-title-md text-title-md text-on-surface">Flota actualizada correctamente.</p>
            <button onClick={cancelarVistaPrevia} className="font-label-sm text-label-sm text-primary hover:underline">
              Cargar otro reporte
            </button>
          </div>
        )}

        <TablaDetalladaEdenred cargas={cargasEdenred} unidades={unidades} />
      </div>
    </>
  );
}

/** Animación mientras se procesa el archivo (lectura + cruce + reglas de anomalías). */
function PantallaAnalizando() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 flex flex-col items-center gap-4">
      <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
      <p className="font-title-md text-title-md text-on-surface">Analizando el reporte…</p>
      <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-sm">
        Cruzando cada transacción con su unidad por placa, agrupando por mes y revisando anomalías de rendimiento.
      </p>
    </div>
  );
}

/**
 * Resumen del análisis antes de aplicarlo: qué unidades se van a actualizar
 * (y con qué datos), cuáles no tuvieron movimiento este periodo, y cuáles
 * placas del reporte no se pudieron cruzar con ninguna unidad de la flota.
 */
function VistaPrevia({ resultado, onConfirmar, onCancelar, resolucionesAmbiguas, setResolucionesAmbiguas }) {
  const registrosConAnomalias = [
    ...resultado.resumenPorUnidad.map((registro) => ({
      identificador: `Económico ${registro.unidad.economico ?? "s/e"}`,
      periodo: registro.mes,
      anomalias: registro.anomalias ?? [],
    })),
    ...(resultado.resumenAmbiguo ?? []).map((registro) => ({
      identificador: `Placa ${registro.placa}`,
      periodo: registro.mes,
      anomalias: registro.anomalias ?? [],
    })),
  ].filter((registro) => registro.anomalias.length > 0);
  const totalAnomalias = registrosConAnomalias.reduce((suma, registro) => suma + registro.anomalias.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaResumen etiqueta="Periodo detectado" valor={resultado.meses.join(", ") || "-"} />
        <TarjetaResumen etiqueta="Transacciones aprobadas" valor={resultado.totalTransaccionesAprobadas} />
        <TarjetaResumen etiqueta="Unidades con movimiento" valor={resultado.unidadesConMovimiento.size} />
        <TarjetaResumen etiqueta="Anomalías detectadas" valor={totalAnomalias} destacar={totalAnomalias > 0} />
      </div>

      {registrosConAnomalias.length > 0 && (
        <details className="rounded-xl border border-error-container/50 bg-error-container/10 p-4">
          <summary className="cursor-pointer font-label-sm text-label-sm uppercase text-error">
            Revisar {totalAnomalias} anomalía(s) en {registrosConAnomalias.length} registro(s)
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {registrosConAnomalias.map((registro) => (
              <div key={`${registro.identificador}-${registro.periodo}`} className="rounded-lg border border-error-container/30 bg-surface-container-lowest p-3 text-sm">
                <p className="font-medium text-on-surface">{registro.identificador} - {registro.periodo}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-error">
                  {registro.anomalias.map((anomalia) => <li key={anomalia}>{anomalia}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}

      {resultado.resumenAmbiguo?.length > 0 && (
        <div className="bg-error-container/10 border border-error-container/40 rounded-lg p-4 space-y-3">
          <p className="font-label-sm text-label-sm text-error uppercase">
            {resultado.resumenAmbiguo.length} placa(s)/mes pertenecen a más de una unidad en tu flota - elige a cuál aplicar cada una
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            El dato SÍ se cuenta (no se pierde), solo falta decidir a qué unidad corresponde.
          </p>
          {resultado.resumenAmbiguo.map((registro) => (
            <div key={`${registro.placa}-${registro.mes}`} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="font-technical-mono text-technical-mono text-sm">
                Placa {registro.placa} · {registro.mes} · {registro.km.toLocaleString("es-MX")} km · {registro.litros.toLocaleString("es-MX")} L · ${registro.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
              <select
                value={resolucionesAmbiguas[`${registro.placa}|${registro.mes}`] ?? ""}
                onChange={(event) =>
                  setResolucionesAmbiguas((anteriores) => ({ ...anteriores, [`${registro.placa}|${registro.mes}`]: event.target.value }))
                }
                className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
              >
                <option value="">Sin asignar (no se aplicará)</option>
                {registro.candidatos.map((candidato) => (
                  <option key={candidato.id} value={candidato.id}>
                    Económico {candidato.economico ?? "s/e"} - {candidato.marca} {candidato.submarca} ({candidato.conductorAsignado ?? "sin resguardante"})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {resultado.placasSinCoincidencia.length > 0 && (
        <div className="bg-tertiary-container/10 border border-tertiary-container/30 rounded-lg p-4">
          <p className="font-label-sm text-label-sm text-tertiary uppercase mb-2">
            {resultado.placasSinCoincidencia.length} placas del reporte no pertenecen a esta flota vehicular
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm mb-2">
            El reporte de Edenred puede traer unidades de otras flotillas mezcladas. Estas placas no se agregaron a ninguna unidad - si alguna sí debería ser tuya, revisa la sugerencia:
          </p>
          <ul className="space-y-1">
            {resultado.placasSinCoincidencia.map(({ placa, sugerencia }) => (
              <li key={placa} className="font-technical-mono text-technical-mono text-sm text-on-surface-variant">
                {placa}
                {sugerencia && (
                  <span className="text-tertiary"> - ¿quisiste decir <strong>{sugerencia}</strong>? (placa muy parecida en tu flota)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40">
          <h3 className="font-title-md text-title-md text-on-surface">Unidades que se van a actualizar</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase">
            <tr>
              <th className="p-3">Económico</th>
              <th className="p-3">Unidad</th>
              <th className="p-3">Mes</th>
              <th className="p-3 text-right">Km recorridos</th>
              <th className="p-3 text-right">Odómetro detectado</th>
              <th className="p-3 text-right">Litros</th>
              <th className="p-3 text-right">Importe</th>
              <th className="p-3">Anomalías</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {resultado.resumenPorUnidad.map((registro) => (
              <tr key={`${registro.unidad.id}-${registro.mes}`} className={registro.anomalias.length > 0 ? "bg-error-container/10" : ""}>
                <td className="p-3 font-technical-mono text-technical-mono">{registro.unidad.economico ?? "Pendiente"}</td>
                <td className="p-3">{registro.unidad.marca} {registro.unidad.submarca}</td>
                <td className="p-3">{registro.mes}</td>
                <td className="p-3 text-right">{registro.km.toLocaleString("es-MX")} km</td>
                <td className="p-3 text-right font-technical-mono text-technical-mono">{registro.kilometrajeActual.toLocaleString("es-MX")} km</td>
                <td className="p-3 text-right">{registro.litros.toLocaleString("es-MX")} L</td>
                <td className="p-3 text-right">${registro.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                <td className="p-3">
                  {registro.anomalias.length === 0 ? (
                    <span className="text-on-surface-variant">-</span>
                  ) : (
                    <span className="text-error font-medium">{registro.anomalias.length} alerta(s)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado.unidadesSinMovimiento.length > 0 && (
        <details className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-4">
          <summary className="font-label-sm text-label-sm text-on-surface-variant uppercase cursor-pointer">
            {resultado.unidadesSinMovimiento.length} unidades activas SIN movimiento este periodo
          </summary>
          <ul className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {resultado.unidadesSinMovimiento.map((unidad) => (
              <li key={unidad.id} className="text-sm text-on-surface-variant font-technical-mono text-technical-mono">
                {unidad.economico ?? unidad.numeroSerie.slice(-6)} - {unidad.placas ?? "s/placa"}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onCancelar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirmar} className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
          Confirmar y actualizar flota
        </button>
      </div>
    </div>
  );
}

function TarjetaResumen({ etiqueta, valor, destacar = false }) {
  return (
    <div className={`rounded-lg p-4 border ${destacar ? "bg-error-container/20 border-error-container/50" : "bg-surface-container-lowest border-outline-variant"}`}>
      <p className={`font-label-sm text-label-sm uppercase mb-1 ${destacar ? "text-error" : "text-on-surface-variant"}`}>{etiqueta}</p>
      <p className={`font-headline-lg-mobile text-headline-lg-mobile font-bold ${destacar ? "text-error" : "text-on-surface"}`}>{valor}</p>
    </div>
  );
}

/**
 * Tabla detallada transacción por transacción de UNA carga de Edenred
 * elegida por el Administrador (cada subida de reporte queda guardada por
 * separado - ver `edenredStore.js` - así que ninguna se pierde al subir
 * una nueva). Filtrado por el núcleo centralizado `useFiltrosFlota` (Placa,
 * Económico, Año, Mes, Día, Hora - campos separados, cruzados en cadena) y
 * columnas Económico/Fecha/Placa/Recorrido/Litros/Importe visibles por
 * defecto, con el resto de los campos de Edenred activables por Toggle.
 */
function TablaDetalladaEdenred({ cargas, unidades }) {
  const { usuario } = useAuth();
  const { query } = useSearch();
  const historialEliminaciones = useHistorialEliminaciones();
  const anioActual = new Date().getFullYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
  const [idCargaSeleccionada, setIdCargaSeleccionada] = useState(null);
  const [cargaAEliminar, setCargaAEliminar] = useState(null);
  const { filtros, setFiltro, limpiarFiltros } = useEstadoFiltrosFlota();

  // Límite visual de 12 meses (Módulo 3): el Select de reportes solo
  // lista las cargas cuyo periodo cae en el año fiscal elegido - al
  // cambiar de año, la lista se limpia y solo aparecen las de ese año.
  const aniosConCargas = useMemo(() => {
    const anios = new Set(cargas.flatMap((carga) => carga.periodo.map((mes) => Number(mes.slice(0, 4)))));
    anios.add(anioActual);
    return [...anios].sort((a, b) => b - a);
  }, [cargas, anioActual]);

  const cargasDelAnio = useMemo(
    () => cargas.filter((carga) => carga.periodo.some((mes) => Number(mes.slice(0, 4)) === anioSeleccionado)),
    [cargas, anioSeleccionado],
  );

  const cargaActual = cargasDelAnio.find((carga) => carga.id === idCargaSeleccionada) ?? cargasDelAnio[0];
  const transaccionesDeLaCarga = useMemo(() => cargaActual?.transacciones ?? [], [cargaActual]);
  const anomaliasDeLaCarga = useMemo(
    () => (cargaActual?.resumenAplicado ?? []).filter((registro) => registro.anomalias?.length > 0),
    [cargaActual],
  );

  function confirmarEliminarCarga() {
    eliminarCargaEdenred(cargaAEliminar.id, usuario?.nombre ?? "Administrador");
    setCargaAEliminar(null);
    setIdCargaSeleccionada(null); // vuelve a caer en la carga más reciente que quede del año
  }

  // El "Económico" no viene en el reporte de Edenred (ellos usan "Id
  // Vehículo", no el número económico de CFE) - se deriva cruzando la
  // Placa de cada transacción contra la flota, igual que en el análisis.
  const { indice: indicePorPlaca, placasAmbiguas } = useMemo(() => construirIndicePorPlaca(unidades), [unidades]);

  function economicoDeLaTransaccion(transaccion) {
    const economicoReportado = obtenerEconomicoTransaccion(transaccion);
    if (String(economicoReportado).trim()) return String(economicoReportado).trim();
    const placa = String(transaccion["Placa"] ?? "").trim().toUpperCase();
    if (placasAmbiguas.has(placa)) return "⚠ Varias unidades";
    return indicePorPlaca.get(placa)?.economico ?? "Sin coincidencia";
  }

  // Extractores: le enseñan al núcleo centralizado cómo leer placa/económico/fecha de UNA transacción cruda de Edenred.
  const extractores = useMemo(
    () => ({
      obtenerPlaca: (transaccion) => transaccion["Placa"],
      obtenerEconomico: (transaccion) => economicoDeLaTransaccion(transaccion),
      obtenerFecha: (transaccion) => {
        const fecha = transaccion["Fecha transacción"];
        return fecha instanceof Date ? fecha : new Date(fecha);
      },
    }),
    [indicePorPlaca, placasAmbiguas],
  );

  const filasFiltradas = useFiltrosFlota(transaccionesDeLaCarga, filtros, extractores);

  const aniosDisponibles = useMemo(() => {
    const anios = new Set(
      transaccionesDeLaCarga
        .map((transaccion) => extractores.obtenerFecha(transaccion))
        .filter((fecha) => fecha && !Number.isNaN(fecha.getTime()))
        .map((fecha) => fecha.getFullYear()),
    );
    return [...anios].sort();
  }, [transaccionesDeLaCarga, extractores]);

  const columnas = useMemo(
    () => [
      { key: "economico", label: "Económico", render: economicoDeLaTransaccion },
      { key: "Fecha transacción", label: "Fecha transacción", render: (t) => new Date(t["Fecha transacción"]).toLocaleString("es-MX") },
      { key: "Placa", label: "Placa" },
      { key: "Recorrido", label: "Recorrido", alinearDerecha: true },
      { key: "Cantidad Mercancía", label: "Cantidad Mercancía", alinearDerecha: true },
      { key: "Importe Transacción", label: "Importe Transacción", alinearDerecha: true },
      // Columnas opcionales - activables con su botón Toggle, no vienen prendidas por defecto.
      { key: "Num Tarjeta", label: "Num Tarjeta", opcional: true },
      { key: "Id Vehículo", label: "Id Vehículo", opcional: true },
      { key: "No Comprobante", label: "No Comprobante", opcional: true },
      { key: "Razón social Afiliado", label: "Razón social Afiliado", opcional: true },
      { key: "Km Ant Transacción", label: "Km Ant Transacción", opcional: true, alinearDerecha: true },
      { key: "Km Transacción", label: "Km Transacción", opcional: true, alinearDerecha: true },
      { key: "Descripción Mercancía", label: "Descripción Mercancía", opcional: true },
      { key: "Precio Unitario Merc", label: "Precio Unitario Merc", opcional: true, alinearDerecha: true },
      { key: "Saldo Ant Transacción", label: "Saldo Ant Transacción", opcional: true, alinearDerecha: true },
      { key: "Saldo Actual Después de Transacción", label: "Saldo Actual Después de Transacción", opcional: true, alinearDerecha: true },
      { key: "Importe Neto", label: "Importe Neto", opcional: true, alinearDerecha: true },
      { key: "Monto IVA", label: "Monto IVA", opcional: true, alinearDerecha: true },
      { key: "% IVA", label: "% IVA", opcional: true, alinearDerecha: true },
    ],
    [indicePorPlaca, placasAmbiguas],
  );

  if (cargas.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-4 border-b border-outline-variant/40 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="font-title-md text-title-md text-on-surface">Detalle de transacciones</h3>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            {cargas.length} reporte(s) de Edenred cargados en total - ninguno se pierde al subir uno nuevo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={anioSeleccionado}
            onChange={(event) => {
              setAnioSeleccionado(Number(event.target.value));
              setIdCargaSeleccionada(null); // la lista de reportes se limpia al cambiar de año
            }}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            {aniosConCargas.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
          <select
            value={cargaActual?.id ?? ""}
            onChange={(event) => setIdCargaSeleccionada(event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
            disabled={cargasDelAnio.length === 0}
          >
            {cargasDelAnio.length === 0 && <option value="">Sin reportes en {anioSeleccionado}</option>}
            {cargasDelAnio.map((carga) => (
              <option key={carga.id} value={carga.id}>
                Periodo {carga.periodo.join(", ")} - subido el{" "}
                {new Date(carga.fechaCarga).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ({carga.transacciones.length} transacciones)
              </option>
            ))}
          </select>
          {cargaActual && (
            <button
              onClick={() => setCargaAEliminar(cargaActual)}
              className="px-3 py-1.5 border border-error/40 text-error rounded-md font-label-sm text-label-sm hover:bg-error-container/20 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Eliminar reporte
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <BarraFiltrosFlota
          filtros={filtros}
          setFiltro={setFiltro}
          limpiarFiltros={limpiarFiltros}
          camposVisibles={["placa", "economico", "anio", "mes", "dia", "hora"]}
          aniosDisponibles={aniosDisponibles}
        />
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {filasFiltradas.length} de {transaccionesDeLaCarga.length} transacciones
        </p>
        <TablaColumnasDinamicas filas={filasFiltradas} columnas={columnas} searchQuery={query} resaltarFilas={Object.values(filtros).some(Boolean)} />
      </div>

      {anomaliasDeLaCarga.length > 0 && (
        <details className="mx-4 mb-4 rounded-lg border border-error-container/40 bg-error-container/10 p-4">
          <summary className="cursor-pointer font-label-sm text-label-sm uppercase text-error">
            Ver anomalías detectadas ({anomaliasDeLaCarga.length} registro(s))
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {anomaliasDeLaCarga.map((registro) => {
              const unidad = unidades.find((item) => item.id === registro.unidadId);
              return (
                <div key={`${registro.unidadId}-${registro.mes}`} className="rounded-md border border-error-container/30 bg-surface-container-lowest p-3 text-sm">
                  <p className="font-medium text-on-surface">Económico {unidad?.economico ?? "s/e"} - {registro.mes}</p>
                  <ul className="mt-1 list-disc pl-5 text-error">
                    {registro.anomalias.map((anomalia) => <li key={anomalia}>{anomalia}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {historialEliminaciones.length > 0 && (
        <details className="mx-4 mb-4 bg-surface-container-low border border-outline-variant/40 rounded-lg p-4">
          <summary className="font-label-sm text-label-sm text-on-surface-variant uppercase cursor-pointer">
            Historial de reportes eliminados ({historialEliminaciones.length}) - log de auditoría, nunca se borra
          </summary>
          <ul className="mt-3 space-y-2">
            {historialEliminaciones.map((registro) => (
              <li key={registro.id} className="text-sm border-b border-outline-variant/20 pb-2">
                <span className="font-technical-mono text-technical-mono text-on-surface-variant">
                  {new Date(registro.fechaEliminacion).toLocaleString("es-MX")}
                </span>{" "}
                - Periodo <strong>{registro.periodo.join(", ")}</strong> ({registro.totalTransacciones} transacciones,{" "}
                {registro.resumenRevertido.length} unidad(es) revertida(s)) eliminado por <strong>{registro.eliminadoPor}</strong>.
              </li>
            ))}
          </ul>
        </details>
      )}

      {cargaAEliminar && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCargaAEliminar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined">warning</span>
              <h3 className="font-title-md text-title-md">Eliminar reporte</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Vas a eliminar el reporte del periodo <strong>{cargaAEliminar.periodo.join(", ")}</strong> ({cargaAEliminar.resumenAplicado.length} unidad(es) afectada(s)).
              Se restará exactamente lo que este reporte había sumado a cada unidad y a los totales de la flota - esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCargaAEliminar(null)} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarEliminarCarga} className="px-4 py-2 bg-error text-on-error rounded-lg font-label-sm text-label-sm hover:brightness-90 transition-all">
                Sí, eliminar y revertir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditoriaEdenredPage;










