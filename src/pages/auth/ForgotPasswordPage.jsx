import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OtpInput from "../../components/auth/OtpInput.jsx";
import { solicitarRestablecimiento, verificarOtp, restablecerPassword } from "../../services/authService.js";
import logoCfe from "../../assets/logo-cfe.png";

/** Pasos del asistente de autoservicio de restablecimiento de contraseña (SSPR). */
const PASOS = {
  IDENTIFICAR: "identificar",
  VERIFICAR: "verificar",
  NUEVA_PASSWORD: "nueva-password",
  COMPLETADO: "completado",
};

/**
 * Autoservicio de Restablecimiento de Contraseña (SSPR).
 * Flujo: 1) el usuario indica su RCF y el medio (celular o correo) al que
 * se envía el código → 2) verifica el código OTP recibido → 3) define una
 * nueva contraseña. Cada paso llama al backend real (`authService`); no hay
 * simulación de OTP en este componente, la generación/envío es responsabilidad
 * del backend PHP.
 */
function ForgotPasswordPage() {
  const [paso, setPaso] = useState(PASOS.IDENTIFICAR);
  const [rcf, setRcf] = useState("");
  const [medio, setMedio] = useState("celular");
  const [solicitudId, setSolicitudId] = useState("");
  const [otp, setOtp] = useState("");
  const [tokenRestablecimiento, setTokenRestablecimiento] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState("");
  const navigate = useNavigate();

  async function handleSolicitar(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      const { solicitudId: id } = await solicitarRestablecimiento({ rcf, medio });
      setSolicitudId(id);
      setPaso(PASOS.VERIFICAR);
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerificar(event) {
    event.preventDefault();
    setErrorMensaje("");
    setIsLoading(true);
    try {
      const { tokenRestablecimiento: token } = await verificarOtp({ solicitudId, otp });
      setTokenRestablecimiento(token);
      setPaso(PASOS.NUEVA_PASSWORD);
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestablecer(event) {
    event.preventDefault();
    setErrorMensaje("");
    if (nuevaPassword !== confirmarPassword) {
      setErrorMensaje("Las contraseñas no coinciden.");
      return;
    }
    setIsLoading(true);
    try {
      await restablecerPassword({ tokenRestablecimiento, nuevaPassword });
      setPaso(PASOS.COMPLETADO);
    } catch (error) {
      setErrorMensaje(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8 space-y-6">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" className="w-28 mx-auto" />
        <div className="space-y-1">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Recuperar contraseña</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Autoservicio de Restablecimiento de Contraseña (SSPR).
          </p>
        </div>

        {errorMensaje && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-4 py-2">
            {errorMensaje}
          </p>
        )}

        {paso === PASOS.IDENTIFICAR && (
          <form className="space-y-5" onSubmit={handleSolicitar}>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="rcf-recuperacion">
                RCF / Usuario
              </label>
              <input
                id="rcf-recuperacion"
                type="text"
                required
                value={rcf}
                onChange={(event) => setRcf(event.target.value)}
                className="block w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Enviar código por
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "celular", label: "SMS al celular", icon: "smartphone" },
                  { value: "correo", label: "Correo electrónico", icon: "mail" },
                ].map((opcion) => (
                  <button
                    key={opcion.value}
                    type="button"
                    onClick={() => setMedio(opcion.value)}
                    className={`py-3 px-2 rounded-lg font-label-sm text-label-sm transition-all flex items-center justify-center gap-2 border ${
                      medio === opcion.value
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-transparent text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{opcion.icon}</span>
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {isLoading ? "Enviando…" : "Enviar código"}
            </button>
          </form>
        )}

        {paso === PASOS.VERIFICAR && (
          <form className="space-y-5" onSubmit={handleVerificar}>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              Ingresa el código de 6 dígitos enviado por {medio === "celular" ? "SMS" : "correo"}.
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full py-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {isLoading ? "Verificando…" : "Verificar código"}
            </button>
          </form>
        )}

        {paso === PASOS.NUEVA_PASSWORD && (
          <form className="space-y-5" onSubmit={handleRestablecer}>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="nueva-password">
                Nueva contraseña
              </label>
              <input
                id="nueva-password"
                type="password"
                required
                value={nuevaPassword}
                onChange={(event) => setNuevaPassword(event.target.value)}
                className="block w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="confirmar-password">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirmar-password"
                type="password"
                required
                value={confirmarPassword}
                onChange={(event) => setConfirmarPassword(event.target.value)}
                className="block w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {isLoading ? "Guardando…" : "Restablecer contraseña"}
            </button>
          </form>
        )}

        {paso === PASOS.COMPLETADO && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px] icon-fill">check</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface">
              Tu contraseña se actualizó correctamente.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}

        {paso !== PASOS.COMPLETADO && (
          <Link to="/" className="block text-center font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Volver al inicio de sesión
          </Link>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
