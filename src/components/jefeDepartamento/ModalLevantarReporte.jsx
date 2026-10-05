import { useMemo, useState } from "react";
import GlowButton from "../ui/GlowButton.jsx";
import { agregarReporteRemoto, actualizarReporte } from "../../data/reportesStore.js";
import { crearReporteApi } from "../../services/reporteService.js";
import { resolveApiUrl } from "../../services/apiAuth.js";
import { generarPdfReporte } from "../../utils/generarReportePdf.js";

const TIPOS_SINIESTRO = [
  { value: "choque", label: "Choque" },
  { value: "atropellamiento", label: "Atropellamiento" },
  { value: "llanta", label: "Se ponchó la llanta" },
  { value: "descarrilo", label: "Se descarriló el carro y provocó un accidente" },
  { value: "falla-mecanica", label: "Falla mecánica mayor (Motor / Transmisión)" },
  { value: "robo", label: "Robo total o parcial de unidad o autopartes" },
  { value: "cristales", label: "Parabrisas o cristales rotos" },
  { value: "combustible", label: "Robo o discrepancia de Combustible" },
  { value: "clima", label: "Siniestro por condiciones climáticas (Inundación / Caída de árbol)" },
];

const GRAVEDADES = [
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "grave", label: "Grave" },
];

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function validarDescripcionSemantica(texto) {
  const descripcion = normalizarTexto(texto).replace(/\s+/g, " ").trim();
  if (!descripcion || descripcion.length < 5) return false;
  return /[a-záéíóúüñ0-9]/i.test(descripcion);
}

async function pdfUrlToFile(pdfUrl, filename) {
  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error("No fue posible preparar el PDF del reporte.");
  return new File([await response.blob()], filename, { type: "application/pdf" });
}

/**
 * Formulario para levantar un reporte formal sobre una o varias unidades
 * del departamento. El flujo exige información completa del incidente y
 * valida semánticamente la descripción antes de permitir el envío.
 */
function ModalLevantarReporte({ usuario, unidadesDelDepartamento, onCerrar }) {
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState([]);
  const [tipoSiniestro, setTipoSiniestro] = useState("choque");
  const [tipoSiniestroLibre, setTipoSiniestroLibre] = useState("");
  const [gravedad, setGravedad] = useState("moderada");
  const [involucrados, setInvolucrados] = useState("");
  const [fechaHechos, setFechaHechos] = useState("");
  const [lugarHechos, setLugarHechos] = useState("");
  const [horarioHechos, setHorarioHechos] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [pdfGenerado, setPdfGenerado] = useState(null);
  const [mostrarTipoLibre, setMostrarTipoLibre] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const formularioValido = useMemo(() => {
    const tieneUnidades = unidadesSeleccionadas.length > 0;
    const todosLosCampos = involucrados.trim() && fechaHechos && lugarHechos.trim() && horarioHechos && descripcion.trim();
    const descripcionValida = validarDescripcionSemantica(descripcion);
    return tieneUnidades && todosLosCampos && descripcionValida;
  }, [descripcion, fechaHechos, horarioHechos, involucrados, lugarHechos, unidadesSeleccionadas.length]);

  function alternarUnidad(unidadId) {
    setUnidadesSeleccionadas((anteriores) =>
      anteriores.includes(unidadId) ? anteriores.filter((id) => id !== unidadId) : [...anteriores, unidadId],
    );
  }

  async function handleEnviar(event) {
    event.preventDefault();
    setError("");

    if (unidadesSeleccionadas.length === 0) {
      setError("Selecciona al menos una unidad involucrada.");
      return;
    }

    if (!involucrados.trim() || !fechaHechos || !lugarHechos.trim() || !horarioHechos || !descripcion.trim()) {
      setError("Todos los campos obligatorios deben completarse antes de generar el PDF del reporte.");
      return;
    }

    if (!validarDescripcionSemantica(descripcion)) {
      setError("La descripción debe responder con claridad cuándo ocurrió, dónde ocurrió y por qué ocurrió el incidente.");
      return;
    }

    const unidadesElegidas = unidadesDelDepartamento.filter((unidad) => unidadesSeleccionadas.includes(unidad.id));

    const detalleFinal = mostrarTipoLibre && tipoSiniestroLibre.trim() ? tipoSiniestroLibre.trim() : tipoSiniestro;

    const datosReporte = {
      tipoReporte: "siniestro",
      unidadesIds: unidadesSeleccionadas,
      autorNombre: usuario.nombre,
      autorDepartamento: usuario.departamento ?? usuario.departamentoId,
      descripcion: descripcion.trim(),
      gravedad,
      detalleSiniestro: detalleFinal,
      involucrados: involucrados.trim(),
      fechaHechos,
      lugarHechos: lugarHechos.trim(),
      horarioHechos,
      pdfUrl: "",
    };

    setGuardando(true);
    const pestañaPdf = window.open("about:blank", "_blank");
    let pdfCreado = false;
    try {
      const fechaLocal = new Date().toISOString();
      const reporteLocal = {
        ...datosReporte,
        id: `local-${Date.now()}`,
        folio: `PVZTG-LOCAL-${Date.now().toString(36).toUpperCase()}`,
        fecha: fechaLocal,
      };
      const urlPdf = await generarPdfReporte(reporteLocal, unidadesElegidas);
      pdfCreado = true;
      if (pestañaPdf && !pestañaPdf.closed) pestañaPdf.location.href = urlPdf;
      setPdfGenerado({ folio: reporteLocal.folio, url: urlPdf, guardado: false });
      const formulario = new FormData();
      Object.entries(datosReporte).forEach(([clave, valor]) => {
        if (Array.isArray(valor)) valor.forEach((item) => formulario.append(`${clave}[]`, item));
        else formulario.append(clave, valor ?? "");
      });
      formulario.delete("unidadesIds[]");
      unidadesSeleccionadas.forEach((unidadId) => formulario.append("unidadesIds[]", unidadId));
      formulario.append("incidentPdf", await pdfUrlToFile(urlPdf, "reporte-incidente.pdf"));
      const remoto = await crearReporteApi(formulario);
      const pdfPersistido = resolveApiUrl(remoto.pdfUrl) || urlPdf;
      const reporte = agregarReporteRemoto({ ...datosReporte, pdfUrl: pdfPersistido }, remoto);
      actualizarReporte(reporte.id, { pdfUrl: pdfPersistido });
      setPdfGenerado({ folio: remoto.folio, url: urlPdf, guardado: true });
    } catch (apiError) {
      if (!pdfCreado && pestañaPdf && !pestañaPdf.closed) pestañaPdf.close();
      setError(pdfCreado
        ? `El PDF se generó correctamente, pero no pudo guardarse en el sistema: ${apiError.message}`
        : apiError.message);
    } finally {
      setGuardando(false);
    }
  }

  if (pdfGenerado) {
    return (
      <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div onClick={(event) => event.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
          <span className={`material-symbols-outlined text-5xl icon-fill ${pdfGenerado.guardado ? "text-primary" : "text-tertiary"}`}>
            {pdfGenerado.guardado ? "task_alt" : "picture_as_pdf"}
          </span>
          <p className="font-title-md text-title-md text-on-surface">
            {pdfGenerado.guardado ? "Reporte enviado" : "PDF generado"} - Folio {pdfGenerado.folio}
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            {pdfGenerado.guardado
              ? "El PDF quedó listo para descargar y se conserva como constancia del incidente."
              : "El PDF quedó listo para descargar, pero el reporte no se pudo guardar en el sistema."}
          </p>
          {error && (
            <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-center gap-2">
            <GlowButton
              as="a"
              href={pdfGenerado.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Abrir PDF
            </GlowButton>
            <button onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-2 sm:p-4 overflow-hidden">
      <div className="w-full flex justify-center max-h-[calc(100vh-1rem)] overflow-y-auto">
        <form
          onSubmit={handleEnviar}
          onClick={(event) => event.stopPropagation()}
          className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-[42rem] max-h-[calc(100vh-1rem)] overflow-y-auto p-4 sm:p-6 space-y-5"
        >
        <h2 className="font-title-md text-title-md text-on-surface">Levantar reporte de incidente</h2>

        {error && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Tipo de siniestro</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
            {TIPOS_SINIESTRO.map((detalle) => (
              <button
                key={detalle.value}
                type="button"
                onClick={() => {
                  setTipoSiniestro(detalle.value);
                  setTipoSiniestroLibre("");
                  setMostrarTipoLibre(false);
                }}
                className={`w-full p-3 rounded-lg border text-left text-sm leading-snug break-words whitespace-normal transition-all ${
                  tipoSiniestro === detalle.value && !mostrarTipoLibre
                    ? "bg-error text-on-error border-error"
                    : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {detalle.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setMostrarTipoLibre((anterior) => !anterior);
                if (!mostrarTipoLibre) {
                  setTipoSiniestroLibre("");
                }
              }}
              className={`w-full text-left px-3 py-2 border rounded-lg text-sm transition-all ${
                mostrarTipoLibre
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
              }`}
            >
              {mostrarTipoLibre ? "Escribiendo tipo libre" : "Otro tipo de siniestro (escribirlo)"}
            </button>

            {mostrarTipoLibre && (
              <input
                type="text"
                value={tipoSiniestroLibre}
                onChange={(event) => setTipoSiniestroLibre(event.target.value)}
                placeholder="Escribe el asunto del reporte"
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Nivel de gravedad</span>
          <div className="flex flex-wrap gap-2">
            {GRAVEDADES.map((nivel) => (
              <button
                key={nivel.value}
                type="button"
                onClick={() => setGravedad(nivel.value)}
                className={`px-3 py-1.5 rounded-md border font-label-sm text-label-sm transition-all ${
                  gravedad === nivel.value
                    ? "bg-tertiary text-on-tertiary border-tertiary"
                    : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {nivel.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Unidad(es) involucrada(s)</span>
          <div className="max-h-40 overflow-y-auto border border-outline-variant/40 rounded-lg divide-y divide-outline-variant/20 min-w-0">
            {unidadesDelDepartamento.map((unidad) => (
              <label key={unidad.id} className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-container-low min-w-0">
                <input type="checkbox" className="mt-1 shrink-0" checked={unidadesSeleccionadas.includes(unidad.id)} onChange={() => alternarUnidad(unidad.id)} />
                <span className="break-words leading-snug">
                  Económico {unidad.economico ?? "s/e"} - {unidad.marca} {unidad.submarca} - {unidad.placas ?? "s/placa"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="involucrados-reporte">
              Involucrados
            </label>
            <input
              id="involucrados-reporte"
              value={involucrados}
              onChange={(event) => setInvolucrados(event.target.value)}
              placeholder="Empleado(s), terceros o unidades implicadas"
              className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="fecha-hechos-reporte">
              Fecha
            </label>
            <input
              id="fecha-hechos-reporte"
              type="date"
              value={fechaHechos}
              onChange={(event) => setFechaHechos(event.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="lugar-hechos-reporte">
              Lugar de los hechos
            </label>
            <input
              id="lugar-hechos-reporte"
              value={lugarHechos}
              onChange={(event) => setLugarHechos(event.target.value)}
              placeholder="Calle, colonia, carretera, km, sitio exacto"
              className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="horario-hechos-reporte">
              Horario de los hechos
            </label>
            <input
              id="horario-hechos-reporte"
              type="time"
              value={horarioHechos}
              onChange={(event) => setHorarioHechos(event.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="descripcion-reporte">
            Descripción detallada
          </label>
          <textarea
            id="descripcion-reporte"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            rows={5}
            placeholder="Incluye cuándo ocurrió, dónde ocurrió y por qué ocurrió el incidente. Menciona si hubo impacto, condiciones, daños o responsables."
            className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="font-body-md text-body-md text-on-surface-variant text-xs">
            Regla de negocio: escribe cuándo ocurrió, dónde ocurrió y por qué ocurrió el evento para habilitar el envío.
          </p>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <button type="button" onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formularioValido || guardando}
            className={`px-4 py-2 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors ${
              formularioValido
                ? "bg-primary text-on-primary hover:bg-secondary"
                : "bg-outline-variant text-on-surface-variant cursor-not-allowed"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {guardando ? "Guardando…" : "Generar PDF y enviar"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default ModalLevantarReporte;
