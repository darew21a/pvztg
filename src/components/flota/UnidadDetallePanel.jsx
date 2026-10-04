import { useEffect, useMemo, useState } from "react";
import { ESTADOS_UNIDAD, TIPOS_COMBUSTIBLE, actualizarUnidad, darDeBajaUnidad } from "../../data/unidadesStore.js";
import { useDepartamentos } from "../../hooks/useDepartamentos.js";
import CampoUnidad from "./CampoUnidad.jsx";
import HistorialCombustible from "./HistorialCombustible.jsx";
import { formatearFecha } from "../../utils/formatearFecha.js";
import { actualizarUnidadApi, obtenerCredencialesEdenredApi, subirDocumentoUnidadApi } from "../../services/unidadService.js";
import { abrirODescargarArchivoProtegido } from "../../services/apiAuth.js";
import GlowButton from "../ui/GlowButton.jsx";
import { detectarAnomaliasFlota } from "../../utils/detectarAnomaliasFlota.js";
import NumeroEconomico from "./NumeroEconomico.jsx";
import { formatearFechaHora } from "../../utils/formatearFecha.js";
import { CLASES_COLOR_UNIDAD } from "../../utils/colorUnidad.js";
import { Link } from "react-router-dom";

/**
 * ============================================================================
 * EXPEDIENTE DE UNIDAD (panel deslizable)
 * ============================================================================
 * Se abre al hacer clic en una fila de la tabla de Flota. Permite:
 *  - Editar cualquier dato capturado (los del Excel de origen + los nuevos:
 *    kilometraje, tipo de combustible, estado operativo).
 *  - Subir documentos (seguro, tarjeta de circulación, otros) en PDF; el
 *    historial se conserva ordenado por fecha, nunca se sobreescribe.
 *  - Dar de baja la unidad (baja lógica: se conserva el registro).
 *
 * Los cambios se editan en un borrador local (`draft`) y solo se aplican al
 * store global al presionar "Guardar cambios" - así un clic accidental en un
 * campo no altera el dato real hasta confirmar.
 * ============================================================================
 */
function UnidadDetallePanel({
  unidad,
  onCerrar,
  todasLasUnidades,
  reportes = [],
  cargasEdenred = [],
  anomalias = [],
  anomaliasAtendidasIds = new Set(),
  onMarcarAlertasVistas,
}) {
  const [draft, setDraft] = useState(unidad);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");
  const [errorDocumento, setErrorDocumento] = useState("");
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const [credencialesEdenred, setCredencialesEdenred] = useState(null);
  const [credencialesModificadas, setCredencialesModificadas] = useState(false);
  const [errorCredenciales, setErrorCredenciales] = useState("");
  const [marcandoAlertasVistas, setMarcandoAlertasVistas] = useState(false);
  const [errorMarcarAlertas, setErrorMarcarAlertas] = useState("");
  const departamentos = useDepartamentos();
  useEffect(() => {
    let vigente = true;
    obtenerCredencialesEdenredApi(unidad.id)
      .then((credenciales) => {
        if (vigente) setCredencialesEdenred(credenciales);
      })
      .catch((error) => {
        if (vigente) {
          setCredencialesEdenred({ tarjetaEdenred: "", nip: "" });
          setErrorCredenciales(error.message);
        }
      });
    return () => {
      vigente = false;
    };
  }, [unidad.id]);
  const hallazgosUnidad = useMemo(() => {
    const flotaActualizada = [...todasLasUnidades.filter((item) => String(item.id) !== String(unidad.id)), draft];
    const hallazgos = detectarAnomaliasFlota(flotaActualizada, cargasEdenred)
      .filter((anomalia) => anomalia.unidadIds.some((id) => String(id) === String(unidad.id)));
    const resultado = hallazgos.reduce((acumulado, anomalia) => {
      if (anomalia.camposDuplicados || anomalia.camposIncompletos) {
        if (anomalia.camposIncompletos) acumulado.incompletos.push(...anomalia.camposIncompletos);
        if (anomalia.camposDuplicados) {
          acumulado.duplicados[anomalia.campoUnidad] = {
            campo: anomalia.campo,
            valor: anomalia.valorDuplicado,
            registros: anomalia.registrosDuplicados
              .filter((registro) => String(registro.unidadId) !== String(unidad.id))
              .map((registro) => String(registro.identificador)),
          };
        }
      }
      return acumulado;
    }, { incompletos: [], duplicados: {} });
    const reportesActivos = reportes.filter((reporte) => reporte.estado !== "resuelto"
      && (reporte.unidadesIds ?? [reporte.unidadId]).some((id) => String(id) === String(unidad.id)));
    return {
      ...resultado,
      alertasOperativas: hallazgos.filter((hallazgo) => ["edenred", "transacciones"].includes(hallazgo.categoria)),
      reportesActivos,
    };
  }, [draft, todasLasUnidades, cargasEdenred, reportes, unidad.id]);
  const duplicadosPorCampo = hallazgosUnidad.duplicados;
  const camposIncompletos = hallazgosUnidad.incompletos;
  const alertasOperativas = hallazgosUnidad.alertasOperativas;
  const reportesActivos = hallazgosUnidad.reportesActivos;
  const alertasEdenredUnidad = anomalias.filter((hallazgo) =>
    ["edenred", "transacciones"].includes(hallazgo.categoria)
    && (hallazgo.unidadIds ?? []).some((id) => String(id) === String(unidad.id)),
  );
  const alertasEdenredPendientes = alertasEdenredUnidad.filter(
    (hallazgo) => !anomaliasAtendidasIds.has(String(hallazgo.id)),
  );

  function actualizarCampo(name, value) {
    setDraft((anterior) => ({
      ...anterior,
      [name]: value,
      ...(name === "placas2025"
        ? { placasVigentesAnio: value.trim() ? new Date().getFullYear() : null }
        : {}),
    }));
  }

  async function marcarAlertasComoVistas() {
    if (marcandoAlertasVistas || alertasEdenredPendientes.length === 0) return;
    setMarcandoAlertasVistas(true);
    setErrorMarcarAlertas("");
    try {
      await onMarcarAlertasVistas(unidad.id);
    } catch (error) {
      setErrorMarcarAlertas(error.message);
    } finally {
      setMarcandoAlertasVistas(false);
    }
  }

  async function guardarCambios() {
    setGuardando(true);
    setErrorGuardado("");
    try {
      const cambios = {
        numeroSerie: draft.numeroSerie,
        economico: draft.economico,
        placas: draft.placas,
        placas2025: draft.placas2025,
        placasVigentesAnio: draft.placasVigentesAnio ?? null,
        marca: draft.marca,
        submarca: draft.submarca,
        cilindros: draft.cilindros,
        tipo: draft.tipo,
        modelo: draft.modelo,
        departamentoId: draft.departamentoId,
        kilometraje: draft.kilometraje,
        tipoCombustible: draft.tipoCombustible,
        estado: draft.estado,
        conductorAsignado: draft.conductorAsignado,
        resguardante2: draft.resguardante2,
        requiereResguardante2: draft.requiereResguardante2 === true,
        rpeResguardante: draft.rpeResguardante,
        centroGestor: draft.centroGestor,
        centroCostos: draft.centroCostos,
        ubicacionTecnica: draft.ubicacionTecnica,
        arrendadora: draft.arrendadora,
      };
      if (credencialesModificadas) {
        cambios.tarjetaEdenred = credencialesEdenred?.tarjetaEdenred ?? "";
        cambios.nip = credencialesEdenred?.nip ?? "";
      }

      await actualizarUnidadApi(unidad.id, cambios);
      const departamento = departamentos.find((item) => String(item.id) === String(draft.departamentoId));
      actualizarUnidad(unidad.id, { ...draft, departamento: departamento?.nombre ?? null });
      setCredencialesModificadas(false);
      onCerrar();
    } catch (error) {
      setErrorGuardado(error.message);
    } finally {
      setGuardando(false);
    }
  }

  function detalleDuplicado(campo) {
    const duplicado = duplicadosPorCampo[campo];
    return duplicado ? `“${duplicado.valor}”; también en: ${duplicado.registros.join(", ")}` : "";
  }

  function manejarCargaDocumento(tipoDocumento) {
    return async (event) => {
      const archivo = event.target.files?.[0];
      if (!archivo) return;
      setErrorDocumento("");
      setSubiendoDocumento(true);
      try {
        const documento = await subirDocumentoUnidadApi(unidad.id, tipoDocumento, archivo);
        setDraft((anterior) => ({
          ...anterior,
          documentos: [documento, ...(anterior.documentos ?? [])],
        }));
        actualizarUnidad(unidad.id, {
          documentos: [documento, ...(draft.documentos ?? [])],
        });
      } catch (error) {
        setErrorDocumento(error.message);
      } finally {
        setSubiendoDocumento(false);
        event.target.value = "";
      }
    };
  }

  function confirmarBaja() {
    if (window.confirm(`¿Dar de baja la unidad ${unidad.economico ?? unidad.numeroSerie}? El registro se conserva en el historial.`)) {
      actualizarUnidadApi(unidad.id, { estado: "baja" })
        .then(() => {
          darDeBajaUnidad(unidad.id);
          onCerrar();
        })
        .catch((error) => window.alert(error.message));
    }
  }

  async function manejarEdicionHistorial(mes, cambios) {
    const historialAnterior = draft.historialCombustible ?? [];
    const existente = historialAnterior.find((registro) => registro.mes === mes);
    const siguiente = existente
      ? historialAnterior.map((registro) => (registro.mes === mes ? { ...registro, ...cambios } : registro))
      : [...historialAnterior, { mes, ...cambios }];
    const historialActualizado = [...siguiente].sort((a, b) => a.mes.localeCompare(b.mes));

    try {
      await actualizarUnidadApi(unidad.id, { historialCombustible: historialActualizado });
      setDraft((anterior) => ({
        ...anterior,
        historialCombustible: historialActualizado,
      }));
      actualizarUnidad(unidad.id, { historialCombustible: historialActualizado });
    } catch (error) {
      window.alert(error.message);
    }
  }

  const documentosPorTipo = (tipo) =>
    draft.documentos
      .filter((documento) => documento.tipo === tipo)
      .sort((a, b) => new Date(b.fechaCarga) - new Date(a.fechaCarga)); // histórico por año de vigencia, más reciente primero

  return (
    <>
      <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 transition-opacity" onClick={onCerrar}></div>
      <aside className="fixed top-0 right-0 h-full w-full max-w-2xl bg-surface-container-lowest shadow-2xl z-50 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-container/10 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Expediente de unidad</p>
              <p className="mt-1 text-sm text-on-surface-variant">{[draft.marca, draft.submarca, draft.modelo].filter(Boolean).join(" · ") || "Datos del vehículo"}</p>
            </div>
            <NumeroEconomico valor={draft.economico} destacado />
            <button onClick={onCerrar} className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error" aria-label="Cerrar expediente">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {(Object.keys(duplicadosPorCampo).length > 0 || camposIncompletos.length > 0) && (
            <p className="rounded-md border border-tertiary/40 bg-tertiary-container/10 px-3 py-2 text-xs text-on-surface-variant">
              El expediente tiene {Object.keys(duplicadosPorCampo).length + camposIncompletos.length} dato(s) por revisar. Los campos afectados están marcados abajo.
            </p>
          )}
          <section aria-labelledby="alertas-unidad-heading">
            {alertasOperativas.length === 0 && reportesActivos.length === 0 ? (
              <p id="alertas-unidad-heading" className="rounded-md border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                Alertas y seguimiento: sin alertas activas de Edenred, cifras atípicas ni reportes pendientes.
              </p>
            ) : (
              <details className="overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-low">
                <summary id="alertas-unidad-heading" className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container-high [&::-webkit-details-marker]:hidden">
                  <span className="material-symbols-outlined text-[18px] text-primary">notifications_active</span>
                  <span className="font-semibold text-on-surface">Alertas y seguimiento</span>
                  <span className="text-xs text-on-surface-variant">
                    {alertasEdenredPendientes.length + reportesActivos.length} pendientes
                  </span>
                  {[
                    ...new Set(alertasOperativas.map((hallazgo) => hallazgo.categoria)),
                    ...(reportesActivos.length ? ["reporte"] : []),
                  ].map((categoria) => (
                    <span key={categoria} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CLASES_COLOR_UNIDAD[categoria].badge}`}>
                      {CLASES_COLOR_UNIDAD[categoria].etiqueta}
                      {categoria === "reporte" ? ` · ${reportesActivos.length}` : ` · ${alertasOperativas.filter((hallazgo) => hallazgo.categoria === categoria).length}`}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-primary">Ver detalle</span>
                </summary>
                <div className="max-h-[32vh] space-y-2 overflow-y-auto border-t border-outline-variant/40 p-3">
                  {alertasOperativas.map((hallazgo) => {
                    const categoria = hallazgo.categoria === "transacciones" ? "transacciones" : "edenred";
                    const atendida = anomaliasAtendidasIds.has(String(hallazgo.id));
                    return (
                      <article key={hallazgo.id} className={`rounded-md border p-2.5 ${CLASES_COLOR_UNIDAD[categoria].badge}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{hallazgo.titulo}</p>
                          <span className="text-[10px] font-semibold uppercase">{CLASES_COLOR_UNIDAD[categoria].etiqueta}</span>
                        </div>
                        <p className="mt-1 text-sm">{hallazgo.detalle}</p>
                        {hallazgo.suggestion && <p className="mt-1 text-xs opacity-80">{hallazgo.suggestion}</p>}
                        {atendida && <p className="mt-1 text-xs font-semibold">Marcada como vista para esta alerta.</p>}
                      </article>
                    );
                  })}
                  {alertasEdenredPendientes.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-outline-variant/40 bg-surface-container-lowest p-2">
                      <p className="text-xs text-on-surface-variant">
                        {alertasEdenredPendientes.length} alerta(s) Edenred o de cifras atípicas pendientes.
                      </p>
                      <button
                        type="button"
                        onClick={marcarAlertasComoVistas}
                        disabled={marcandoAlertasVistas}
                        className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-on-primary disabled:opacity-60"
                      >
                        {marcandoAlertasVistas ? "Marcando…" : "Marcar todas como vistas"}
                      </button>
                    </div>
                  )}
                  {errorMarcarAlertas && <p role="alert" className="text-xs text-error">{errorMarcarAlertas}</p>}
                  {reportesActivos.map((reporte) => (
                    <article key={reporte.id} className={`rounded-md border p-2.5 ${CLASES_COLOR_UNIDAD.reporte.badge}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Reporte activo · {reporte.folio ?? "Sin folio"}</p>
                        <span className="text-[10px] font-semibold uppercase">{String(reporte.estado ?? "recibido").replaceAll("-", " ")}</span>
                      </div>
                      <p className="mt-1 text-sm">{reporte.descripcion || "Sin descripción."}</p>
                      {reporte.fecha && <p className="mt-1 text-xs opacity-80">{formatearFechaHora(reporte.fecha)}</p>}
                      <Link
                        to={`/reportes?reporte=${encodeURIComponent(reporte.id)}`}
                        className="mt-2 inline-flex min-h-9 items-center rounded-md border border-current px-3 text-xs font-semibold hover:bg-white/40"
                      >
                        Abrir seguimiento del reporte
                      </Link>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </section>
          <section className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Datos Edenred</h3>
              <p className="text-xs text-on-surface-variant">Información visible y editable. Los cambios se guardan con «Guardar cambios».</p>
            </div>
            {errorCredenciales && <p role="alert" className="mt-2 text-xs text-error">{errorCredenciales}</p>}
            {credencialesEdenred && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 rounded-md border border-outline-variant/40 bg-surface-container-lowest p-2">
                  <span className="block text-xs text-on-surface-variant">No. tarjeta Edenred</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={credencialesEdenred.tarjetaEdenred ?? ""}
                    onChange={(event) => {
                      setCredencialesEdenred((actuales) => ({ ...actuales, tarjetaEdenred: event.target.value }));
                      setCredencialesModificadas(true);
                      setErrorCredenciales("");
                    }}
                    className="w-full rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-sm text-on-surface"
                    placeholder="Sin capturar"
                    aria-label="Número de tarjeta Edenred"
                  />
                </label>
                <label className="space-y-1 rounded-md border border-outline-variant/40 bg-surface-container-lowest p-2">
                  <span className="block text-xs text-on-surface-variant">NIP</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={credencialesEdenred.nip ?? ""}
                    onChange={(event) => {
                      setCredencialesEdenred((actuales) => ({ ...actuales, nip: event.target.value }));
                      setCredencialesModificadas(true);
                      setErrorCredenciales("");
                    }}
                    className="w-full rounded border border-outline-variant bg-surface px-2 py-1 font-mono text-sm text-on-surface"
                    placeholder="Sin capturar"
                    aria-label="NIP Edenred"
                  />
                </label>
              </div>
            )}
          </section>
          {/* Estado operativo: lo decide el auditor manualmente */}
          <div className={`space-y-2 rounded-md ${camposIncompletos.includes("estado") ? "border border-tertiary/70 bg-tertiary-container/10 p-2" : ""}`}>
            <span className={`block font-label-sm text-label-sm uppercase tracking-wide ${camposIncompletos.includes("estado") ? "font-bold text-tertiary" : "text-on-surface-variant"}`}>Estado de la unidad</span>
            {camposIncompletos.includes("estado") && <p className="text-xs font-medium text-tertiary">Dato pendiente de captura.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ESTADOS_UNIDAD.map((estado) => (
                <button
                  key={estado.value}
                  onClick={() => actualizarCampo("estado", estado.value)}
                  className={`py-2 px-2 rounded-lg font-label-sm text-label-sm transition-all border ${
                    draft.estado === estado.value
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-transparent text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                  }`}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos operativos nuevos (no vienen del Excel de origen) */}
          <div className="grid grid-cols-2 gap-4">
            <CampoUnidad label="Kilometraje" name="kilometraje" type="number" value={draft.kilometraje} onChange={actualizarCampo} incompleto={camposIncompletos.includes("kilometraje")} />
            <div className={`space-y-1 rounded-md ${camposIncompletos.includes("tipoCombustible") ? "border border-tertiary/70 bg-tertiary-container/10 p-2" : ""}`}>
              <label className={`block font-label-sm text-label-sm uppercase tracking-wide ${camposIncompletos.includes("tipoCombustible") ? "font-bold text-tertiary" : "text-on-surface-variant"}`} htmlFor="campo-tipoCombustible">
                Tipo de combustible
              </label>
              {camposIncompletos.includes("tipoCombustible") && <p className="text-xs font-medium text-tertiary">Dato pendiente de captura.</p>}
              <select
                id="campo-tipoCombustible"
                value={draft.tipoCombustible ?? ""}
                onChange={(event) => actualizarCampo("tipoCombustible", event.target.value)}
                className={`w-full px-3 py-2 border rounded-md bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${camposIncompletos.includes("tipoCombustible") ? "border-tertiary/70" : "border-outline-variant"}`}
              >
                <option value="">Sin capturar</option>
                {TIPOS_COMBUSTIBLE.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div className={`space-y-1 col-span-2 rounded-md ${camposIncompletos.includes("departamentoId") ? "border border-tertiary/70 bg-tertiary-container/10 p-2" : ""}`}>
              <label className={`block font-label-sm text-label-sm uppercase tracking-wide ${camposIncompletos.includes("departamentoId") ? "font-bold text-tertiary" : "text-on-surface-variant"}`} htmlFor="campo-departamento">
                Departamento (define qué Jefe de Departamento la ve)
              </label>
              {camposIncompletos.includes("departamentoId") && <p className="text-xs font-medium text-tertiary">Dato pendiente de asignación.</p>}
                <select
               id="campo-departamento"
               value={draft.departamentoId ?? ""}
                onChange={(event) => {
                const valor = event.target.value;
               setDraft((anterior) => ({
               ...anterior,
              departamento: valor,   // Mantiene tu propiedad actual
               departamentoId: valor, // CORRECCIÓN: Asegura que el perfil del departamento pueda encontrar el ID
               }));
             }}
               className={`w-full px-3 py-2 border rounded-md bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${camposIncompletos.includes("departamentoId") ? "border-tertiary/70" : "border-outline-variant"}`}
             >
                <option value="">Sin asignar</option>
                {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>
              ))}
               </select>
            </div>
          </div>

          {/* Datos del vehículo (origen: Excel de parque vehicular) */}
          <div className="space-y-3">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">Datos del vehículo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-primary/20 bg-primary-container/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">Identificador principal</span>
                  <NumeroEconomico valor={draft.economico} />
                </div>
                <CampoUnidad label="Número económico" name="economico" value={draft.economico} onChange={actualizarCampo} duplicado={Boolean(duplicadosPorCampo.economico)} detalleDuplicado={detalleDuplicado("economico")} incompleto={camposIncompletos.includes("economico")} />
              </div>
              <CampoUnidad label="Resguardante" name="conductorAsignado" value={draft.conductorAsignado} onChange={actualizarCampo} incompleto={camposIncompletos.includes("conductorAsignado")} />
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-on-surface-variant" htmlFor="requiere-resguardante-2">
                  <input
                    id="requiere-resguardante-2"
                    type="checkbox"
                    checked={draft.requiereResguardante2 === true}
                    onChange={(event) => actualizarCampo("requiereResguardante2", event.target.checked)}
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  Requiere Resguardante 2
                </label>
                <CampoUnidad
                  label="Resguardante 2 (si aplica)"
                  name="resguardante2"
                  value={draft.resguardante2}
                  onChange={actualizarCampo}
                  incompleto={camposIncompletos.includes("resguardante2")}
                />
              </div>
              <CampoUnidad label="Marca" name="marca" value={draft.marca} onChange={actualizarCampo} incompleto={camposIncompletos.includes("marca")} />
              <CampoUnidad label="Submarca" name="submarca" value={draft.submarca} onChange={actualizarCampo} incompleto={camposIncompletos.includes("submarca")} />
              <CampoUnidad label="Cilindros" name="cilindros" value={draft.cilindros} onChange={actualizarCampo} />
              <CampoUnidad label="Tipo" name="tipo" value={draft.tipo} onChange={actualizarCampo} incompleto={camposIncompletos.includes("tipo")} />
              <CampoUnidad label="Modelo (año)" name="modelo" value={draft.modelo} onChange={actualizarCampo} incompleto={camposIncompletos.includes("modelo")} />
              <CampoUnidad label="Placas" name="placas" value={draft.placas} onChange={actualizarCampo} duplicado={Boolean(duplicadosPorCampo.placas)} detalleDuplicado={detalleDuplicado("placas")} incompleto={camposIncompletos.includes("placas")} />
              <CampoUnidad label={`Placas vigentes (${new Date().getFullYear()})`} name="placas2025" value={draft.placas2025} onChange={actualizarCampo} duplicado={Boolean(duplicadosPorCampo.placas2025)} detalleDuplicado={detalleDuplicado("placas2025")} incompleto={camposIncompletos.includes("placas2025")} />
              <CampoUnidad label="No. de serie (VIN)" name="numeroSerie" value={draft.numeroSerie} onChange={actualizarCampo} duplicado={Boolean(duplicadosPorCampo.numeroSerie)} detalleDuplicado={detalleDuplicado("numeroSerie")} incompleto={camposIncompletos.includes("numeroSerie")} />
              <CampoUnidad label="R.P.E. resguardante" name="rpeResguardante" value={draft.rpeResguardante} onChange={actualizarCampo} incompleto={camposIncompletos.includes("rpeResguardante")} />
              <CampoUnidad label="Centro gestor" name="centroGestor" value={draft.centroGestor} onChange={actualizarCampo} incompleto={camposIncompletos.includes("centroGestor")} />
              <CampoUnidad label="Centro de costos" name="centroCostos" value={draft.centroCostos} onChange={actualizarCampo} incompleto={camposIncompletos.includes("centroCostos")} />
              <CampoUnidad label="Ubicación técnica" name="ubicacionTecnica" value={draft.ubicacionTecnica} onChange={actualizarCampo} incompleto={camposIncompletos.includes("ubicacionTecnica")} />
              <CampoUnidad label="Arrendadora" name="arrendadora" value={draft.arrendadora} onChange={actualizarCampo} incompleto={camposIncompletos.includes("arrendadora")} />
            </div>
          </div>

          {/* Historial de combustible: alimentado por el análisis de Edenred */}
          <div className="space-y-3">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">Historial de Combustible</h3>
            <HistorialCombustible
              historial={draft.historialCombustible}
              onEditar={manejarEdicionHistorial}
            />
          </div>

          {/* Documentación: seguro y tarjeta de circulación, historial por fecha */}
          <div className="space-y-4">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">
              Documentación - histórico por año de vigencia
            </h3>
            {errorDocumento && <p role="alert" className="rounded-md border border-error bg-error-container/20 px-3 py-2 text-sm text-error">{errorDocumento}</p>}
            {[
              { tipo: "seguro", etiqueta: "Póliza de seguro" },
              { tipo: "tarjeta-circulacion", etiqueta: "Tarjeta de circulación" },
            ].map(({ tipo, etiqueta }) => (
              <div key={tipo} className="border border-outline-variant/40 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface font-medium">{etiqueta}</span>
                  <label className="cursor-pointer font-label-sm text-label-sm text-primary hover:text-secondary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Subir nueva versión
                    <input type="file" accept="application/pdf" className="hidden" disabled={subiendoDocumento} onChange={manejarCargaDocumento(tipo)} />
                  </label>
                </div>
                {subiendoDocumento && <p className="text-sm text-on-surface-variant">Guardando documento…</p>}
                {documentosPorTipo(tipo).length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">Sin documentos cargados todavía.</p>
                ) : (
                  <ul className="space-y-1">
                    {documentosPorTipo(tipo).map((documento) => (
                      <li key={documento.id ?? documento.fechaCarga} className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">
                          {formatearFecha(documento.fechaCarga)}
                        </span>
                        <GlowButton
                          type="button"
                          onClick={() => abrirODescargarArchivoProtegido(
                            documento.url,
                            documento.nombreArchivo,
                          ).catch((error) => setErrorDocumento(error.message))}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {String(documento.nombreArchivo ?? "").toLowerCase().endsWith(".pdf") ? "open_in_new" : "download"}
                          </span>
                          {String(documento.nombreArchivo ?? "").toLowerCase().endsWith(".pdf") ? "Abrir PDF" : "Descargar"}
                        </GlowButton>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Acciones */}
          {errorGuardado && <p role="alert" className="rounded-md border border-error bg-error-container/20 px-3 py-2 text-sm text-error">{errorGuardado}</p>}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <button onClick={confirmarBaja} className="font-label-sm text-label-sm text-error hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Dar de baja unidad
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onCerrar} disabled={guardando} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={guardarCambios} disabled={guardando} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors disabled:opacity-50">
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default UnidadDetallePanel;
