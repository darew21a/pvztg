import { useState } from "react";
import { obtenerNombreDescarga } from "../../utils/formatearDescarga.js";
import { formatearFecha } from "../../utils/formatearFecha.js";
import { abrirODescargarArchivoProtegido } from "../../services/apiAuth.js";
import GlowButton from "../ui/GlowButton.jsx";
import NumeroEconomico from "../flota/NumeroEconomico.jsx";

/**
 * Documentos de una unidad, solo para consulta y descarga (el Jefe de
 * Departamento no puede subir ni editar, a diferencia del Expediente del
 * Administrador). Muestra todas las versiones históricas por año para que
 * pueda descargar la póliza o tarjeta de circulación de cualquier año.
 */
function PanelDocumentosSoloLectura({ unidad, onCerrar }) {
  const [errorDescarga, setErrorDescarga] = useState("");
  const documentosPorTipo = (tipo) =>
    (unidad.documentos ?? [])
      .filter((documento) => documento.tipo === tipo)
      .sort((a, b) => new Date(b.fechaCarga) - new Date(a.fechaCarga));

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div onClick={(event) => event.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="font-title-md text-title-md text-on-surface">Documentos de la unidad</h2>
            <div className="mt-2"><NumeroEconomico valor={unidad.economico} destacado /></div>
          </div>
          <button onClick={onCerrar} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errorDescarga && <p role="alert" className="rounded-md border border-error bg-error-container/20 px-3 py-2 text-sm text-error">{errorDescarga}</p>}
        {[
          { tipo: "seguro", etiqueta: "Póliza de seguro" },
          { tipo: "tarjeta-circulacion", etiqueta: "Tarjeta de circulación" },
        ].map(({ tipo, etiqueta }) => (
          <div key={tipo} className="border border-outline-variant/40 rounded-lg p-4 space-y-2">
            <p className="font-body-md text-body-md text-on-surface font-medium">{etiqueta}</p>
            {documentosPorTipo(tipo).length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">Sin documentos cargados todavía.</p>
            ) : (
              <ul className="space-y-1">
                {                documentosPorTipo(tipo).map((documento) => {
                  const nombreDescargaPersonalizado = obtenerNombreDescarga(
                    unidad.economico,
                    documento.tipo,
                    documento.fechaCarga
                  );
                  const extension = String(documento.nombreArchivo ?? "").match(/\.[^.]+$/)?.[0] ?? ".pdf";
                  const nombreDescarga = nombreDescargaPersonalizado.replace(/\.pdf$/i, extension);
                  const esPdf = extension.toLowerCase() === ".pdf";

                  return (
                    <li key={documento.id ?? documento.fechaCarga} className="flex justify-between items-center text-sm">
                      <span className="text-on-surface-variant">
                        {formatearFecha(documento.fechaCarga)}
                      </span>
                      <GlowButton
                        type="button"
                        onClick={() => abrirODescargarArchivoProtegido(
                          documento.url,
                          nombreDescarga,
                          documento.nombreArchivo,
                        ).catch((error) => setErrorDescarga(error.message))}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {esPdf ? "open_in_new" : "download"}
                        </span>
                        {esPdf ? "Abrir PDF" : "Descargar"}
                      </GlowButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelDocumentosSoloLectura;
