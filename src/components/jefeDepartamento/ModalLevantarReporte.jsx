import { useState } from "react";
import { agregarReporte } from "../../data/reportesStore.js";
import { generarPdfReporte } from "../../utils/generarReportePdf.js";

const TIPOS_REPORTE = [
  { value: "anomalia", label: "Anomalía en datos o unidad", icono: "report" },
  { value: "mantenimiento", label: "Servicio mecánico / mantenimiento", icono: "build" },
  { value: "siniestro", label: "Siniestro (robo, asalto, secuestro)", icono: "emergency" },
];

const GRAVEDADES = [
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "grave", label: "Grave" },
];

const DETALLES_SINIESTRO = [
  { value: "robo", label: "Robo" },
  { value: "asalto", label: "Asalto" },
  { value: "secuestro", label: "Secuestro" },
];

/**
 * Formulario para levantar un reporte formal sobre una o varias unidades
 * del departamento. Al enviarlo: se registra en `reportesStore` (con folio
 * y fecha/hora exacta asignados ahí) y se genera de inmediato el PDF
 * formal (logo, marca de agua, texto según el tipo de caso) — la unidad
 * conserva la copia (queda ligada al reporte) y el Jefe de Departamento
 * puede descargarlo al terminar.
 */
function ModalLevantarReporte({ usuario, unidadesDelDepartamento, onCerrar }) {
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState([]);
  const [tipoReporte, setTipoReporte] = useState("anomalia");
  const [gravedad, setGravedad] = useState("leve");
  const [detalleSiniestro, setDetalleSiniestro] = useState("robo");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [pdfGenerado, setPdfGenerado] = useState(null);

  function alternarUnidad(unidadId) {
    setUnidadesSeleccionadas((anteriores) =>
      anteriores.includes(unidadId) ? anteriores.filter((id) => id !== unidadId) : [...anteriores, unidadId],
    );
  }

  function handleEnviar(event) {
    event.preventDefault();
    setError("");
    if (unidadesSeleccionadas.length === 0) {
      setError("Selecciona al menos una unidad.");
      return;
    }
    if (!descripcion.trim()) {
      setError("Describe la situación antes de enviar el reporte.");
      return;
    }

    const unidadesElegidas = unidadesDelDepartamento.filter((unidad) => unidadesSeleccionadas.includes(unidad.id));

    const reporte = agregarReporte({
      tipoReporte,
      unidadesIds: unidadesSeleccionadas,
      autorNombre: usuario.nombre,
      autorDepartamento: usuario.departamento,
      descripcion: descripcion.trim(),
      gravedad: tipoReporte !== "mantenimiento" ? gravedad : undefined,
      detalleSiniestro: tipoReporte === "siniestro" ? detalleSiniestro : undefined,
      pdfUrl: "", // se completa abajo, una vez generado el PDF (necesita el folio ya asignado)
    });

    const urlPdf = generarPdfReporte(reporte, unidadesElegidas);
    reporte.pdfUrl = urlPdf; // el objeto está referenciado dentro del store; esto actualiza la copia guardada también.
    setPdfGenerado({ folio: reporte.folio, url: urlPdf });
  }

  if (pdfGenerado) {
    return (
      <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
        <div onClick={(event) => event.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
          <span className="material-symbols-outlined text-primary text-5xl icon-fill">task_alt</span>
          <p className="font-title-md text-title-md text-on-surface">Reporte enviado — Folio {pdfGenerado.folio}</p>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            Llegó de inmediato a todas las cuentas de Administrador y al SuperAdministrador. La unidad conserva una copia, disponible para descargar cuando quieras.
          </p>
          <div className="flex justify-center gap-2">
            <a
              href={pdfGenerado.url}
              download={`${pdfGenerado.folio}.pdf`}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar PDF
            </a>
            <button onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto py-8" onClick={onCerrar}>
      <form
        onSubmit={handleEnviar}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5"
      >
        <h2 className="font-title-md text-title-md text-on-surface">Levantar reporte</h2>

        {error && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Tipo de reporte</span>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_REPORTE.map((tipo) => (
              <button
                key={tipo.value}
                type="button"
                onClick={() => setTipoReporte(tipo.value)}
                className={`p-3 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                  tipoReporte === tipo.value
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tipo.icono}</span>
                <span className="font-label-sm text-label-sm leading-tight">{tipo.label}</span>
              </button>
            ))}
          </div>
        </div>

        {tipoReporte === "siniestro" && (
          <div className="space-y-2">
            <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Tipo de siniestro</span>
            <div className="flex gap-2">
              {DETALLES_SINIESTRO.map((detalle) => (
                <button
                  key={detalle.value}
                  type="button"
                  onClick={() => setDetalleSiniestro(detalle.value)}
                  className={`px-3 py-1.5 rounded-md border font-label-sm text-label-sm transition-all ${
                    detalleSiniestro === detalle.value
                      ? "bg-error text-on-error border-error"
                      : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                  }`}
                >
                  {detalle.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tipoReporte !== "mantenimiento" && (
          <div className="space-y-2">
            <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Nivel de gravedad</span>
            <div className="flex gap-2">
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
        )}

        <div className="space-y-2">
          <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase">Unidad(es) involucrada(s)</span>
          <div className="max-h-40 overflow-y-auto border border-outline-variant/40 rounded-lg divide-y divide-outline-variant/20">
            {unidadesDelDepartamento.map((unidad) => (
              <label key={unidad.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-container-low">
                <input type="checkbox" checked={unidadesSeleccionadas.includes(unidad.id)} onChange={() => alternarUnidad(unidad.id)} />
                Económico {unidad.economico ?? "s/e"} — {unidad.marca} {unidad.submarca} — {unidad.placas ?? "s/placa"}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="descripcion-reporte">
            Descripción
          </label>
          <textarea
            id="descripcion-reporte"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            rows={4}
            placeholder="Describe la situación con el mayor detalle posible…"
            className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">send</span>
            Enviar reporte
          </button>
        </div>
      </form>
    </div>
  );
}

export default ModalLevantarReporte;
