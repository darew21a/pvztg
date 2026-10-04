import { getAuthHeaders } from "./apiAuth.js";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "/api";
const PAGE_SIZE = 200;

export async function obtenerTodasLasPaginas(path, { signal, token } = {}) {
  const registros = [];
  let pagina = 1;
  let paginasTotales = 1;

  do {
    const separador = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${API_BASE_URL}${path}${separador}page=${pagina}&limit=${PAGE_SIZE}`,
      { headers: getAuthHeaders(token), signal },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.mensaje ?? `No fue posible cargar los registros (HTTP ${response.status}).`);
    if (!Array.isArray(body)) throw new Error("La API devolvió una lista con un formato no válido.");

    registros.push(...body);
    const totalHeader = response.headers.get("X-Pagination-Total-Pages");
    if (totalHeader != null) {
      paginasTotales = Number(totalHeader);
      if (!Number.isSafeInteger(paginasTotales) || paginasTotales < 0) {
        throw new Error("La API devolvió metadatos de paginación no válidos.");
      }
    } else {
      paginasTotales = body.length === PAGE_SIZE ? pagina + 1 : pagina;
    }
    pagina += 1;
  } while (pagina <= paginasTotales);

  return registros;
}
