import { useState } from "react";
import { abrirArchivoProtegidoEnPestana, resolveApiUrl } from "../../services/apiAuth.js";
import GlowButton from "./GlowButton.jsx";

function EnlaceDescargaProtegida({ url, nombre, className, children }) {
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);
  const archivoProtegido = String(url).startsWith("/api/uploads/");
  const esPdf = /\.pdf(?:$|[?#])/i.test(`${nombre ?? ""} ${url}`);

  if (!url) {
    return <span className="text-outline-variant text-xs">{children}</span>;
  }

  async function manejarDescarga(event) {
    if (!archivoProtegido || !esPdf) return;
    event.preventDefault();
    if (descargando) return;
    setError("");
    setDescargando(true);
    try {
      await abrirArchivoProtegidoEnPestana(url, nombre);
    } catch (downloadError) {
      setError(downloadError.message || `No fue posible descargar ${nombre}.`);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <GlowButton
        as="a"
        href={resolveApiUrl(url)}
        target={esPdf && !archivoProtegido ? "_blank" : undefined}
        rel={esPdf && !archivoProtegido ? "noopener noreferrer" : undefined}
        download={archivoProtegido && !esPdf ? nombre : undefined}
        onClick={manejarDescarga}
        aria-busy={descargando}
        className={className}
      >
        {children}
        {descargando && <span className="sr-only">Descargando…</span>}
      </GlowButton>
      {error && <span role="alert" className="max-w-48 text-[10px] text-error">{error}</span>}
    </span>
  );
}

export default EnlaceDescargaProtegida;
