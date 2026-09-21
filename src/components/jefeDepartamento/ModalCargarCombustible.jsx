import { useState } from "react";
import { agregarTicketCombustible } from "../../data/combustibleTicketsStore.js";

const FORMATOS_ACEPTADOS = ".jpg,.jpeg,.png,.pdf";

/**
 * Carga de una recarga de combustible (alta frecuencia). El Jefe de
 * Departamento la sube para cualquiera de las unidades de su
 * departamento, con sus 3 comprobantes - solo el Ticket Bomba es
 * obligatorio; el Comprobante Edenred y el PDF único son complementarios
 * (algunos departamentos solo tendrán uno de los dos a la mano).
 */
function ModalCargarCombustible({ usuario, unidadesDelDepartamento, onCerrar }) {
  const [unidadId, setUnidadId] = useState("");
  const [fechaHora, setFechaHora] = useState(() => new Date().toISOString().slice(0, 16));
  const [litros, setLitros] = useState("");
  const [importe, setImporte] = useState("");
  const [archivoTicketBomba, setArchivoTicketBomba] = useState(null);
  const [archivoTicketEdenred, setArchivoTicketEdenred] = useState(null);
  const [archivoPdfFusionado, setArchivoPdfFusionado] = useState(null);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  function handleGuardar(event) {
    event.preventDefault();
    setError("");
    if (!unidadId) return setError("Selecciona la unidad que se recargó.");
    if (!litros || !importe) return setError("Captura litros e importe de la recarga.");
    if (!archivoTicketBomba) return setError("El Ticket Bomba (gasolinera física) es obligatorio.");

    agregarTicketCombustible({
      unidadId,
      fechaHora: new Date(fechaHora).toISOString(),
      litros: Number(litros),
      importe: Number(importe),
      urlTicketBomba: URL.createObjectURL(archivoTicketBomba),
      urlTicketEdenred: archivoTicketEdenred ? URL.createObjectURL(archivoTicketEdenred) : null,
      urlPdfFusionado: archivoPdfFusionado ? URL.createObjectURL(archivoPdfFusionado) : null,
      subidoPor: usuario.nombre,
    });
    setGuardado(true);
  }

  if (guardado) {
    return (
      <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
        <div onClick={(e) => e.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-5xl icon-fill">local_gas_station</span>
          <p className="font-title-md text-title-md text-on-surface">Recarga registrada.</p>
          <button onClick={onCerrar} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto py-8" onClick={onCerrar}>
      <form onSubmit={handleGuardar} onClick={(e) => e.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <h2 className="font-title-md text-title-md text-on-surface">Cargar recarga de combustible</h2>

        {error && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="unidad-recarga">Unidad</label>
          <select
            id="unidad-recarga"
            value={unidadId}
            onChange={(event) => setUnidadId(event.target.value)}
            className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            <option value="">Selecciona una unidad…</option>
            {unidadesDelDepartamento.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                Económico {unidad.economico ?? "s/e"} - {unidad.marca} {unidad.submarca} - {unidad.placas ?? "s/placa"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="fecha-recarga">Fecha y hora</label>
            <input
              id="fecha-recarga"
              type="datetime-local"
              value={fechaHora}
              onChange={(event) => setFechaHora(event.target.value)}
              className="w-full px-2 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="litros-recarga">Litros</label>
            <input
              id="litros-recarga"
              type="number"
              step="0.01"
              value={litros}
              onChange={(event) => setLitros(event.target.value)}
              className="w-full px-2 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase" htmlFor="importe-recarga">Importe</label>
            <input
              id="importe-recarga"
              type="number"
              step="0.01"
              value={importe}
              onChange={(event) => setImporte(event.target.value)}
              className="w-full px-2 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-outline-variant/30 pt-3">
          <CampoArchivo etiqueta="Ticket Bomba (obligatorio)" archivo={archivoTicketBomba} onSeleccionar={setArchivoTicketBomba} />
          <CampoArchivo etiqueta="Comprobante Edenred (opcional)" archivo={archivoTicketEdenred} onSeleccionar={setArchivoTicketEdenred} />
          <CampoArchivo etiqueta="PDF único fusionado (opcional)" archivo={archivoPdfFusionado} onSeleccionar={setArchivoPdfFusionado} />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
            Guardar recarga
          </button>
        </div>
      </form>
    </div>
  );
}

function CampoArchivo({ etiqueta, archivo, onSeleccionar }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-label-sm text-label-sm text-on-surface-variant">{etiqueta}</span>
      <label className="cursor-pointer font-label-sm text-label-sm text-primary hover:text-secondary transition-colors flex items-center gap-1">
        <span className="material-symbols-outlined text-[18px]">upload_file</span>
        {archivo ? archivo.name.slice(0, 20) : "Elegir archivo"}
        <input type="file" accept={FORMATOS_ACEPTADOS} className="hidden" onChange={(event) => onSeleccionar(event.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

export default ModalCargarCombustible;
