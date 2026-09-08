import { obtenerNombreDescarga } from "../../utils/formatearDescarga.js";

/**
 * Documentos de una unidad, solo para consulta y descarga (el Jefe de
 * Departamento no puede subir ni editar, a diferencia del Expediente del
 * Administrador). Muestra todas las versiones históricas por año para que
 * pueda descargar la póliza o tarjeta de circulación de cualquier año.
 */
function PanelDocumentosSoloLectura({ unidad, onCerrar }) {
  const documentosPorTipo = (tipo) => (unidad.documentos ?? []).filter((documento) => documento.tipo === tipo);

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div onClick={(event) => event.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-title-md text-title-md text-on-surface">
            Documentos — Económico {unidad.economico ?? "s/e"}
          </h2>
          <button onClick={onCerrar} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

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
                {documentosPorTipo(tipo).map((documento) => {
                  // CAMBIO AQUÍ: Llamamos a la función utilitaria independiente para procesar el nombre dinámico [2, 3]
                  const nombreDescargaPersonalizado = obtenerNombreDescarga(
                    unidad.economico,
                    documento.tipo,
                    documento.fechaCarga
                  );

                  return (
                    <li key={documento.fechaCarga} className="flex justify-between items-center text-sm">
                      <span className="text-on-surface-variant">
                        {new Date(documento.fechaCarga).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                      {/* CAMBIO AQUÍ: Reemplazamos documento.nombreArchivo por la nueva variable [2, 3] */}
                      <a 
                        href={documento.url} 
                        download={nombreDescargaPersonalizado} 
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Descargar
                      </a>
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
