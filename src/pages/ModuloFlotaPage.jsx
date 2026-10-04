import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import UnidadDetallePanel from "../components/flota/UnidadDetallePanel.jsx";
import NumeroEconomico from "../components/flota/NumeroEconomico.jsx";
import UnidadFormNueva from "../components/flota/UnidadFormNueva.jsx";
import BarraFiltrosFlota from "../components/flota/BarraFiltrosFlota.jsx";
import TablaColumnasDinamicas from "../components/flota/TablaColumnasDinamicas.jsx";
import AlertaUnidadEtiqueta from "../components/flota/AlertaUnidadEtiqueta.jsx";
import AlertasUnidad from "../components/flota/AlertasUnidad.jsx";
import EstadoUnidadEtiqueta from "../components/flota/EstadoUnidadEtiqueta.jsx";
import GlowButton from "../components/ui/GlowButton.jsx";
import CargadorParqueVehicular from "../components/flota/CargadorParqueVehicular.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { useFiltrosFlota } from "../hooks/useFiltrosFlota.js";
import { ESTADOS_UNIDAD } from "../data/unidadesStore.js";
import { agregarDepartamento, obtenerNombreDepartamento, reemplazarDepartamentos } from "../data/departamentosStore.js";
import { reemplazarUnidades } from "../data/unidadesStore.js";
import { useDepartamentos } from "../hooks/useDepartamentos.js";
import { generarPdfFlotaVehicular } from "../utils/generarPdfFlotaVehicular.js";
import { useSearch } from "../context/useSearch.js";
import { evaluarColorUnidad, CLASES_COLOR_UNIDAD, CLASES_ESTADO_UNIDAD, obtenerClasesFilaUnidad, obtenerGradienteFilaAlertas } from "../utils/colorUnidad.js";
import { coincideUnidadBusqueda } from "../utils/busquedaUnidad.js";
import { eliminarParqueVehicularApi } from "../services/unidadService.js";
import { crearDepartamentoApi, eliminarDepartamentoApi } from "../services/departamentoService.js";
import { detectarAnomaliasFlota } from "../utils/detectarAnomaliasFlota.js";
import { useCargasEdenred } from "../hooks/useTransaccionesEdenred.js";
import { useAnomalyCases } from "../hooks/useAnomalyCases.js";
import { marcarCasosAnomaliaVistos } from "../services/anomalyCaseService.js";
import { mostrarPdfGenerado } from "../utils/mostrarPdfGenerado.js";
import { useAuth } from "../hooks/useAuth.js";

function obtenerPlacaVigente(unidad) {
  const campo = obtenerCampoPlacaVigente(unidad);
  return campo ? (unidad?.[campo] ?? "").trim() || null : null;
}

function obtenerCampoPlacaVigente(unidad) {
  const placaOriginal = (unidad?.placas ?? "").trim();
  const placa2025 = (unidad?.placas2025 ?? "").trim();

  if (!placaOriginal && !placa2025) return null;
  if (!placa2025) return "placas";
  if (/^VENCE|^CADUCA|^EXPIRA|^VENC/i.test(placa2025) || /\bVENCE\b|\d{1,2}\/\d{1,2}\/\d{4}/i.test(placa2025)) {
    return placaOriginal ? "placas" : "placas2025";
  }
  return "placas2025";
}

function ValorConDuplicado({ unidad, campo, duplicadosPorUnidad, children, pastel = false }) {
  const duplicado = duplicadosPorUnidad.get(String(unidad.id))?.[campo];
  return (
    <span
      className={duplicado
        ? pastel
          ? `inline-block rounded px-1 font-semibold ${CLASES_COLOR_UNIDAD.duplicados.badge}`
          : "inline-block rounded border border-tertiary/60 bg-tertiary-container/20 px-1 font-semibold text-tertiary"
        : ""}
      title={duplicado ? `${duplicado.campo} duplicado “${duplicado.valor}”; también en: ${duplicado.registros.join(", ")}` : undefined}
    >
      {children}
      {duplicado && <span className="ml-1 text-[10px] uppercase">Duplicado</span>}
    </span>
  );
}

function filtrarUnidadesPorBusqueda(unidades, texto) {
  return texto.trim() ? unidades.filter((unidad) => coincideUnidadBusqueda(unidad, texto)) : unidades;
}

function ModuloFlotaPage() {
  const { token } = useAuth();
  const unidades = useUnidades();
  const departamentos = useDepartamentos();
  const reportes = useReportes();
  const cargasEdenred = useCargasEdenred();
  const { cases: anomalyCases, refresh: refreshAnomalyCases } = useAnomalyCases(token);
  const { query } = useSearch();
  const [busquedaFlota, setBusquedaFlota] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const vistaActual = location.pathname === "/indice-unidades" ? "indice" : "flota";
  const unidadSeleccionadaId = searchParams.get("unidad");
  const unidadesAnomalia = useMemo(
    () => [...new Set((searchParams.get("unidadesAnomalia") ?? "").split(",").filter(Boolean))],
    [searchParams],
  );
  const [mostrarAltaUnidad, setMostrarAltaUnidad] = useState(false);
  const [filtrosPorDepartamento, setFiltrosPorDepartamento] = useState({});
  const [solicitudDesplazamiento, setSolicitudDesplazamiento] = useState(0);
  const [eliminacion, setEliminacion] = useState(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [mensajeEliminacion, setMensajeEliminacion] = useState("");
  const [dependenciasEliminacion, setDependenciasEliminacion] = useState([]);
  const [descargandoFlota, setDescargandoFlota] = useState(false);
  const [errorDescargaFlota, setErrorDescargaFlota] = useState("");

  const anomalias = useMemo(() => detectarAnomaliasFlota(unidades, cargasEdenred), [unidades, cargasEdenred]);
  const anomalyIdsAcknowledged = useMemo(
    () => new Set(anomalyCases
      .filter((item) => item.acknowledged)
      .map((item) => String(item.evidence?.id ?? ""))
      .filter(Boolean)),
    [anomalyCases],
  );
  const anomaliasParaColor = useMemo(
    () => anomalias.filter((item) => !["edenred", "transacciones"].includes(item.categoria)
      || !anomalyIdsAcknowledged.has(String(item.id))),
    [anomalias, anomalyIdsAcknowledged],
  );
  const anomaliaActiva = anomalias.find((anomalia) => anomalia.id === searchParams.get("anomaly")) ?? null;
  const unidadesConHallazgo = useMemo(
    () => new Set(anomalias.flatMap((anomalia) => anomalia.unidadIds ?? []).map(String)),
    [anomalias],
  );
  async function marcarAlertasDeUnidadVistas(unidadId) {
    const findingIds = anomalias
      .filter((item) => ["edenred", "transacciones"].includes(item.categoria)
        && (item.unidadIds ?? []).some((id) => String(id) === String(unidadId))
        && !anomalyIdsAcknowledged.has(String(item.id)))
      .map((item) => String(item.id));
    if (findingIds.length === 0) throw new Error("No hay alertas pendientes para marcar como vistas.");
    await marcarCasosAnomaliaVistos(findingIds, token);
    await refreshAnomalyCases();
  }
  const duplicadosPorUnidad = useMemo(() => {
    const resultado = new Map();
    anomalias.filter((anomalia) => anomalia.camposDuplicados).forEach((anomalia) => {
      anomalia.unidadIds.forEach((unidadId) => {
        const registros = anomalia.registrosDuplicados
          .filter((registro) => String(registro.unidadId) !== String(unidadId))
          .map((registro) => String(registro.identificador));
        const campos = resultado.get(String(unidadId)) ?? {};
        campos[anomalia.campoUnidad] = { campo: anomalia.campo, valor: anomalia.valorDuplicado, registros };
        resultado.set(String(unidadId), campos);
      });
    });
    return resultado;
  }, [anomalias]);

  const unidadesConFiltrosDepartamento = useMemo(() => unidades.filter((unidad) => {
    const clave = unidad.departamentoId ?? unidad.departamento ?? "sin-departamento";
    const filtros = filtrosPorDepartamento[clave];
    if (!filtros) return true;
    const placa = obtenerPlacaVigente(unidad);
    if (filtros.placa && String(placa ?? "").trim().toUpperCase() !== filtros.placa.trim().toUpperCase()) return false;
    if (filtros.economico && String(unidad.economico ?? "").trim().toUpperCase() !== filtros.economico.trim().toUpperCase()) return false;
    return true;
  }), [filtrosPorDepartamento, unidades]);
  const solicitudAnomaliaActiva = Boolean(searchParams.get("anomaly") || unidadesAnomalia.length);
  const busquedaActiva = solicitudAnomaliaActiva ? "" : (busquedaFlota || query);
  const unidadesBuscadas = useMemo(
    () => {
      const encontradas = filtrarUnidadesPorBusqueda(unidadesConFiltrosDepartamento, busquedaActiva);
      if (!solicitudAnomaliaActiva) return encontradas;
      const visibles = new Set(encontradas.map((unidad) => String(unidad.id)));
      const faltantes = unidades.filter((unidad) => unidadesAnomalia.includes(String(unidad.id)) && !visibles.has(String(unidad.id)));
      return [...encontradas, ...faltantes];
    },
    [unidades, unidadesAnomalia, unidadesConFiltrosDepartamento, busquedaActiva, solicitudAnomaliaActiva],
  );
  const unidadesConEconomico = useMemo(
    () => unidadesBuscadas.filter((unidad) => unidad.economico || unidadesConHallazgo.has(String(unidad.id))
      || (solicitudAnomaliaActiva && unidadesAnomalia.includes(String(unidad.id)))),
    [unidadesBuscadas, unidadesConHallazgo, solicitudAnomaliaActiva, unidadesAnomalia],
  );

  const gruposPorDepartamento = useMemo(() => {
    const grupos = new Map();
    unidadesConEconomico.forEach((unidad) => {
      const clave = unidad.departamentoId ?? unidad.departamento ?? "sin-departamento";
      const lista = grupos.get(clave) ?? [];
      lista.push(unidad);
      grupos.set(clave, lista);
    });
    return grupos;
  }, [unidadesConEconomico]);

  async function descargarFlotaVehicular() {
    setDescargandoFlota(true);
    setErrorDescargaFlota("");
    try {
      if (unidades.length === 0) {
        throw new Error("No hay unidades cargadas desde el servidor. Espera a que termine la carga e inténtalo de nuevo.");
      }
      await mostrarPdfGenerado(
        () => generarPdfFlotaVehicular({ departamentos, unidades }),
        "flota-vehicular.pdf",
      );
    } catch (error) {
      setErrorDescargaFlota(error.message || "No fue posible generar el PDF de la flota vehicular.");
    } finally {
      setDescargandoFlota(false);
    }
  }

  async function handleAgregarDepartamento() {
    const nombre = window.prompt("Nombre del nuevo departamento:");
    if (!nombre || !nombre.trim()) return;
    try {
      const departamento = await crearDepartamentoApi({ nombre: nombre.trim() });
      agregarDepartamento(departamento);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function ejecutarEliminacion() {
    if (!eliminacion) return;
    setEliminando(true);
    setMensajeEliminacion("");
    setDependenciasEliminacion([]);
    try {
      if (eliminacion.tipo === "parque") {
        const respuesta = await eliminarParqueVehicularApi(confirmacion);
        reemplazarUnidades([]);
        setMensajeEliminacion(`${respuesta.mensaje} Backup validado.`);
      } else {
        const respuesta = await eliminarDepartamentoApi(eliminacion.id, confirmacion);
        reemplazarDepartamentos(departamentos.filter((item) => String(item.id) !== String(eliminacion.id)));
        setMensajeEliminacion(`${respuesta.mensaje} Backup validado.`);
      }
      setConfirmacion("");
      setEliminacion(null);
    } catch (error) {
      setMensajeEliminacion(error.message);
      setDependenciasEliminacion(error.dependencias ?? []);
    } finally {
      setEliminando(false);
    }
  }

  function seleccionarUnidad(id) {
    setSearchParams((params) => {
      params.set("unidad", String(id));
      return params;
    }, { replace: true });
  }

  function cerrarUnidad() {
    setSearchParams((params) => {
      params.delete("unidad");
      return params;
    }, { replace: true });
  }

  const unidadSeleccionada = unidades.find((unidad) => String(unidad.id) === unidadSeleccionadaId) ?? null;

  return (
    <>
      <TopNavBar searchPlaceholder={vistaActual === "indice" ? "Buscar unidad, estado, placa o económico..." : "Buscar unidad, estado, placa o conductor..."} />
      <main className="flex-1 min-w-0 overflow-auto custom-scrollbar p-margin-mobile md:p-margin-desktop bg-background space-y-8">
        <div className="flex items-center gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3">
          <span className="material-symbols-outlined text-primary">search</span>
          <input
            value={busquedaFlota}
            onChange={(event) => setBusquedaFlota(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSolicitudDesplazamiento((valor) => valor + 1);
            }}
            placeholder="Buscar en toda la flota: económico, estado, placa, VIN, combustible, departamento..."
            className="w-full bg-transparent text-sm text-on-surface outline-none"
          />
          {busquedaFlota && <button type="button" onClick={() => setBusquedaFlota("")} className="text-sm text-on-surface-variant hover:text-primary">Limpiar</button>}
        </div>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Flota Vehicular</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {vistaActual === "indice"
                ? `${unidadesBuscadas.length} unidades visibles en el índice`
                : `Total general: ${unidadesConEconomico.length} unidades en todos los departamentos`}
            </p>
          </div>
          <div className="flex flex-wrap justify-start lg:justify-end gap-2 min-w-0">
            <div className="inline-flex rounded-lg border border-outline-variant overflow-hidden bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => navigate("/flota")}
                className={`px-3 py-2 text-sm font-medium ${vistaActual === "flota" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
              >
                Flota
              </button>
              <button
                type="button"
                onClick={() => navigate("/indice-unidades")}
                className={`px-3 py-2 text-sm font-medium ${vistaActual === "indice" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
              >
                Índice de Unidades
              </button>
            </div>
            <CargadorParqueVehicular unidades={unidades} departamentos={departamentos} />
            <button
              type="button"
              onClick={handleAgregarDepartamento}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
               Nuevo departamento
            </button>
            <button
               type="button"
               onClick={() => { setConfirmacion(""); setMensajeEliminacion(""); setDependenciasEliminacion([]); setEliminacion({ tipo: "parque" }); }}
               className="px-4 py-2 border border-error text-error rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-error-container/20 transition-colors"
            >
               <span className="material-symbols-outlined text-[18px]">delete_forever</span>
               Borrar parque completo
            </button>
            <GlowButton
              type="button"
              onClick={descargarFlotaVehicular}
              disabled={descargandoFlota}
            >
              <span className="material-symbols-outlined text-[18px]">{descargandoFlota ? "progress_activity" : "download"}</span>
              {descargandoFlota ? "Preparando PDF…" : "Descargar flota vehicular"}
            </GlowButton>
            <button
              onClick={() => setMostrarAltaUnidad(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Agregar unidad nueva
            </button>
          </div>
          {errorDescargaFlota && <p role="alert" className="mt-3 text-sm text-error">{errorDescargaFlota}</p>}
        </div>

        <LeyendaDeColores />
        {vistaActual === "indice" ? (
          <IndiceUnidadesVista
            unidades={unidadesBuscadas}
            todasLasUnidades={unidades}
            onSeleccionarUnidad={seleccionarUnidad}
            reportes={reportes}
            anomalias={anomaliasParaColor}
            anomaliaActiva={anomaliaActiva}
            duplicadosPorUnidad={duplicadosPorUnidad}
            searchQuery={busquedaActiva}
            scrollRequest={solicitudDesplazamiento}
            unidadesAnomalia={unidadesAnomalia}
            resaltarFiltrado={Object.values(filtrosPorDepartamento).some((filtros) => filtros && Object.values(filtros).some(Boolean))}
          />
        ) : (
          <>
            {departamentos.map((departamento) => (
              <GrupoDepartamento
                key={departamento.id}
                nombreDepartamento={departamento.nombre}
                unidadesDelGrupo={gruposPorDepartamento.get(departamento.id) ?? []}
                onSeleccionarUnidad={seleccionarUnidad}
                searchQuery={busquedaActiva}
                scrollRequest={solicitudDesplazamiento}
                unidadesAnomalia={unidadesAnomalia}
                filtros={filtrosPorDepartamento[departamento.id]}
                onFiltrosChange={(filtros) => setFiltrosPorDepartamento((anteriores) => ({ ...anteriores, [departamento.id]: filtros }))}
                onEliminar={() => { setConfirmacion(""); setMensajeEliminacion(""); setDependenciasEliminacion([]); setEliminacion({ tipo: "departamento", id: departamento.id, nombre: departamento.nombre }); }}
                duplicadosPorUnidad={duplicadosPorUnidad}
                todasLasUnidades={unidades}
                reportes={reportes}
                anomalias={anomaliasParaColor}
              />
            ))}
            {gruposPorDepartamento.has("sin-departamento") && (
              <GrupoDepartamento
                nombreDepartamento={obtenerNombreDepartamento(null)}
                unidadesDelGrupo={gruposPorDepartamento.get("sin-departamento")}
                onSeleccionarUnidad={seleccionarUnidad}
                searchQuery={busquedaActiva}
                scrollRequest={solicitudDesplazamiento}
                unidadesAnomalia={unidadesAnomalia}
                destacarComoPendiente
                filtros={filtrosPorDepartamento["sin-departamento"]}
                onFiltrosChange={(filtros) => setFiltrosPorDepartamento((anteriores) => ({ ...anteriores, "sin-departamento": filtros }))}
                duplicadosPorUnidad={duplicadosPorUnidad}
                todasLasUnidades={unidades}
                reportes={reportes}
                anomalias={anomaliasParaColor}
              />
            )}
          </>
        )}
      </main>

      {unidadSeleccionada && (
        <UnidadDetallePanel
          key={unidadSeleccionada.id}
          unidad={unidadSeleccionada}
          onCerrar={cerrarUnidad}
          todasLasUnidades={unidades}
          reportes={reportes}
          cargasEdenred={cargasEdenred}
          anomalias={anomalias}
          anomaliasAtendidasIds={anomalyIdsAcknowledged}
          onMarcarAlertasVistas={marcarAlertasDeUnidadVistas}
        />
      )}
      {mostrarAltaUnidad && <UnidadFormNueva onCerrar={() => setMostrarAltaUnidad(false)} />}
      {eliminacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-surface-container-lowest p-6 shadow-xl">
            <h2 className="font-title-lg text-title-lg text-error">Borrado protegido</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {eliminacion.tipo === "departamento"
                ? "Se revisarán las referencias directas desde unidades, usuarios y reportes. Si existen, el servidor bloqueará el borrado y mostrará sus cantidades. No se eliminan ni reasignan datos automáticamente; los tickets y documentos ligados a unidades no son referencias directas del departamento."
                : "Se creará y validará un backup antes de reiniciar el parque. Esta operación elimina unidades y datos operativos vinculados."}
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">Escribe exactamente: <code>{eliminacion.tipo === "parque" ? "REINICIAR LINEA BASE DEL PARQUE VEHICULAR" : `BORRAR DEPARTAMENTO ${String(eliminacion.nombre).toUpperCase()}`}</code></p>
            <input value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} className="mt-3 w-full rounded border border-outline-variant bg-surface p-2 text-on-surface" autoFocus />
            {mensajeEliminacion && (
              <div className="mt-3 rounded-lg border border-error/30 bg-error-container/20 p-3 text-sm text-error" role="alert">
                <p>{mensajeEliminacion}</p>
                {dependenciasEliminacion.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {dependenciasEliminacion.map((dependencia) => (
                      <li key={dependencia.tipo} className="rounded-md bg-surface-container-lowest p-3 text-on-surface">
                        <p className="font-semibold">
                          {dependencia.nombre}: {dependencia.cantidad} referencia{dependencia.cantidad === 1 ? "" : "s"}
                          {dependencia.referencia && <span className="ml-1 font-mono text-xs text-on-surface-variant">({dependencia.referencia})</span>}
                        </p>
                        <p className="mt-1 text-on-surface-variant">{dependencia.resolucion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEliminacion(null)} className="rounded border border-outline-variant px-4 py-2" disabled={eliminando}>Cancelar</button>
              <button type="button" onClick={ejecutarEliminacion} disabled={eliminando || !confirmacion.trim()} className="rounded bg-error px-4 py-2 text-on-error disabled:opacity-50">{eliminando ? "Validando…" : "Confirmar borrado"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IndiceUnidadesVista({ unidades, todasLasUnidades, onSeleccionarUnidad, reportes, anomalias, searchQuery, resaltarFiltrado = false, scrollRequest = 0, anomaliaActiva = null, duplicadosPorUnidad, unidadesAnomalia = [] }) {
  const tablaRef = useRef(null);
  const unidadesEvaluadas = useMemo(
    () => unidades.map((unidad, indice) => ({ numero: indice + 1, unidad, ...evaluarColorUnidad(unidad, todasLasUnidades, reportes, anomalias) })),
    [unidades, todasLasUnidades, reportes, anomalias],
  );

  useEffect(() => {
    if (!scrollRequest && unidadesAnomalia.length === 0) return;
    const match = tablaRef.current?.querySelector('[data-anomaly-match="true"]')
      ?? tablaRef.current?.querySelector('[data-search-match="true"]');
    if (!match || !tablaRef.current) return;

    const container = tablaRef.current;
    const row = match.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + row.top - bounds.top - (container.clientHeight - row.height) / 2,
      behavior: "smooth",
    });
  }, [scrollRequest, unidadesAnomalia, unidades.length]);

  return (
    <div className="space-y-4">
      <div
        ref={tablaRef}
        className="bg-surface-container-lowest rounded-lg border border-outline-variant transaction-table-scroll custom-scrollbar"
        role="region"
        tabIndex={0}
        aria-label="Índice de unidades desplazable"
      >
        <table className="fleet-color-table w-full min-w-[900px] text-left text-[11px]">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase sticky top-0 z-10">
            <tr>
              <th className="w-12 whitespace-nowrap p-1.5">No.</th>
              <th className="whitespace-nowrap p-1.5">Económico</th>
              <th className="p-1.5">Marca / Submarca</th>
              <th className="whitespace-nowrap p-1.5">Placas</th>
              <th className="whitespace-nowrap p-1.5">Placas {new Date().getFullYear()}</th>
              <th className="whitespace-nowrap p-1.5">VIN</th>
              <th className="p-1.5">Departamento</th>
              <th className="whitespace-nowrap p-1.5">Estado</th>
              <th className="p-1.5">Alerta del sistema</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {unidadesEvaluadas.map(({ numero, unidad, razones, alertas }) => {
              const coincide = resaltarFiltrado || (Boolean(searchQuery?.trim()) && coincideUnidadBusqueda(unidad, searchQuery, obtenerNombreDepartamento));
              const duplicados = duplicadosPorUnidad.get(String(unidad.id)) ?? {};
              const camposDuplicados = Object.values(duplicados).map((duplicado) => duplicado.campo);
              const coincideAnomalia = unidadesAnomalia.includes(String(unidad.id))
                || (anomaliaActiva?.unidadIds ?? []).some((id) => String(id) === String(unidad.id));
              const estado = ESTADOS_UNIDAD.find((item) => item.value === unidad.estado) ?? { value: "sin-estado", label: "Sin estado" };
              return (
              <tr
                key={unidad.id}
                onClick={() => onSeleccionarUnidad(unidad.id)}
                data-search-match={coincide ? "true" : undefined}
                data-anomaly-match={coincideAnomalia ? "true" : undefined}
                title={razones.join(" · ") || "Sin alertas"}
                style={{ "--fleet-alert-gradient": obtenerGradienteFilaAlertas(alertas) }}
                className={`cursor-pointer transition-all ${obtenerClasesFilaUnidad(unidad, reportes, anomalias)} ${coincideAnomalia ? "outline outline-2 outline-orange-700" : coincide ? "outline outline-1 outline-primary" : "hover:brightness-[0.98]"}`}
              >
                <td className="whitespace-nowrap p-1.5 font-technical-mono text-technical-mono text-on-surface-variant">{numero}</td>
                <td className="whitespace-nowrap p-1.5 font-technical-mono text-technical-mono">
                  <ValorConDuplicado unidad={unidad} campo="economico" duplicadosPorUnidad={duplicadosPorUnidad} pastel>
                    <NumeroEconomico valor={unidad.economico} />
                  </ValorConDuplicado>
                </td>
                <td className="max-w-52 p-1.5">{unidad.marca ?? ""} {unidad.submarca ?? ""}</td>
                <td className="whitespace-nowrap p-1.5"><ValorConDuplicado unidad={unidad} campo="placas" duplicadosPorUnidad={duplicadosPorUnidad} pastel>{unidad.placas ?? "-"}</ValorConDuplicado></td>
                <td className="whitespace-nowrap p-1.5">
                  <ValorConDuplicado unidad={unidad} campo="placas2025" duplicadosPorUnidad={duplicadosPorUnidad} pastel>
                    {unidad.placas2025 ?? "-"}
                  </ValorConDuplicado>
                </td>
                <td className="whitespace-nowrap p-1.5 font-technical-mono text-technical-mono">
                  <ValorConDuplicado unidad={unidad} campo="numeroSerie" duplicadosPorUnidad={duplicadosPorUnidad} pastel>{unidad.numeroSerie ?? "-"}</ValorConDuplicado>
                </td>
                <td className="max-w-48 p-1.5">{obtenerNombreDepartamento(unidad.departamentoId ?? unidad.departamento)}</td>
                <td className="whitespace-nowrap p-1.5">
                  <EstadoUnidadEtiqueta estado={estado.value}>
                    {estado?.label ?? "Sin estado"}
                  </EstadoUnidadEtiqueta>
                </td>
                <td className="p-1.5">
                  <AlertasUnidad
                    alertas={alertas}
                    razones={razones}
                    etiquetasPersonalizadas={camposDuplicados.length > 0 ? { duplicados: `Duplicado: ${camposDuplicados.join(", ")}` } : {}}
                  />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeyendaDeColores() {
  return (
    <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Estado operativo · color de etiqueta</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ESTADOS_UNIDAD.map((estado) => {
          const estilo = CLASES_ESTADO_UNIDAD[estado.value];
          return (
            <div key={estado.value} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${estilo.punto}`} aria-hidden="true"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{estado.label}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-outline-variant/40 pt-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Alertas · color de etiqueta</p>
        <div className="flex flex-wrap gap-2">
          {["duplicados", "datos", "transacciones", "edenred", "reporte", "ok"].map((categoria) => (
            <AlertaUnidadEtiqueta key={categoria} categoria={categoria} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Un departamento completo: encabezado, su propio filtro (Placa/Económico,
 * vía el núcleo centralizado) y su propia tabla filtrada. Cada instancia
 * de este componente maneja su estado de filtro de forma independiente -
 * filtrar el departamento de Líneas no afecta al de Subestaciones.
 */
function GrupoDepartamento({ nombreDepartamento, unidadesDelGrupo, onSeleccionarUnidad, searchQuery, filtros, onFiltrosChange, onEliminar, scrollRequest = 0, destacarComoPendiente = false, duplicadosPorUnidad, unidadesAnomalia = [], todasLasUnidades, reportes, anomalias }) {
  const filtrosActivos = filtros ?? { placa: "", economico: "", departamento: "", anio: "", mes: "", dia: "", hora: "" };
  function setFiltro(campo, valor) {
    onFiltrosChange({ ...filtrosActivos, [campo]: valor });
  }
  function limpiarFiltros() {
    onFiltrosChange({ placa: "", economico: "", departamento: "", anio: "", mes: "", dia: "", hora: "" });
  }

  const extractores = useMemo(
    () => ({
      obtenerPlaca: (unidad) => obtenerPlacaVigente(unidad),
      obtenerEconomico: (unidad) => unidad.economico,
    }),
    [],
  );
  const unidadesFiltradas = useFiltrosFlota(unidadesDelGrupo, filtrosActivos, extractores)
    .filter((unidad) => !searchQuery || coincideUnidadBusqueda(unidad, searchQuery, obtenerNombreDepartamento));
  const unidadesNumeradas = useMemo(
    () => unidadesFiltradas.map((unidad, indice) => ({ ...unidad, numeroDepartamento: indice + 1 })),
    [unidadesFiltradas],
  );

  function estadoInfo(valor) {
    return ESTADOS_UNIDAD.find((estado) => estado.value === valor) ?? { value: "sin-estado", label: "Sin estado" };
  }

  const columnas = useMemo(
    () => [
      { key: "numeroDepartamento", label: "No.", render: (u) => u.numeroDepartamento },
      { key: "economico", label: "Económico", render: (u) => <ValorConDuplicado unidad={u} campo="economico" duplicadosPorUnidad={duplicadosPorUnidad}><NumeroEconomico valor={u.economico} /></ValorConDuplicado> },
      { key: "marcaSubmarca", label: "Marca / Submarca", render: (u) => `${u.marca ?? ""} ${u.submarca ?? ""}` },
      { key: "conductorAsignado", label: "Resguardante", render: (u) => u.conductorAsignado ?? "Sin asignar" },
      { key: "placas", label: "Placas", render: (u) => <ValorConDuplicado unidad={u} campo="placas" duplicadosPorUnidad={duplicadosPorUnidad}>{u.placas ?? "-"}</ValorConDuplicado> },
      { key: "placas2025", label: `Placas vigentes (${new Date().getFullYear()})`, render: (u) => <ValorConDuplicado unidad={u} campo="placas2025" duplicadosPorUnidad={duplicadosPorUnidad}>{u.placas2025 ?? "-"}</ValorConDuplicado> },
      { key: "numeroSerie", label: "VIN", render: (u) => <ValorConDuplicado unidad={u} campo="numeroSerie" duplicadosPorUnidad={duplicadosPorUnidad}>{u.numeroSerie ?? "-"}</ValorConDuplicado> },
      { key: "kilometraje", label: "Kilometraje", alinearDerecha: true, render: (u) => (u.kilometraje ? `${u.kilometraje.toLocaleString("es-MX")} km` : "Sin capturar") },
      { key: "tipoCombustible", label: "Combustible", render: (u) => u.tipoCombustible ?? "Sin capturar" },
      {
        key: "alertas",
        label: "Alertas del sistema",
        render: (u) => {
          const { alertas, razones } = evaluarColorUnidad(u, todasLasUnidades, reportes, anomalias);
          const duplicados = duplicadosPorUnidad.get(String(u.id)) ?? {};
          const campos = Object.values(duplicados).map((duplicado) => duplicado.campo);
          return (
            <AlertasUnidad
              alertas={alertas}
              razones={razones}
              etiquetasPersonalizadas={campos.length > 0 ? { duplicados: `Duplicado: ${campos.join(", ")}` } : {}}
            />
          );
        },
      },
      {
        key: "estado",
        label: "Estado",
        render: (u) => {
          const estado = estadoInfo(u.estado);
          return (
            <EstadoUnidadEtiqueta estado={estado.value}>
              {estado.label}
            </EstadoUnidadEtiqueta>
          );
        },
      },
    ],
    [duplicadosPorUnidad, todasLasUnidades, reportes, anomalias],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined ${destacarComoPendiente ? "text-tertiary" : "text-primary"}`}>
          {destacarComoPendiente ? "warning" : "corporate_fare"}
        </span>
        <h2 className="font-title-md text-title-md text-on-surface">{nombreDepartamento}</h2>
        {onEliminar && <button type="button" onClick={onEliminar} className="text-error hover:text-error/70" title="Borrado protegido de departamento" aria-label={`Borrar departamento ${nombreDepartamento}`}><span className="material-symbols-outlined text-[18px]">delete</span></button>}
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          ({unidadesDelGrupo.length} unidad{unidadesDelGrupo.length === 1 ? "" : "es"})
        </span>
      </div>

      {unidadesDelGrupo.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm pl-8">Sin unidades asignadas a este departamento todavía.</p>
      ) : (
        <div className="pl-8 space-y-3">
          <BarraFiltrosFlota
            filtros={filtrosActivos}
            setFiltro={setFiltro}
            limpiarFiltros={limpiarFiltros}
            camposVisibles={["placa", "economico"]}
          />
          <TablaColumnasDinamicas
            filas={unidadesNumeradas}
            columnas={columnas}
            obtenerLlave={(unidad) => unidad.id}
            onFilaClick={(unidad) => onSeleccionarUnidad(unidad.id)}
            searchQuery={searchQuery}
            resaltarFilas={Object.values(filtrosActivos).some(Boolean)}
            coincideFila={(unidad) => Boolean(searchQuery?.trim()) && coincideUnidadBusqueda(unidad, searchQuery, obtenerNombreDepartamento)}
            scrollRequest={scrollRequest}
            unidadesAnomalia={unidadesAnomalia}
            classNameFila={(unidad) => obtenerClasesFilaUnidad(unidad, reportes, anomalias)}
            styleFila={(unidad) => ({
              "--fleet-alert-gradient": obtenerGradienteFilaAlertas(
                evaluarColorUnidad(unidad, todasLasUnidades, reportes, anomalias).alertas,
              ),
            })}
            scrollVertical
            allowVerticalScrollChaining
          />
        </div>
      )}
    </section>
  );
}

export default ModuloFlotaPage;
