import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { actualizarReporte, ESTADOS_REPORTE } from "../../data/reportesStore.js";
import { formatearFechaHora } from "../../utils/formatearFecha.js";
import { obtenerNombreDepartamento } from "../../data/departamentosStore.js";
import EnlaceDescargaProtegida from "../ui/EnlaceDescargaProtegida.jsx";
import { actualizarReporteApi, agregarSeguimientoReporteApi } from "../../services/reporteService.js";
import { obtenerAniosDisponibles, useActualYear } from "../../hooks/useEjercicioFiscal.js";

const CLASES_ESTADO = {
  secondary: "bg-secondary-container/30 text-secondary border-secondary/40",
  tertiary: "bg-tertiary-container/30 text-tertiary border-tertiary/40",
  primary: "bg-primary-container/30 text-primary border-primary/40",
  success: "bg-green-100 text-green-700 border-green-300",
};

const ETIQUETAS_TIPO = {
  anomalia: "Anomalía",
  mantenimiento: "Mantenimiento",
  siniestro: "Siniestro",
};

function obtenerEstado(valor) {
  return ESTADOS_REPORTE.find((estado) => estado.value === valor) ?? ESTADOS_REPORTE[0];
}

const FILTROS_VACIOS = { texto: "", departamento: "", estado: "", anio: "" };

function SeguimientoReportes({ reportes, usuario, soloDepartamento = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const reporteSolicitadoId = searchParams.get("reporte");
  const reportesDisponibles = useMemo(
    () => soloDepartamento
      ? reportes.filter((reporte) => (
        String(reporte.departamentoId ?? "") === String(usuario?.departamentoId ?? "")
        || (
          reporte.departamentoId == null
          && String(reporte.autorDepartamento ?? "") === String(usuario?.departamento ?? "")
        )
      ))
      : reportes,
    [reportes, soloDepartamento, usuario?.departamento, usuario?.departamentoId],
  );
  const departamentos = useMemo(() => [...new Set(reportesDisponibles.map((reporte) => reporte.autorDepartamento).filter(Boolean))].sort(), [reportesDisponibles]);
  const anioActual = useActualYear();
  const anios = useMemo(
    () => obtenerAniosDisponibles(reportesDisponibles.map((reporte) => new Date(reporte.fecha).getFullYear()), anioActual),
    [reportesDisponibles, anioActual],
  );
  const [filtros, setFiltros] = useState(() => ({ texto: "", departamento: "", estado: "", anio: String(anioActual) }));
  const anioAnterior = useRef(anioActual);
  useEffect(() => {
    const previo = anioAnterior.current;
    if (previo === anioActual) return;
    anioAnterior.current = anioActual;
    setFiltros((actuales) => (
      actuales.anio === String(previo)
        ? { ...actuales, anio: String(anioActual) }
        : actuales
    ));
  }, [anioActual]);
  const [pagina, setPagina] = useState(1);
  const [reporteSeleccionadoId, setReporteSeleccionadoId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const filtrosActivos = useMemo(
    () => reporteSolicitadoId ? FILTROS_VACIOS : filtros,
    [filtros, reporteSolicitadoId],
  );
  const reportesFiltrados = useMemo(() => reportesDisponibles.filter((reporte) => {
    const texto = filtrosActivos.texto.trim().toLowerCase();
    const coincideTexto = !texto || [reporte.folio, reporte.autorNombre, reporte.descripcion].some((valor) => String(valor ?? "").toLowerCase().includes(texto));
    const coincideDepartamento = !filtrosActivos.departamento || reporte.autorDepartamento === filtrosActivos.departamento;
    const coincideEstado = !filtrosActivos.estado || (reporte.estado ?? "recibido") === filtrosActivos.estado;
    const coincideAnio = !filtrosActivos.anio || String(new Date(reporte.fecha).getFullYear()) === filtrosActivos.anio;
    return coincideTexto && coincideDepartamento && coincideEstado && coincideAnio;
  }), [filtrosActivos, reportesDisponibles]);
  const totalPaginas = Math.max(1, Math.ceil(reportesFiltrados.length / 20));
  const paginaVisible = Math.min(pagina, totalPaginas);
  const reportesPagina = reportesFiltrados.slice((paginaVisible - 1) * 20, paginaVisible * 20);
  const reporteSeleccionado = reporteSolicitadoId
    ? reportesDisponibles.find((reporte) => String(reporte.id) === reporteSolicitadoId)
    : reportesFiltrados.find((reporte) => String(reporte.id) === String(reporteSeleccionadoId))
      ?? reportesPagina[0]
      ?? null;

  async function enviarMensaje(event) {
    event.preventDefault();
    if (!reporteSeleccionado || !mensaje.trim()) return;
    try {
      setErrorOperacion("");
      const entrada = await agregarSeguimientoReporteApi(reporteSeleccionado.id, mensaje.trim());
      const seguimiento = [...(reporteSeleccionado.seguimiento ?? []), entrada];
      actualizarReporte(reporteSeleccionado.id, { seguimiento });
      setMensaje("");
    } catch (error) {
      setErrorOperacion(error.message);
    }
  }

  async function cambiarEstado(estado) {
    if (!reporteSeleccionado || soloDepartamento) return;
    try {
      setErrorOperacion("");
      await actualizarReporteApi(reporteSeleccionado.id, { estado });
      actualizarReporte(reporteSeleccionado.id, { estado });
    } catch (error) {
      setErrorOperacion(error.message);
    }
  }

  function actualizarFiltro(campo, valor) {
    setFiltros((actuales) => ({ ...(reporteSolicitadoId ? FILTROS_VACIOS : actuales), [campo]: valor }));
    setPagina(1);
    if (campo !== "texto") setReporteSeleccionadoId(null);
    if (reporteSolicitadoId) {
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("reporte");
        return siguientes;
      }, { replace: true });
    }
  }

  function seleccionarReporte(id) {
    setReporteSeleccionadoId(id);
    if (reporteSolicitadoId) {
      setFiltros(FILTROS_VACIOS);
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete("reporte");
        return siguientes;
      }, { replace: true });
    }
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-5 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface">Seguimiento de reportes</h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            {soloDepartamento ? "Consulta las respuestas del Administrador y responde en el mismo hilo." : "Revisa, actualiza y comunica el avance con cada departamento."}
          </p>
          {reporteSolicitadoId && !reporteSeleccionado && (
            <p role="status" className="mt-2 text-xs text-on-surface-variant">
              El reporte solicitado no está disponible o está fuera de tu ámbito.
            </p>
          )}
        </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{reportesFiltrados.length} de {reportesDisponibles.length} reporte(s)</span>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-outline-variant/30 bg-surface-container-low p-3 md:grid-cols-[minmax(12rem,1.6fr)_repeat(3,minmax(9rem,1fr))]">
        <input value={filtrosActivos.texto} onChange={(event) => actualizarFiltro("texto", event.target.value)} placeholder="Buscar folio, autor o descripción" className="rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm" />
        {!soloDepartamento && <select value={filtrosActivos.departamento} onChange={(event) => actualizarFiltro("departamento", event.target.value)} className="rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm"><option value="">Todos los departamentos</option>{departamentos.map((departamento) => <option key={departamento} value={departamento}>{obtenerNombreDepartamento(departamento)}</option>)}</select>}
        <select value={filtrosActivos.estado} onChange={(event) => actualizarFiltro("estado", event.target.value)} className="rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm"><option value="">Todos los estados</option>{ESTADOS_REPORTE.map((estado) => <option key={estado.value} value={estado.value}>{estado.label}</option>)}</select>
        <select value={filtrosActivos.anio} onChange={(event) => actualizarFiltro("anio", event.target.value)} className="rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm"><option value="">Todos los años</option>{anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}</select>
      </div>

      {reportesDisponibles.length === 0 ? (
        <p className="p-6 text-sm text-on-surface-variant">No hay reportes para mostrar.</p>
      ) : reportesFiltrados.length === 0 ? (
        <p className="p-6 text-sm text-on-surface-variant">No hay reportes con los filtros seleccionados.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.5fr)] min-h-[26rem]">
          <div className="border-b lg:border-b-0 lg:border-r border-outline-variant/30 max-h-[32rem] overflow-y-auto p-3 space-y-2">
            {reportesPagina.map((reporte) => {
              const estado = obtenerEstado(reporte.estado);
              return (
                <button
                  key={reporte.id}
                  type="button"
                  onClick={() => seleccionarReporte(reporte.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${reporte.id === reporteSeleccionado?.id ? "border-primary bg-primary-container/10" : "border-outline-variant/30 hover:bg-surface-container-low"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-technical-mono text-technical-mono text-xs text-primary">{reporte.folio}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${CLASES_ESTADO[estado.color]}`}>{estado.label}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-on-surface">{ETIQUETAS_TIPO[reporte.tipoReporte] ?? reporte.tipoReporte}</p>
                  <p className="mt-1 truncate text-xs font-medium text-on-surface">{reporte.autorDepartamento ? obtenerNombreDepartamento(reporte.autorDepartamento) : "Sin departamento"}</p>
                  <p className="mt-1 text-xs text-on-surface-variant truncate">{reporte.autorNombre}</p>
                  <p className="mt-1 text-[11px] text-outline">{formatearFechaHora(reporte.fecha)}</p>
                </button>
              );
            })}
          </div>

          {reporteSeleccionado && (
            <div className="min-w-0 p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-technical-mono text-technical-mono text-xs text-primary">{reporteSeleccionado.folio}</p>
                  <h3 className="mt-1 font-title-md text-title-md text-on-surface">{ETIQUETAS_TIPO[reporteSeleccionado.tipoReporte] ?? reporteSeleccionado.tipoReporte}</h3>
                  <p className="text-sm text-on-surface-variant">{reporteSeleccionado.autorNombre} · {obtenerNombreDepartamento(reporteSeleccionado.autorDepartamento)}</p>
                </div>
                {!soloDepartamento && (
                  <select value={reporteSeleccionado.estado ?? "recibido"} onChange={(event) => cambiarEstado(event.target.value)} className="rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm">
                    {ESTADOS_REPORTE.map((estado) => <option key={estado.value} value={estado.value}>{estado.label}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Dato label="Fecha de envío" valor={formatearFechaHora(reporteSeleccionado.fecha)} />
                <Dato label="Gravedad" valor={reporteSeleccionado.gravedad ?? "No especificada"} />
                <Dato label="Fecha de los hechos" valor={reporteSeleccionado.fechaHechos ?? "No indicada"} />
                <Dato label="Lugar" valor={reporteSeleccionado.lugarHechos ?? "No indicado"} />
              </div>
              <div className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface whitespace-pre-wrap">{reporteSeleccionado.descripcion}</div>
              {reporteSeleccionado.pdfUrl && (
                <EnlaceDescargaProtegida
                  url={reporteSeleccionado.pdfUrl}
                  nombre={`${reporteSeleccionado.folio}.pdf`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  Descargar reporte oficial
                </EnlaceDescargaProtegida>
              )}

              <div>
                <h4 className="mb-2 font-label-sm text-label-sm uppercase text-on-surface-variant">Comunicación y seguimiento</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-outline-variant/30 p-3">
                  {(reporteSeleccionado.seguimiento ?? []).map((entrada) => (
                    <div key={entrada.id} className={`rounded-md p-3 text-sm ${entrada.autorTipo === "administrador" ? "bg-primary-container/10" : "bg-surface-container-low"}`}>
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-on-surface-variant"><strong>{entrada.autorNombre}</strong><span>{formatearFechaHora(entrada.fecha)}</span></div>
                      <p className="mt-1 whitespace-pre-wrap text-on-surface">{entrada.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>

              {errorOperacion && <p role="alert" className="mb-2 text-sm text-error">{errorOperacion}</p>}
              <form onSubmit={enviarMensaje} className="flex flex-col gap-2 sm:flex-row">
                <input value={mensaje} onChange={(event) => setMensaje(event.target.value)} placeholder="Escribe una actualización o respuesta..." className="min-w-0 flex-1 rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-sm" />
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-on-primary hover:bg-secondary">Enviar</button>
              </form>
            </div>
          )}
        </div>
      )}
      {reportesFiltrados.length > 0 && (
        <div className="flex items-center justify-between border-t border-outline-variant/30 px-4 py-3 text-sm text-on-surface-variant">
          <span>Página {paginaVisible} de {totalPaginas}</span>
          <div className="flex gap-2"><button type="button" disabled={paginaVisible === 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} className="rounded-md border border-outline-variant px-3 py-1 disabled:opacity-40">Anterior</button><button type="button" disabled={paginaVisible === totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))} className="rounded-md border border-outline-variant px-3 py-1 disabled:opacity-40">Siguiente</button></div>
        </div>
      )}
    </section>
  );
}

function Dato({ label, valor }) {
  return <div className="rounded-md border border-outline-variant/30 p-3"><p className="text-xs uppercase text-on-surface-variant">{label}</p><p className="mt-1 text-on-surface">{valor}</p></div>;
}

export default SeguimientoReportes;
