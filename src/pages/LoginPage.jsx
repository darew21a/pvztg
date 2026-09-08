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
function LoginPage() {
  const [rcf, setRcf] = useState("");
  const [password, setPassword] = useState("");
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Envío del formulario: intenta autenticar y redirige al dashboard del
  // Auditor. Cualquier error del backend (o del bypass de desarrollo, ver
  // AuthContext) se muestra en pantalla sin exponer detalles técnicos.
  async function handleLogin(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      await login({ rcf, password, rol: "auditor" }, recordarSesion);
      navigate("/dashboard");
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background min-h-screen flex text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
{/* Left Split: Hero Image & Branding */}
<div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary items-center justify-center">
{/* Parallax Background Image */}
<div className="absolute inset-0 bg-cover bg-center grayscale mix-blend-multiply opacity-70 transform scale-105 transition-transform duration-[10000ms] ease-linear hover:scale-110" style={{backgroundImage: 'url(\'https://lh3.googleusercontent.com/aida-public/AB6AXuC_bRKhJOI8XTtKkwMy-dFSXrN0LiUbStjWxnIbv_f_9Dtxz03NLkkP8SxbkowYjuTQCayljsGSCaZRKIAwLtlPGFOUQBVgk1l8KF39ECkWI7VL2Xc6ooGwmrRfRItREywy4SDOCC1EvKDqvIL6Cu4jheNd6OJrmgnbaT8A2MhQdWCg8T6OG-12F5aX1mu725CpsPaypBp7vETSbKHhbRnlZlbeS3KcJl5TA3O5Y-cCiHc5k_P1bdxk\')'}}></div>
{/* Gradient Overlay for readability */}
<div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/50 to-transparent"></div>
{/* Brand Content */}
<div className="relative z-10 p-16 flex flex-col items-start w-full max-w-2xl">
{/* Logo institucional de CFE */}
<div className="w-40 mb-8 bg-surface-container-lowest rounded-lg flex items-center justify-center shadow-lg p-3">
<img src={logoCfe} alt="Comisión Federal de Electricidad" className="w-full h-auto" />
</div>
<h1 className="font-display-lg text-display-lg text-on-primary mb-4 leading-tight">
                Sistema de Gestión<br/>
<span className="text-primary-fixed">Flota PV-ZTG</span>
</h1>
<p className="font-body-lg text-body-lg text-primary-fixed-dim max-w-md opacity-90">
                Plataforma de monitoreo y control administrativo para la Zona de Transmisión Guerrero.
            </p>
</div>
</div>
{/* Right Split: Login Form */}
<div className="w-full lg:w-1/2 flex items-center justify-center bg-surface-container-lowest p-8 sm:p-12 md:p-16 lg:p-24 relative">
{/* Form Container */}
<div className="w-full max-w-md space-y-10">
{/* Header */}
<div className="space-y-2">
<h2 className="font-headline-lg text-headline-lg md:text-display-lg text-on-surface">Bienvenido</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Ingrese sus credenciales corporativas para acceder al portal.</p>
</div>
{/* Login Form */}
<form className="space-y-6" id="loginForm" onSubmit={handleLogin}>
{/* RCF Input */}
<div className="space-y-2">
<label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="rcf">
                        RCF / Usuario
                    </label>
<div className="relative group">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors duration-300">
<span className="material-symbols-outlined">badge</span>
</div>
<input
  className="block w-full pl-12 pr-4 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 shadow-sm"
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
<Link className="font-label-sm text-label-sm text-primary hover:text-secondary transition-colors" to="/recuperar-contrasena">¿Olvidó su contraseña?</Link>
</div>
<div className="relative group">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors duration-300">
<span className="material-symbols-outlined">lock</span>
</div>
<input
  className="block w-full pl-12 pr-4 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 shadow-sm"
  id="password"
  placeholder="••••••••"
  required
  type="password"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
/>
</div>
</div>
{/* Recordar sesión */}
<label className="flex items-center gap-2 cursor-pointer select-none">
  <input
    type="checkbox"
    checked={recordarSesion}
    onChange={(event) => setRecordarSesion(event.target.checked)}
    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
  />
  <span className="font-body-md text-body-md text-on-surface-variant">Recordar sesión en este dispositivo</span>
</label>
{errorMensaje && (
  <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
    {errorMensaje}
  </p>
)}
{/* Submit Button */}
<button
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-on-primary bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-label-sm text-label-sm uppercase tracking-wider transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group ${isLoading ? "cursor-not-allowed opacity-90" : ""}`}
              disabled={isLoading}
              type="submit"
            >
<span className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : ""}`}>Iniciar Sesión</span>
{/* Spinner State (Hidden by default) */}
<span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isLoading ? "opacity-100" : "opacity-0"}`}>
<svg className="animate-spin h-5 w-5 text-on-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
</span>
</button>
</form>
{/* Footer / Technical Info */}
<div className="mt-8 pt-6 border-t border-outline-variant/30 text-center space-y-2">
<p className="font-technical-mono text-technical-mono text-outline text-xs">
                    Terminal Habilitada. Secure Connection v2.4.1
                </p>
<Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" to="/login/jefe-departamento">
  ¿Eres Jefe de Departamento? Entra aquí
</Link>
<Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" to="/admin/login">
  Acceso SuperAdministrador
</Link>
</div>
</div>
</div>

    </div>
  );
}

export default LoginPage;
