import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { normalizeRole, ROLE_LABELS } from "../config/roles.js";
import { useAuth } from "../hooks/useAuth.js";
import { actualizarPerfil, obtenerPerfil } from "../services/usuarioService.js";
import { cambiarPassword } from "../services/authService.js";
import AvatarUsuario from "../components/perfil/AvatarUsuario.jsx";

/**
 * Perfil del usuario centralizado para todos los roles. El objetivo es que la
 * misma vista sirva para APV, STT y Jefe de Departamento sin depender de una
 * nomenclatura legacy (auditor).
 */
function AuditorPerfilPage() {
  const { usuario, logout, rol } = useAuth();
  const navigate = useNavigate();

  const rolNormalizado = normalizeRole(rol ?? usuario?.rol);
  const descripcionRol = ROLE_LABELS[rolNormalizado] ?? "Usuario";

  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [contactosAdicionales, setContactosAdicionales] = useState([]);
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const [errorMensaje, setErrorMensaje] = useState("");

  const nombreCompleto = useMemo(() => nombre || usuario?.nombre || "Mi perfil", [nombre, usuario?.nombre]);

  useEffect(() => {
    obtenerPerfil()
      .then((perfil) => {
        setNombre(perfil.nombre ?? "");
        setCelular(perfil.celular ?? "");
        setCorreo(perfil.email ?? "");
        setContactosAdicionales(Array.isArray(perfil.contactosAdicionales) ? perfil.contactosAdicionales : []);
      })
      .catch((error) => setErrorMensaje(error.message));
  }, []);

  async function handleGuardar(event) {
    event.preventDefault();
    setErrorMensaje("");
    if (!celular.trim() || !correo.trim()) {
      setErrorMensaje("Celular y correo son obligatorios: son la vía de recuperación de tu contraseña.");
      return;
    }
    setIsSaving(true);
    try {
      const perfilActualizado = await actualizarPerfil({
        nombre,
        celular,
        email: correo,
        contactosAdicionales,
      });
      setContactosAdicionales(perfilActualizado.contactosAdicionales ?? contactosAdicionales);
      setMensajeGuardado("Datos de perfil actualizados correctamente.");
      setTimeout(() => setMensajeGuardado(""), 3000);
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCambiarPassword() {
    setErrorMensaje("");
    if (!passwordActual || !nuevaPassword) {
      setErrorMensaje("La contraseña actual y la nueva contraseña son obligatorias.");
      return;
    }
    setIsSaving(true);
    try {
      await cambiarPassword({ passwordActual, nuevaPassword });
      setPasswordActual("");
      setNuevaPassword("");
      setMostrarPassword(false);
      setMensajeGuardado("Contraseña actualizada correctamente.");
      setTimeout(() => setMensajeGuardado(""), 3000);
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  function agregarContacto() {
    const id = globalThis.crypto?.randomUUID?.() ?? `contacto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setContactosAdicionales((anteriores) => [...anteriores, { id, etiqueta: "", valor: "" }]);
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
      <TopNavBar searchPlaceholder="Buscar..." />
      <main className="p-margin-desktop max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <AvatarUsuario nombre={nombreCompleto} className="h-20 w-20 shrink-0 text-[28px]" />
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{nombreCompleto}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="status-pill border-primary/30 bg-primary/10 text-primary">{descripcionRol}</span>
              <p className="font-body-md text-body-md text-on-surface-variant">CFE Transmisión Zona Guerrero</p>
            </div>
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

          <section className="space-y-4 border-t border-outline-variant/30 pt-5">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface">Actualizar contraseña</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                La contraseña actual no puede mostrarse: se almacena como un hash irreversible. Introduce la actual para establecer una nueva.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={passwordActual}
                onChange={(event) => setPasswordActual(event.target.value)}
                placeholder="Contraseña actual"
                autoComplete="current-password"
                className="w-full rounded-md border border-outline-variant bg-surface-bright px-3 py-2 text-on-surface"
              />
              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={nuevaPassword}
                  onChange={(event) => setNuevaPassword(event.target.value)}
                  placeholder="Nueva contraseña (mínimo 5 caracteres)"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-outline-variant bg-surface-bright px-3 py-2 pr-11 text-on-surface"
                />
                <button type="button" onClick={() => setMostrarPassword((actual) => !actual)} aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">{mostrarPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              <button type="button" onClick={handleCambiarPassword} disabled={isSaving} className="w-fit rounded-lg border border-primary px-4 py-2 font-label-sm text-label-sm text-primary hover:bg-primary/10 disabled:opacity-60">
                Actualizar contraseña
              </button>
            </div>
          </section>

          {/* Contactos adicionales: alta / modificación / baja libre */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Contactos adicionales</span>
              <button
                type="button"
                onClick={agregarContacto}
                disabled={isSaving || contactosAdicionales.length >= 20}
                title={contactosAdicionales.length >= 20 ? "El límite es de 20 contactos adicionales." : undefined}
                className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-60"
              >
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
                    required
                    maxLength={80}
                    disabled={isSaving}
                    value={contacto.etiqueta}
                    onChange={(event) => actualizarContacto(contacto.id, "etiqueta", event.target.value)}
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    required
                    maxLength={255}
                    disabled={isSaving}
                    value={contacto.valor}
                    onChange={(event) => actualizarContacto(contacto.id, "valor", event.target.value)}
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-sm focus:outline-none focus:border-primary"
                  />
                  <button type="button" onClick={() => eliminarContacto(contacto.id)} disabled={isSaving} aria-label={`Eliminar contacto ${contacto.etiqueta || ""}`} className="text-error hover:bg-error-container/20 p-2 rounded-lg transition-colors disabled:opacity-60">
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
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors disabled:opacity-60">
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default AuditorPerfilPage;
