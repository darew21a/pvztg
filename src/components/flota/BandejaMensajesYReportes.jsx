import { useState } from "react";
import { useMensajes } from "../../hooks/useMensajes.js";
import { useReportes } from "../../hooks/useReportes.js";
import { responderMensaje } from "../../data/mensajesStore.js";
import { obtenerNombreDepartamento } from "../../data/departamentos.js";
import { useAuth } from "../../hooks/useAuth.js";

const ETIQUETAS_TIPO_REPORTE = {
  anomalia: "Anomalía",
  mantenimiento: "Mantenimiento",
  siniestro: "Siniestro",
};

/**
 * Bandeja del Administrador: mensajes rápidos que le llegan de los Jefes
 * de Departamento (con opción de responder — la respuesta genera la
 * notificación en el panel del Jefe de Departamento) y los reportes
 * formales que han levantado, con acceso directo al PDF que ya se generó.
 */
function BandejaMensajesYReportes() {
  const mensajes = useMensajes();
  const reportes = useReportes();
  const { usuario } = useAuth();
  const [mensajeEnRespuesta, setMensajeEnRespuesta] = useState(null);
  const [textoRespuesta, setTextoRespuesta] = useState("");

  function enviarRespuesta(mensajeId) {
    if (!textoRespuesta.trim()) return;
    responderMensaje(mensajeId, { texto: textoRespuesta.trim(), autor: usuario?.nombre ?? "Administrador" });
    setMensajeEnRespuesta(null);
    setTextoRespuesta("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mensajes de Jefes de Departamento */}
      <div className="bento-item bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col max-h-[420px]">
        <div className="p-4 border-b border-outline-variant/30">
          <h3 className="font-title-md text-title-md text-on-surface">Mensajes de Jefes de Departamento</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {mensajes.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant text-sm p-2">Sin mensajes todavía.</p>
          ) : (
            mensajes.map((mensaje) => (
              <div key={mensaje.id} className="border border-outline-variant/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-label-sm text-label-sm text-primary uppercase">{obtenerNombreDepartamento(mensaje.departamento)}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {new Date(mensaje.fecha).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p className="font-body-md text-body-md text-on-surface text-sm">{mensaje.texto}</p>
                {mensaje.respuesta ? (
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm italic border-l-2 border-primary/40 pl-2">
                    Respondido: "{mensaje.respuesta.texto}"
                  </p>
                ) : mensajeEnRespuesta === mensaje.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={textoRespuesta}
                      onChange={(event) => setTextoRespuesta(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && enviarRespuesta(mensaje.id)}
                      placeholder="Escribe tu respuesta…"
                      className="flex-1 px-2 py-1 border border-outline-variant rounded text-sm"
                    />
                    <button onClick={() => enviarRespuesta(mensaje.id)} className="text-primary hover:underline text-sm">Enviar</button>
                  </div>
                ) : (
                  <button onClick={() => setMensajeEnRespuesta(mensaje.id)} className="font-label-sm text-label-sm text-primary hover:underline">
                    Responder
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reportes recibidos */}
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
                  {reporte.autorNombre} — {obtenerNombreDepartamento(reporte.autorDepartamento)}
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
    </div>
  );
}

export default BandejaMensajesYReportes;
