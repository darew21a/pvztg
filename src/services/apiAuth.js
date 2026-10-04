const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "/api";
let accessToken = "";

export function setAccessToken(token) {
  accessToken = typeof token === "string" ? token : "";
}

export function resolveApiUrl(value) {
  if (!value || !String(value).startsWith("/api/")) return value;
  if (API_BASE_URL.startsWith("http")) return `${API_BASE_URL.replace(/\/$/, "")}${String(value).slice(4)}`;
  return value;
}

export async function descargarArchivoProtegido(url, nombre) {
  const response = await fetch(resolveApiUrl(url), { headers: getAuthHeaders() });
  if (!response.ok) throw new Error("No fue posible descargar el archivo.");
  const blobUrl = URL.createObjectURL(await response.blob());
  const enlace = document.createElement("a");
  enlace.href = blobUrl;
  enlace.download = nombre;
  enlace.style.display = "none";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export async function abrirArchivoProtegidoEnPestana(url, nombre) {
  const pestaña = window.open("about:blank", "_blank");
  try {
    const response = await fetch(resolveApiUrl(url), { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("No fue posible abrir el archivo.");
    const blobUrl = URL.createObjectURL(await response.blob());
    if (pestaña && !pestaña.closed) {
      pestaña.location.href = blobUrl;
      const cleanup = window.setInterval(() => {
        if (!pestaña.closed) return;
        window.clearInterval(cleanup);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      return;
    }
    const enlace = document.createElement("a");
    enlace.href = blobUrl;
    enlace.download = nombre;
    enlace.style.display = "none";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    if (pestaña && !pestaña.closed) pestaña.close();
    throw error;
  }
}

export function abrirODescargarArchivoProtegido(url, nombre, nombreOriginal = nombre) {
  const esPdf = /\.pdf(?:$|[?#])/i.test(`${nombreOriginal ?? ""} ${url ?? ""}`);
  return esPdf
    ? abrirArchivoProtegidoEnPestana(url, nombre)
    : descargarArchivoProtegido(url, nombre);
}

export function getAuthHeaders(token = accessToken) {
  return typeof token === "string" && token ? { Authorization: `Bearer ${token}` } : {};
}
