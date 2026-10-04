import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../services/apiAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function reproducirAviso() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.23);
  oscillator.addEventListener("ended", () => context.close());
}

function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const contenedorRef = useRef(null);
  const previousIds = useRef(new Set());
  const audioEnabled = useRef(false);

  async function cargarNotificaciones(signal) {
    const response = await fetch(`${API_BASE_URL}/notificaciones?limit=100`, {
      headers: getAuthHeaders(),
      signal,
    });
    if (!response.ok) throw new Error(`No fue posible cargar notificaciones (${response.status}).`);
    const nuevas = await response.json();
    const nuevosNoLeidos = nuevas.some((item) => item.unread && !previousIds.current.has(item.id));
    if (audioEnabled.current && nuevosNoLeidos) reproducirAviso();
    previousIds.current = new Set(nuevas.map((item) => item.id));
    setItems(nuevas);
    setError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    cargarNotificaciones(controller.signal).catch((loadError) => {
      if (loadError.name !== "AbortError") {
        setError(loadError.message);
        console.error("No fue posible cargar notificaciones.", loadError);
      }
    });
    const timer = window.setInterval(() => {
      cargarNotificaciones(controller.signal).catch((loadError) => {
        if (loadError.name !== "AbortError") console.error("No fue posible actualizar notificaciones.", loadError);
      });
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    function cerrarAlHacerClicFuera(event) {
      if (!contenedorRef.current?.contains(event.target)) setIsOpen(false);
    }
    function cerrarConEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", cerrarAlHacerClicFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlHacerClicFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [isOpen]);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  async function marcarLeida(id) {
    const response = await fetch(`${API_BASE_URL}/notificaciones/${encodeURIComponent(id)}/leida`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("No fue posible marcar la notificación como leída.");
    setItems((actuales) => actuales.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  }

  async function marcarTodas() {
    const response = await fetch(`${API_BASE_URL}/notificaciones/leidas`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("No fue posible marcar las notificaciones como leídas.");
    setItems((actuales) => actuales.map((item) => ({ ...item, unread: false })));
  }

  function abrir() {
    audioEnabled.current = true;
    setIsOpen((actual) => !actual);
  }

  async function abrirNotificacion(item) {
    try {
      if (item.unread) await marcarLeida(item.id);
      setIsOpen(false);
      if (typeof item.actionUrl === "string" && item.actionUrl.startsWith("/")) navigate(item.actionUrl);
    } catch (operationError) {
      setError(operationError.message);
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant transition hover:border-primary hover:text-primary"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        aria-controls="notification-center-panel"
        onClick={abrir}
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-error px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {isOpen && (
        <div id="notification-center-panel" className="absolute right-0 top-full z-50 mt-3 w-[360px] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container px-4 py-3">
            <div>
              <p className="font-title-md text-title-md text-on-surface">Notificaciones</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{unreadCount} sin leer</p>
            </div>
            <button type="button" onClick={() => marcarTodas().catch((operationError) => setError(operationError.message))} disabled={unreadCount === 0} className="font-label-sm text-label-sm text-primary hover:underline disabled:text-on-surface-variant">Marcar todas</button>
          </div>
          {error && <p className="border-b border-error/30 bg-error-container/20 px-4 py-2 text-xs text-error">{error}</p>}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="p-5 text-sm text-on-surface-variant">No hay movimientos nuevos.</p>}
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => abrirNotificacion(item)} className={`flex w-full items-start gap-3 border-b border-outline-variant/40 px-4 py-3 text-left transition hover:bg-surface-container ${item.unread ? "bg-primary-container/10" : ""}`}>
                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body-md text-body-md text-on-surface">{item.title}</p>
                    {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{item.detail}</p>
                  <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">{new Date(item.time).toLocaleString("es-MX")}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
