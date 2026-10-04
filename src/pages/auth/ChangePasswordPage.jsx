import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cambiarPassword } from "../../services/authService.js";
import { useAuth } from "../../hooks/useAuth.js";

function ChangePasswordPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrar, setMostrar] = useState({ actual: false, nueva: false, confirmacion: false });

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (nueva !== confirmacion) return setError("Las contraseñas nuevas no coinciden.");
    if (nueva.length < 5 || !/[A-Z]/.test(nueva) || !/[a-z]/.test(nueva) || !/\d/.test(nueva)) {
      return setError("Usa al menos 5 caracteres, una mayúscula, una minúscula y un número.");
    }
    setGuardando(true);
    try {
      await cambiarPassword({ passwordActual: actual, nuevaPassword: nueva });
      logout();
      navigate("/", { replace: true, state: { mensaje: "Contraseña actualizada. Inicia sesión nuevamente." } });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return <main className="min-h-screen flex items-center justify-center bg-background p-6">
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
      <h1 className="text-headline-lg text-on-surface">Cambia tu contraseña</h1>
      <p className="text-body-md text-on-surface-variant">{usuario?.debeCambiarPassword ? "La contraseña temporal debe reemplazarse antes de continuar." : "Actualiza tu contraseña de acceso."}</p>
      {error && <p role="alert" className="rounded-lg bg-error-container/20 p-3 text-error">{error}</p>}
      <PasswordField label="Contraseña actual" value={actual} onChange={setActual} visible={mostrar.actual} onToggle={() => setMostrar((state) => ({ ...state, actual: !state.actual }))} />
      <PasswordField label="Nueva contraseña" value={nueva} onChange={setNueva} visible={mostrar.nueva} onToggle={() => setMostrar((state) => ({ ...state, nueva: !state.nueva }))} />
      <PasswordField label="Confirmar nueva contraseña" value={confirmacion} onChange={setConfirmacion} visible={mostrar.confirmacion} onToggle={() => setMostrar((state) => ({ ...state, confirmacion: !state.confirmacion }))} />
      <button disabled={guardando} className="w-full rounded-lg bg-primary p-3 text-on-primary disabled:opacity-60">{guardando ? "Guardando…" : "Actualizar contraseña"}</button>
    </form>
  </main>;
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
  return <label className="relative block">
    <span className="sr-only">{label}</span>
    <input aria-label={label} type={visible ? "text" : "password"} required value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border p-3 pr-12" placeholder={label} />
    <button type="button" aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`} onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-on-surface-variant hover:bg-surface-container-high">
      <span className="material-symbols-outlined text-[20px]">{visible ? "visibility_off" : "visibility"}</span>
    </button>
  </label>;
}

export default ChangePasswordPage;
