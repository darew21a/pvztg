import { useReportes } from "../../hooks/useReportes.js";
import { obtenerNombreDepartamento } from "../../data/departamentosStore.js";

const ETIQUETAS_TIPO_REPORTE = {
  anomalia: "Anomalía",
  mantenimiento: "Mantenimiento",
  siniestro: "Siniestro",
};

function BandejaReportes() {
  const reportes = useReportes();

  return (
    <div className="bento-item bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col max-h-[420px]">
      <div className="p-4 border-b border-outline-variant/30">
        <h3 className="font-title-md text-title-md text-on-surface">Reportes recibidos</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {reportes.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant text-sm p-2">Sin reportes todavía.</p>
        ) : (
          reportes.map((reporte) => (
            <div key={reporte.id} className="border border-outline-variant/30 rounded-lg p-3 space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-label-sm text-label-sm text-error uppercase">{ETIQUETAS_TIPO_REPORTE[reporte.tipoReporte] ?? reporte.tipoReporte}</p>
                <p className="font-technical-mono text-technical-mono text-xs text-on-surface-variant">{reporte.folio}</p>
              </div>
              <p className="font-body-md text-body-md text-on-surface text-sm">{reporte.descripcion}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {reporte.autorNombre} - {obtenerNombreDepartamento(reporte.autorDepartamento)}
              </p>
              {reporte.pdfUrl && (
                <a href={reporte.pdfUrl} download={`${reporte.folio}.pdf`} className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1 w-fit">
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Descargar PDF
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BandejaReportes;
