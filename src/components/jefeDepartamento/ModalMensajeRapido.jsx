import { useState } from "react";
import { enviarMensaje } from "../../data/mensajesStore.js";

/**
 * Mensaje rápido de un Jefe de Departamento hacia las cuentas de
 * Administrador y SuperAdministrador. Llega de inmediato a todas las
 * cuentas de Administrador que el SuperAdministrador haya dado de alta
 * (el store es compartido — cualquier panel de Administrador que lo
 * consuma lo ve al instante, sin recargar).
 */
function ModalMensajeRapido({ usuario, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [enviado, setEnviado] = useState(false);

  function handleEnviar(event) {
    event.preventDefault();
    if (!texto.trim()) return;
    enviarMensaje({ departamento: usuario.departamento, autor: usuario.nombre, texto: texto.trim() });
    setEnviado(true);
  }

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div onClick={(event) => event.stopPropagation()} className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        {enviado ? (
          <div className="text-center space-y-3 py-4">
            <span className="material-symbols-outlined text-primary text-5xl icon-fill">mark_email_read</span>
            <p className="font-title-md text-title-md text-on-surface">Mensaje enviado al Administrador y al SuperAdministrador.</p>
            <button onClick={onCerrar} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-4">
            <h2 className="font-title-md text-title-md text-on-surface">Mensaje rápido</h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Se enviará a todas las cuentas de Administrador y al SuperAdministrador.
            </p>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              rows={4}
              placeholder="Escribe tu mensaje…"
              className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ModalMensajeRapido;
