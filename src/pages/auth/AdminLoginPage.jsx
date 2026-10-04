import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import logoCfe from "../../assets/logo-cfe.png";

/**
 * Acceso de SuperAdministrador. Flujo y endpoint separados del login
 * operativo (Conductor/Auditor) por requisito explícito de credencial
 * específica. La estética es deliberadamente distinta: fondo oscuro sobrio
 * y acentos dorados - jerárquicamente superior sin caer en estética
 * "cyberpunk".
 */
function AdminLoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      const sesion = await loginAdmin({ usuario, password });
      navigate(sesion.usuario.debeCambiarPassword ? "/cambiar-contrasena" : "/dashboard", { replace: true });
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#A79F92]/40 rounded-xl shadow-2xl p-8 space-y-6">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" className="w-32 mx-auto brightness-0 invert opacity-90" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#A79F92]/15 border border-[#A79F92]/60 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#CBBD93]">shield_person</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-white">SuperAdministrador</h1>
            <p className="font-label-sm text-label-sm text-[#CBBD93] uppercase tracking-wider">Acceso restringido</p>
          </div>
        </div>

        {errorMensaje && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block font-label-sm text-label-sm text-[#A79F92] uppercase tracking-wider" htmlFor="admin-usuario">
              Usuario
            </label>
            <input
              id="admin-usuario"
              type="text"
              required
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              className="block w-full px-4 py-3 border border-[#A79F92]/30 rounded-lg bg-[#0f0f0f] text-white font-body-md focus:outline-none focus:border-[#CBBD93] focus:ring-1 focus:ring-[#CBBD93] transition-all"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block font-label-sm text-label-sm text-[#A79F92] uppercase tracking-wider" htmlFor="admin-password">
                Contraseña
              </label>
            </div>
            <div className="relative">
            <input
              id="admin-password"
              type={mostrarPassword ? "text" : "password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full px-4 py-3 border border-[#A79F92]/30 rounded-lg bg-[#0f0f0f] text-white font-body-md focus:outline-none focus:border-[#CBBD93] focus:ring-1 focus:ring-[#CBBD93] transition-all"
            />
            <button type="button" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#CBBD93]">
              <span className="material-symbols-outlined">{mostrarPassword ? "visibility_off" : "visibility"}</span>
            </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#CBBD93] text-[#1a1a1a] font-label-sm text-label-sm uppercase tracking-wider hover:bg-[#A79F92] transition-colors disabled:opacity-60"
          >
            {isLoading ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <Link to="/" className="block text-center font-label-sm text-label-sm text-white/50 hover:text-[#CBBD93] transition-colors">
          Volver al acceso general
        </Link>
      </div>
    </div>
  );
}

export default AdminLoginPage;
