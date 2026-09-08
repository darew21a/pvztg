import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { DEPARTAMENTOS } from "../../data/departamentos.js";
import logoCfe from "../../assets/logo-cfe.png";

/**
 * ============================================================================
 * LOGIN — JEFE DE DEPARTAMENTO
 * ============================================================================
 * Flujo separado del login de Administrador. Primero elige su departamento
 * (selector visual de tarjetas, no un <select> plano — son solo 9 y así se
 * reconocen de un vistazo), luego captura usuario y contraseña. El
 * departamento elegido queda en la sesión y es lo que determina qué
 * unidades verá en su panel (solo las de su departamento).
 * ============================================================================
 */
function JefeDepartamentoLoginPage() {
  const [departamentoId, setDepartamentoId] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const { loginJefeDepartamento } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMensaje("");
    if (!departamentoId) {
      setErrorMensaje("Selecciona tu departamento para continuar.");
      return;
    }
    setIsLoading(true);
    try {
      await loginJefeDepartamento({ usuario, password, departamento: departamentoId }, recordarSesion);
      navigate("/jefe-departamento");
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8 space-y-6">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" className="w-28 mx-auto" />
        <div className="text-center space-y-1">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Jefe de Departamento</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Selecciona tu departamento e inicia sesión.</p>
        </div>

        {errorMensaje && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEPARTAMENTOS.map((departamento) => {
              const isActive = departamentoId === departamento.id;
              return (
                <button
                  key={departamento.id}
                  type="button"
                  onClick={() => setDepartamentoId(departamento.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-on-primary border-primary shadow-md scale-[0.98]"
                      : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{departamento.icono}</span>
                  <span className="font-label-sm text-label-sm leading-tight">{departamento.nombre}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="jefe-usuario">
                Usuario
              </label>
              <input
                id="jefe-usuario"
                type="text"
                required
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="jefe-password">
                  Contraseña
                </label>
                <Link to="/recuperar-contrasena" className="font-label-sm text-label-sm text-primary hover:text-secondary transition-colors">
                  ¿Olvidó su contraseña?
                </Link>
              </div>
              <input
                id="jefe-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recordarSesion}
              onChange={(event) => setRecordarSesion(event.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="font-body-md text-body-md text-on-surface-variant">Recordar sesión en este dispositivo</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {isLoading ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <Link to="/" className="block text-center font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
          Volver al acceso general
        </Link>
      </div>
    </div>
  );
}

export default JefeDepartamentoLoginPage;
