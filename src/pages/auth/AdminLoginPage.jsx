import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import logoCfe from "../../assets/logo-cfe.png";

/**
 * Acceso de SuperAdministrador. Flujo y endpoint separados del login
 * operativo (Conductor/Auditor) por requisito explícito de credencial
 * específica. La estética es deliberadamente distinta: fondo oscuro sobrio
 * y acentos dorados — jerárquicamente superior sin caer en estética
 * "cyberpunk".
 */
function AdminLoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      await loginAdmin({ usuario, password }, recordarSesion);
      navigate("/admin");
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-inverse-surface min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#d4af37]/30 rounded-xl shadow-2xl p-8 space-y-6">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" className="w-32 mx-auto brightness-0 invert opacity-90" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#d4af37]">shield_person</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-white">SuperAdministrador</h1>
            <p className="font-label-sm text-label-sm text-[#d4af37] uppercase tracking-wider">Acceso restringido</p>
          </div>
        </div>

        {errorMensaje && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block font-label-sm text-label-sm text-[#d4af37]/80 uppercase tracking-wider" htmlFor="admin-usuario">
              Usuario
            </label>
            <input
              id="admin-usuario"
              type="text"
              required
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              className="block w-full px-4 py-3 border border-[#d4af37]/20 rounded-lg bg-[#0f0f0f] text-white font-body-md focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block font-label-sm text-label-sm text-[#d4af37]/80 uppercase tracking-wider" htmlFor="admin-password">
                Contraseña
              </label>
              <Link to="/recuperar-contrasena" className="font-label-sm text-label-sm text-[#d4af37] hover:text-white transition-colors">
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full px-4 py-3 border border-[#d4af37]/20 rounded-lg bg-[#0f0f0f] text-white font-body-md focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recordarSesion}
              onChange={(event) => setRecordarSesion(event.target.checked)}
              className="w-4 h-4 rounded border-[#d4af37]/40 text-[#d4af37] focus:ring-[#d4af37]"
            />
            <span className="font-body-md text-body-md text-white/70">Recordar sesión en este dispositivo</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#d4af37] text-[#1a1a1a] font-label-sm text-label-sm uppercase tracking-wider hover:bg-[#e0c158] transition-colors disabled:opacity-60"
          >
            {isLoading ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <Link to="/" className="block text-center font-label-sm text-label-sm text-white/50 hover:text-[#d4af37] transition-colors">
          Volver al acceso general
        </Link>
      </div>
    </div>
  );
}

export default AdminLoginPage;
