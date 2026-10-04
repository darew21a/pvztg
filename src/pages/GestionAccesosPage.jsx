import { useEffect, useMemo, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import { obtenerDepartamentos } from "../services/departamentoService.js";
import { actualizarEstadoUsuario, actualizarUsuario, crearUsuario, eliminarUsuario, obtenerUsuarios } from "../services/usuarioService.js";

const ROLES = [
  { value: "stt", label: "STT" },
  { value: "apv", label: "APV" },
  { value: "jefe-departamento", label: "Jefe de departamento" },
];

const FORMULARIO_INICIAL = {
  nombre: "",
  usuario: "",
  email: "",
  celular: "",
  password: "",
  rol: "apv",
  departamentoId: "",
  activo: true,
};

function adaptarUsuario(usuario) {
  return {
    ...usuario,
    rol: usuario.rol === "stt" ? "STT" : usuario.rol === "apv" ? "APV" : "Jefe de departamento",
    zona: usuario.departamento ?? "Global",
    ultimoAcceso: usuario.ultimo_acceso ?? "Nunca",
    activo: Boolean(usuario.activo),
  };
}

function obtenerEstiloRol(rol) {
  if (rol === "STT") {
    return {
      icono: "shield",
      color: "border-primary/40 bg-primary/10 text-primary",
      avatar: "bg-primary/10 text-primary",
      borde: "border-l-primary",
      fondo: "bg-primary/[0.035]",
    };
  }
  if (rol === "APV") {
    return {
      icono: "admin_panel_settings",
      color: "border-secondary/40 bg-secondary/10 text-secondary",
      avatar: "bg-secondary/10 text-secondary",
      borde: "border-l-secondary",
      fondo: "bg-secondary/[0.035]",
    };
  }
  return {
    icono: "domain",
    color: "border-tertiary/40 bg-tertiary/10 text-tertiary",
    avatar: "bg-tertiary/10 text-tertiary",
    borde: "border-l-tertiary",
    fondo: "bg-tertiary/[0.045]",
  };
}

function GestionAccesosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [orden, setOrden] = useState({ campo: "id", direccion: "asc" });
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  async function cargarUsuarios() {
    try {
      const respuesta = await obtenerUsuarios();
      setUsuarios((respuesta ?? []).map(adaptarUsuario));
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function cargarDepartamentos() {
    try {
      setDepartamentos((await obtenerDepartamentos()) ?? []);
    } catch (error) {
      setErrorMensaje(error.message);
    }
  }

  async function handleCambiarEstado(usuario) {
    setErrorMensaje("");
    try {
      await actualizarEstadoUsuario(usuario.id, !usuario.activo);
      setUsuarios((actuales) => actuales.map((item) => item.id === usuario.id ? { ...item, activo: !item.activo } : item));
    } catch (error) {
      setErrorMensaje(error.message);
    }
  }

  async function handleEliminarUsuario(usuario) {
    const confirmado = window.confirm(`¿Eliminar la credencial de ${usuario.nombre} (${usuario.usuario})? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    setErrorMensaje("");
    setMensajeGuardado("");
    try {
      await eliminarUsuario(usuario.id);
      setUsuarios((actuales) => actuales.filter((item) => item.id !== usuario.id));
      setMensajeGuardado("La credencial se eliminó correctamente.");
    } catch (error) {
      setErrorMensaje(error.message);
    }
  }

  useEffect(() => {
    cargarUsuarios();
    cargarDepartamentos();
  }, []);

  const resumen = useMemo(
    () => ({
      total: usuarios.length,
      activos: usuarios.filter((usuario) => usuario.activo).length,
      stt: usuarios.filter((usuario) => usuario.rol === "STT").length,
      apv: usuarios.filter((usuario) => usuario.rol === "APV").length,
    }),
    [usuarios],
  );
  const usuariosOrdenados = useMemo(() => [...usuarios].sort((a, b) => {
    const valorA = orden.campo === "id" ? Number(a.id) : String(a[orden.campo] ?? "").toLocaleLowerCase();
    const valorB = orden.campo === "id" ? Number(b.id) : String(b[orden.campo] ?? "").toLocaleLowerCase();
    const resultado = valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
    return orden.direccion === "asc" ? resultado : -resultado;
  }), [usuarios, orden]);

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setFormulario((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleCrearUsuario(event) {
    event.preventDefault();
    setErrorMensaje("");
    setMensajeGuardado("");
    if (!formulario.nombre.trim() || !formulario.usuario.trim() || (!usuarioEditando && !formulario.password.trim())) {
      setErrorMensaje(`Nombre, usuario y ${usuarioEditando ? "rol" : "contraseña"} son obligatorios.`);
      return;
    }

    if (formulario.password && (formulario.password.length < 5 || !/[A-Z]/.test(formulario.password) || !/[a-z]/.test(formulario.password) || !/\d/.test(formulario.password))) {
      setErrorMensaje("La contraseña debe tener al menos 5 caracteres, una mayúscula, una minúscula y un número.");
      return;
    }

    setIsSaving(true);
    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        usuario: formulario.usuario.trim().toLowerCase(),
        email: formulario.email.trim().toLowerCase() || null,
        celular: formulario.celular.trim() || null,
        rol: formulario.rol,
        departamentoId: formulario.rol === "jefe-departamento" ? formulario.departamentoId || null : null,
        activo: formulario.activo,
      };
      if (formulario.password) datos.password = formulario.password;
      if (usuarioEditando) await actualizarUsuario(usuarioEditando.id, datos);
      else await crearUsuario({ ...datos, password: formulario.password });
      setFormulario(FORMULARIO_INICIAL);
      setMostrarPassword(false);
      setUsuarioEditando(null);
      setMostrarModal(false);
      setMensajeGuardado(`La credencial se ${usuarioEditando ? "actualizó" : "creó"} correctamente.`);
      await cargarUsuarios();
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsSaving(false);
    }

  }

  function abrirEdicion(usuario) {
    setUsuarioEditando(usuario);
    setFormulario({
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      email: usuario.email ?? "",
      celular: usuario.celular ?? "",
      password: "",
      rol: usuario.rol === "Jefe de departamento" ? "jefe-departamento" : usuario.rol.toLowerCase(),
      departamentoId: usuario.departamento_id ?? "",
      activo: usuario.activo,
    });
    setMostrarPassword(false);
    setErrorMensaje("");
    setMostrarModal(true);
  }

  return (
    <>
      <TopNavBar searchPlaceholder="Buscar usuarios..." />
      <main className="flex-1 bg-background p-margin-mobile pb-12 md:p-margin-desktop">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="metric-label mb-2 text-primary">Seguridad y accesos</p>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestión de accesos</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Administra credenciales, roles y vigencia del acceso del personal operativo y administrativo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMostrarPassword(false);
              setUsuarioEditando(null);
              setFormulario(FORMULARIO_INICIAL);
              setErrorMensaje("");
              setMostrarModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-label-sm text-label-sm text-on-primary shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:bg-secondary"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Nueva credencial
          </button>
        </div>

        {errorMensaje && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-error/30 bg-error-container/20 px-4 py-3 text-sm text-error">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMensaje}</span>
          </div>
        )}
        {mensajeGuardado && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{mensajeGuardado}</span>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="enterprise-card p-4">
            <p className="metric-label">Usuarios totales</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="metric-value">{resumen.total}</span>
              <span className="material-symbols-outlined text-[32px] text-primary">group</span>
            </div>
          </div>
          <div className="enterprise-card p-4">
            <p className="metric-label">Activos</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="metric-value">{resumen.activos}</span>
              <span className="material-symbols-outlined text-[32px] text-success">check_circle</span>
            </div>
          </div>
          <div className="enterprise-card p-4">
            <p className="metric-label">STT</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="metric-value">{resumen.stt}</span>
              <span className="material-symbols-outlined text-[32px] text-secondary">shield</span>
            </div>
          </div>
          <div className="enterprise-card p-4">
            <p className="metric-label">APV</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="metric-value">{resumen.apv}</span>
              <span className="material-symbols-outlined text-[32px] text-warning">engineering</span>
            </div>
          </div>
        </section>

        <section className="enterprise-card mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-outline-variant/70 bg-surface-container px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface">Directorio de credenciales</h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Control de acceso a áreas y módulos</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-3 text-xs text-on-surface-variant lg:flex" aria-label="Leyenda de roles">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  STT
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  APV
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-tertiary" />
                  Jefatura
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span>Ordenar</span>
                <select value={orden.campo} onChange={(event) => setOrden((actual) => ({ ...actual, campo: event.target.value }))} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-xs text-on-surface">
                  <option value="nombre">Nombre</option>
                  <option value="id">ID interno</option>
                  <option value="rol">Rol</option>
                  <option value="zona">Cobertura</option>
                </select>
                <button type="button" aria-label={`Orden ${orden.direccion === "asc" ? "ascendente" : "descendente"}`} title={`Orden ${orden.direccion === "asc" ? "ascendente" : "descendente"}`} onClick={() => setOrden((actual) => ({ ...actual, direccion: actual.direccion === "asc" ? "desc" : "asc" }))} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-primary transition hover:border-primary">
                  <span className="material-symbols-outlined text-[18px]">{orden.direccion === "asc" ? "arrow_upward" : "arrow_downward"}</span>
                </button>
              </label>
              <button type="button" className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface-variant transition hover:border-primary hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>

          <div className="table-scroll custom-scrollbar" role="region" tabIndex={0} aria-label="Credenciales registradas desplazables">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-surface-container-high">
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                  <th className="px-5 py-3">Identidad</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Cobertura</th>
                  <th className="px-5 py-3 text-right">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-sm text-on-surface-variant">Cargando credenciales…</td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-sm text-on-surface-variant">No hay credenciales registradas.</td>
                  </tr>
                ) : usuariosOrdenados.map((usuario) => {
                  const estiloRol = obtenerEstiloRol(usuario.rol);
                  return (
                  <tr key={usuario.id} className={`border-t border-outline-variant/50 border-l-4 ${estiloRol.borde} ${estiloRol.fondo} transition hover:bg-surface-container-low`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${estiloRol.avatar}`}>
                          {usuario.nombre.split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-title-sm text-title-sm font-semibold text-on-surface">{usuario.nombre}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                            <span className="font-medium text-on-surface">{usuario.usuario}</span>
                            <span className="rounded-md bg-surface-container-high px-1.5 py-0.5 font-technical-mono text-[10px]">ID {usuario.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`status-pill gap-1.5 ${estiloRol.color}`}>
                        <span className="material-symbols-outlined text-[15px]">{estiloRol.icono}</span>
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {usuario.ultimoAcceso}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-2.5 py-1.5 text-sm font-medium text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">account_tree</span>
                        {usuario.zona}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => abrirEdicion(usuario)} aria-label={`Editar credencial de ${usuario.nombre}`} title="Editar credencial" className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2 text-primary transition hover:border-primary hover:bg-primary/10">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button type="button" onClick={() => handleEliminarUsuario(usuario)} aria-label={`Eliminar credencial de ${usuario.nombre}`} title="Eliminar credencial" className="rounded-lg border border-error/30 bg-surface-container-lowest p-2 text-error transition hover:border-error hover:bg-error-container/20">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={usuario.activo} onChange={() => handleCambiarEstado(usuario)} className="peer sr-only" />
                        <span className="h-6 w-11 rounded-full bg-surface-container-high peer-checked:bg-primary transition-all">
                          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                        </span>
                        <span className={`hidden text-xs font-semibold uppercase tracking-wider sm:inline ${usuario.activo ? "text-primary" : "text-on-surface-variant"}`}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </label>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="metric-label text-primary">{usuarioEditando ? "Edición de credencial" : "Alta de credencial"}</p>
                <h3 className="mt-2 font-headline-md text-headline-md text-on-surface">{usuarioEditando ? "Editar usuario" : "Crear usuario"}</h3>
              </div>
              <button type="button" onClick={() => setMostrarModal(false)} className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMensaje && (
              <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-error/30 bg-error-container/20 px-4 py-3 text-sm text-error">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMensaje}</span>
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Nombre completo</span>
                  <input name="nombre" value={formulario.nombre} onChange={handleInputChange} className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Ej. Ana López" />
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Usuario de acceso</span>
                  <input name="usuario" value={formulario.usuario} onChange={handleInputChange} className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Ej. ALOPEZ" />
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Correo electrónico</span>
                  <input name="email" type="email" value={formulario.email} onChange={handleInputChange} className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="correo@dominio.com" />
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Celular</span>
                  <input name="celular" type="tel" value={formulario.celular} onChange={handleInputChange} className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="10 dígitos" />
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Rol</span>
                  <select name="rol" value={formulario.rol} onChange={handleInputChange} className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10">
                    {ROLES.map((rol) => (
                      <option key={rol.value} value={rol.value}>{rol.label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{usuarioEditando ? "Nueva contraseña (opcional)" : "Contraseña temporal"}</span>
                  <div className="relative">
                    <input
                      name="password"
                      type={mostrarPassword ? "text" : "password"}
                      required
                      value={formulario.password}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                      placeholder={usuarioEditando ? "Déjala vacía para conservarla" : "Mínimo recomendado: 10 caracteres"}
                    />
                    <button
                      type="button"
                      aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setMostrarPassword((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-primary transition hover:bg-primary/10"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {mostrarPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Departamento</span>
                  <select
                    name="departamentoId"
                    value={formulario.departamentoId ?? ""}
                    onChange={handleInputChange}
                    disabled={formulario.rol !== "jefe-departamento"}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sin departamento</option>
                    {departamentos.map((departamento) => (
                      <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-on-surface-variant">
                <input type="checkbox" name="activo" checked={formulario.activo} onChange={handleInputChange} className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary" />
                Activar credencial inmediatamente
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setMostrarModal(false)} className="rounded-xl border border-outline-variant px-4 py-2.5 text-on-surface-variant transition hover:border-primary hover:text-primary">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-4 py-2.5 text-on-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Guardando…" : usuarioEditando ? "Guardar cambios" : "Guardar credencial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default GestionAccesosPage;
