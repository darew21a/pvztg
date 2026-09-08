import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { obtenerIniciales } from "../utils/nombre.js";

/**
 * ============================================================================
 * PERFIL DEL AUDITOR
 * ============================================================================
 * El avatar SIEMPRE son las iniciales del nombre (nunca una foto subida,
 * por requisito explícito). Celular y correo son obligatorios porque de
 * ahí depende el autoservicio de restablecimiento de contraseña (SSPR):
 * si cambian, hay que poder actualizarlos aquí mismo para no perder la
 * vía de recuperación.
 *
 * Además del bloque de datos principales, el auditor puede dar de alta,
 * modificar o dar de baja contactos adicionales (ej. una segunda línea o
 * un correo de respaldo) desde la lista de "Contactos adicionales".
 * ============================================================================
 */
function AuditorPerfilPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [contactosAdicionales, setContactosAdicionales] = useState([]);
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const [errorMensaje, setErrorMensaje] = useState("");

  function handleGuardar(event) {
    event.preventDefault();
    setErrorMensaje("");
    if (!celular.trim() || !correo.trim()) {
      setErrorMensaje("Celular y correo son obligatorios: son la vía de recuperación de tu contraseña.");
      return;
    }
    // TODO: reemplazar por PUT /auditores/:id contra el backend real.
    setMensajeGuardado("Datos actualizados.");
    setTimeout(() => setMensajeGuardado(""), 3000);
  }

  function agregarContacto() {
    setContactosAdicionales((anteriores) => [...anteriores, { id: `contacto-${Date.now()}`, etiqueta: "", valor: "" }]);
  }

  function actualizarContacto(id, campo, valor) {
    setContactosAdicionales((anteriores) =>
      anteriores.map((contacto) => (contacto.id === id ? { ...contacto, [campo]: valor } : contacto)),
    );
  }

  function eliminarContacto(id) {
    setContactosAdicionales((anteriores) => anteriores.filter((contacto) => contacto.id !== id));
  }

  function handleCerrarSesion() {
    logout();
    navigate("/");
  }

  return (
    <>
      <TopNavBar activeTab="Resumen" searchPlaceholder="Buscar..." />
      <main className="p-margin-desktop max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center font-display-lg text-display-lg text-[28px] shrink-0">
            {obtenerIniciales(nombre)}
          </span>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{nombre || "Mi perfil"}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Auditor · CFE Transmisión Zona Guerrero</p>
          </div>
        </div>

        {errorMensaje && (
          <p role="alert" className="mb-4 font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}
        {mensajeGuardado && (
          <p role="status" className="mb-4 font-body-md text-body-md text-primary bg-primary-container/10 border border-primary-container/30 rounded-lg px-4 py-2">
            {mensajeGuardado}
          </p>
        )}

        <form onSubmit={handleGuardar} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="perfil-nombre">
                Nombre completo
              </label>
              <input
                id="perfil-nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="perfil-celular">
                Celular <span className="text-error">*</span>
              </label>
              <input
                id="perfil-celular"
                type="tel"
                required
                value={celular}
                onChange={(event) => setCelular(event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="perfil-correo">
                Correo electrónico <span className="text-error">*</span>
              </label>
              <input
                id="perfil-correo"
                type="email"
                required
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* Contactos adicionales: alta / modificación / baja libre */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Contactos adicionales</span>
              <button type="button" onClick={agregarContacto} className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar contacto
              </button>
            </div>
            {contactosAdicionales.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">Sin contactos adicionales registrados.</p>
            ) : (
              contactosAdicionales.map((contacto) => (
                <div key={contacto.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Etiqueta (ej. Correo de respaldo)"
                    value={contacto.etiqueta}
                    onChange={(event) => actualizarContacto(contacto.id, "etiqueta", event.target.value)}
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={contacto.valor}
                    onChange={(event) => actualizarContacto(contacto.id, "valor", event.target.value)}
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary"
                  />
                  <button type="button" onClick={() => eliminarContacto(contacto.id)} className="text-error hover:bg-error-container/20 p-2 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
            <button type="button" onClick={handleCerrarSesion} className="font-label-sm text-label-sm text-error hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Cerrar sesión
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
              Guardar cambios
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default AuditorPerfilPage;
