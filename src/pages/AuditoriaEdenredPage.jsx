import { useMemo, useRef, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useCargasEdenred } from "../hooks/useTransaccionesEdenred.js";
import { registrarConsumoMensual, actualizarUnidad } from "../data/unidadesStore.js";
import { agregarCargaEdenred } from "../data/edenredStore.js";
import { leerArchivoEdenred, analizarTransacciones, construirIndicePorPlaca, CAMPOS_EDENRED, CAMPOS_EDENRED_DEFAULT } from "../utils/edenredParser.js";

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
    resultado.resumenPorUnidad.forEach(({ unidad, mes, km, litros, importe, kilometrajeActual }) => {
      registrarConsumoMensual(unidad.id, { mes, km, litros, importe });
      // El kilometraje visible en Flota se actualiza con la lectura de
      // odómetro más reciente que trae Edenred — así ya no depende de que
      // alguien lo capture a mano.
      if (kilometrajeActual > (unidad.kilometraje ?? 0)) {
        actualizarUnidad(unidad.id, { kilometraje: kilometrajeActual });
      }
    });
    // Placas ambiguas: solo se aplican las que el Administrador sí resolvió eligiendo una unidad.
    resultado.resumenAmbiguo.forEach(({ placa, mes, km, litros, importe, kilometrajeActual }) => {
      const unidadElegidaId = resolucionesAmbiguas[`${placa}|${mes}`];
      if (!unidadElegidaId) return;
      registrarConsumoMensual(unidadElegidaId, { mes, km, litros, importe });
      const unidadElegida = unidades.find((unidad) => unidad.id === unidadElegidaId);
      if (unidadElegida && kilometrajeActual > (unidadElegida.kilometraje ?? 0)) {
        actualizarUnidad(unidadElegidaId, { kilometraje: kilometrajeActual });
      }
    });
    agregarCargaEdenred({ periodo: resultado.meses, transacciones: transaccionesCrudas });
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
  const totalAnomalias = resultado.resumenPorUnidad.reduce((suma, registro) => suma + registro.anomalias.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaResumen etiqueta="Periodo detectado" valor={resultado.meses.join(", ") || "—"} />
        <TarjetaResumen etiqueta="Transacciones aprobadas" valor={resultado.totalTransaccionesAprobadas} />
        <TarjetaResumen etiqueta="Unidades con movimiento" valor={resultado.unidadesConMovimiento.size} />
        <TarjetaResumen etiqueta="Anomalías detectadas" valor={totalAnomalias} destacar={totalAnomalias > 0} />
      </div>

      {resultado.resumenAmbiguo?.length > 0 && (
        <div className="bg-error-container/10 border border-error-container/40 rounded-lg p-4 space-y-3">
          <p className="font-label-sm text-label-sm text-error uppercase">
            {resultado.resumenAmbiguo.length} placa(s)/mes pertenecen a más de una unidad en tu flota — elige a cuál aplicar cada una
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
                    Económico {candidato.economico ?? "s/e"} — {candidato.marca} {candidato.submarca} ({candidato.conductorAsignado ?? "sin conductor"})
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
            El reporte de Edenred puede traer unidades de otras flotillas mezcladas. Estas placas no se agregaron a ninguna unidad — si alguna sí debería ser tuya, revisa la sugerencia:
          </p>
          <ul className="space-y-1">
            {resultado.placasSinCoincidencia.map(({ placa, sugerencia }) => (
              <li key={placa} className="font-technical-mono text-technical-mono text-sm text-on-surface-variant">
                {placa}
                {sugerencia && (
                  <span className="text-tertiary"> — ¿quisiste decir <strong>{sugerencia}</strong>? (placa muy parecida en tu flota)</span>
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
                    <span className="text-on-surface-variant">—</span>
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
                {unidad.economico ?? unidad.numeroSerie.slice(-6)} — {unidad.placas ?? "s/placa"}
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
 * Tabla detallada transacción por transacción, con selector de columnas:
 * por defecto solo muestra las 3 que de verdad usan (km, litros, importe),
 * pero el Administrador puede elegir cualquiera de las columnas originales
 * del reporte de Edenred.
 */
/**
 * Tabla detallada transacción por transacción de UNA carga de Edenred
 * elegida por el Administrador (cada subida de reporte queda guardada por
 * separado — ver `edenredStore.js` — así que ninguna se pierde al subir
 * una nueva). Por defecto se muestra la carga más reciente.
 *
 * Además del selector de carga, mantiene el selector de columnas: por
 * defecto solo las 3 que de verdad usan (km, litros, importe), pero el
 * Administrador puede elegir cualquiera de las columnas originales del
 * reporte de Edenred.
 */
function TablaDetalladaEdenred({ cargas, unidades }) {
  const [idCargaSeleccionada, setIdCargaSeleccionada] = useState(null);
  const [columnasVisibles, setColumnasVisibles] = useState(CAMPOS_EDENRED_DEFAULT);
  const [mostrarSelector, setMostrarSelector] = useState(false);

  const cargaActual = cargas.find((carga) => carga.id === idCargaSeleccionada) ?? cargas[0];
  const filas = useMemo(() => cargaActual?.transacciones.slice(0, 200) ?? [], [cargaActual]);

  // El "Económico" no viene en el reporte de Edenred (ellos usan "Id
  // Vehículo", no el número económico de CFE) — se deriva cruzando la
  // Placa de cada transacción contra la flota, igual que en el análisis.
  const { indice: indicePorPlaca, placasAmbiguas } = useMemo(() => construirIndicePorPlaca(unidades), [unidades]);

  function economicoDeLaTransaccion(transaccion) {
    const placa = String(transaccion["Placa"] ?? "").trim().toUpperCase();
    if (placasAmbiguas.has(placa)) return "⚠ Varias unidades";
    return indicePorPlaca.get(placa)?.economico ?? "Sin coincidencia";
  }

  function alternarColumna(campo) {
    setColumnasVisibles((anteriores) =>
      anteriores.includes(campo) ? anteriores.filter((columna) => columna !== campo) : [...anteriores, campo],
    );
  }

  if (cargas.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-4 border-b border-outline-variant/40 flex justify-between items-center relative flex-wrap gap-3">
        <div>
          <h3 className="font-title-md text-title-md text-on-surface">Detalle de transacciones</h3>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            {cargas.length} reporte(s) de Edenred cargados — ninguno se pierde al subir uno nuevo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cargaActual?.id ?? ""}
            onChange={(event) => setIdCargaSeleccionada(event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            {cargas.map((carga) => (
              <option key={carga.id} value={carga.id}>
                Periodo {carga.periodo.join(", ")} — subido el{" "}
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
          <button
            onClick={() => setMostrarSelector((valor) => !valor)}
            className="px-3 py-1.5 border border-outline-variant rounded-md text-on-surface-variant font-label-sm text-label-sm hover:bg-surface transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">view_column</span>
            Elegir columnas
          </button>
        </div>
        {mostrarSelector && (
          <div className="absolute right-4 top-20 z-10 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg p-3 grid grid-cols-2 gap-1 max-h-80 overflow-y-auto w-96">
            {CAMPOS_EDENRED.map((campo) => (
              <label key={campo} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-surface-container-low rounded cursor-pointer">
                <input type="checkbox" checked={columnasVisibles.includes(campo)} onChange={() => alternarColumna(campo)} />
                {campo}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase sticky top-0">
            <tr>
              <th className="p-2 whitespace-nowrap bg-primary-container/10">Económico</th>
              {columnasVisibles.map((campo) => (
                <th key={campo} className="p-2 whitespace-nowrap">{campo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {filas.map((transaccion, indice) => (
              // eslint-disable-next-line react/no-array-index-key -- las transacciones no traen un id único propio garantizado.
              <tr key={indice}>
                <td className="p-2 whitespace-nowrap font-technical-mono text-technical-mono bg-primary-container/5">{economicoDeLaTransaccion(transaccion)}</td>
                {columnasVisibles.map((campo) => (
                  <td key={campo} className="p-2 whitespace-nowrap">{String(transaccion[campo] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditoriaEdenredPage;













