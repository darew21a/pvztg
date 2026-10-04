import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import logoCfe from "../assets/logo-cfe.png";
/**
 * ============================================================================
 * PANTALLA DE LOGIN (Auditor)
 * ============================================================================
 * Único acceso operativo del software: el rol de Conductor se canceló (los
 * operarios de campo no usarán la app), así que este formulario ya no
 * necesita selector de puesto. El acceso de SuperAdministrador vive aparte,
 * en /admin/login (link discreto al pie de esta pantalla).
 *
 * El spinner de envío se controla con estado de React (`isLoading`) en vez
 * de manipular el DOM directamente, como hacía el prototipo HTML original.
 * ============================================================================
 */






import carousel_1 from "../assets/carousel/carousel_1.jpg";


function LoginPage() {
  const [rcf, setRcf] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Envío del formulario: intenta autenticar y redirige al dashboard del
  // Auditor. Los errores de autenticación del backend se muestran sin exponer
  // detalles técnicos.
  async function handleLogin(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      const sesion = await login({ rcf, password, rol: "apv" });
      navigate(sesion.usuario.debeCambiarPassword ? "/cambiar-contrasena" : "/dashboard", { replace: true });
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

// REEMPLAZA TU DIV DE INICIO POR ESTE:
return (
  <div className="bg-background min-h-screen w-full flex text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">

          <section className="login-identity-panel relative hidden min-h-screen items-end overflow-hidden bg-primary lg:flex" aria-label="Identidad del portal">
            <img src={carousel_1} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-35 grayscale" />
            <div className="login-identity-panel__wash absolute inset-0" />
            <div className="login-identity-panel__lines absolute inset-0" aria-hidden="true" />
            <div className="relative z-10 w-full max-w-3xl px-14 pb-16 pt-12 xl:px-20 xl:pb-20">
              <div className="mb-10 inline-flex items-center rounded-md bg-white px-4 py-3 shadow-md">
                <img src={logoCfe} alt="Comisión Federal de Electricidad" className="h-10 w-auto" />
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-fixed">CFE Transmisión · Zona Guerrero</p>
              <h1 className="max-w-xl font-display-lg text-display-lg leading-tight text-on-primary">
                Gestión del parque vehicular
                <span className="mt-2 block text-primary-fixed">PV-ZTG</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90">
                Plataforma institucional para el seguimiento operativo y administrativo de la flota.
              </p>
              <div className="mt-12 flex items-center gap-3 border-t border-white/25 pt-5 text-sm text-white/80">
                <span className="h-2 w-2 rounded-sm bg-primary-fixed" aria-hidden="true" />
                <span>Acceso exclusivo para personal autorizado</span>
              </div>
            </div>
          </section>


{/* Right Split: Login Form */}
<div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center bg-background px-6 py-10 sm:px-12 sm:py-12 md:px-16 md:py-16 lg:px-16 lg:py-12 relative">
{/* Form Container */}
<div className="w-full max-w-md space-y-8">
<div className="flex items-center gap-3 lg:hidden">
  <img src={logoCfe} alt="Comisión Federal de Electricidad" className="h-9 w-auto" />
  <span className="h-8 border-l border-outline-variant" aria-hidden="true" />
  <div>
    <p className="text-sm font-semibold text-on-surface">CFE Transmisión</p>
    <p className="text-xs text-on-surface-variant">Zona Guerrero · PV-ZTG</p>
  </div>
</div>
{/* Header */}
<div className="space-y-2">
<p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Portal de gestión vehicular</p>
<h2 className="font-headline-lg text-headline-lg md:text-display-lg text-on-surface">Bienvenido</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Ingrese sus credenciales corporativas para acceder al portal.</p>
</div>
{/* Login Form */}
<form className="space-y-6" id="loginForm" onSubmit={handleLogin}>
{/* RCF Input */}
<div className="space-y-2">
<label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="rcf">
                        RPE / Usuario
                    </label>
<div className="relative group">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors duration-300">
<svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <rect x="3.5" y="5" width="17" height="14" rx="2" />
  <circle cx="9" cy="11" r="2" />
  <path d="M6.5 16a2.5 2.5 0 0 1 5 0M14 10h3.5M14 14h3.5" />
</svg>
</div>
<input
  className="block w-full pl-12 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 shadow-sm"
  id="rcf"
  placeholder="Ej. A1B2C3D4"
  required
  type="text"
  value={rcf}
  onChange={(event) => setRcf(event.target.value)}
/>
</div>
</div>
{/* Password Input */}
<div className="space-y-2">
<div className="flex justify-between items-center">
<label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                            Contraseña
                        </label>
</div>
<div className="relative group">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors duration-300">
<svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <rect x="4" y="10" width="16" height="11" rx="2" />
  <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
</svg>
</div>
<input
  className="block w-full pl-12 pr-12 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 shadow-sm"
  id="password"
  placeholder="••••••••"
  required
  type={mostrarPassword ? "text" : "password"}
  value={password}
  onChange={(event) => setPassword(event.target.value)}
/>
<button type="button" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarPassword((visible) => !visible)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-primary hover:bg-primary/5">
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {mostrarPassword
      ? <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 5.5 9 7a8.5 8.5 0 0 1-2.4 3.5M6.2 6.2C3.8 7.8 3 10.5 3 12c0 1.5 3.5 7 9 7a9.8 9.8 0 0 0 3-.5" /></>
      : <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>}
  </svg>
</button>
</div>
</div>
{errorMensaje && (
  <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
    {errorMensaje}
  </p>
)}
{/* Submit Button */}
<button
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-on-primary bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-label-sm text-label-sm uppercase tracking-wider transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group ${isLoading ? "cursor-not-allowed opacity-90" : ""}`}
              disabled={isLoading}
              aria-busy={isLoading}
              type="submit"
            >
{isLoading ? (
  <span className="absolute inset-0 flex items-center justify-center gap-2">
<svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<span>Validando acceso</span>
</span>
) : "Iniciar Sesión"}
</button>
</form>
{/* Footer / Technical Info */}
<div className="mt-8 pt-6 border-t border-outline-variant/30 text-center space-y-2">
<p className="text-sm text-on-surface-variant">
                    Acceso institucional · CFE Transmisión Zona Guerrero
                </p>
<Link className="block leading-6 font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" to="/login/jefe-departamento">
  ¿Eres Jefe de Departamento? Entra aquí
</Link>
<Link className="block leading-6 font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" to="/admin/login">
  Acceso SuperAdministrador
</Link>
</div>
</div>
</div>

    </div>
  );
}

export default LoginPage;