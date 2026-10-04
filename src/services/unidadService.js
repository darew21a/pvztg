import { getAuthHeaders } from "./apiAuth.js";
import { obtenerTodasLasPaginas } from "./paginacionApi.js";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible completar la operación de unidades.");
  return body;
}

export async function obtenerUnidadesApi() {
  return obtenerTodasLasPaginas("/unidades");
}

export async function crearUnidadApi(datos) {
  return request("/unidades", { method: "POST", body: JSON.stringify(datos) });
}

export async function actualizarUnidadApi(id, datos) {
  return request(`/unidades/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export async function obtenerCredencialesEdenredApi(id) {
  return request(`/unidades/${encodeURIComponent(id)}/credenciales-edenred`);
}

export async function importarRelacionUnidadesApi(datos) {
  return request("/unidades/importacion-relacion", { method: "POST", body: JSON.stringify(datos) });
}

export async function consultarCargaRelacionApi(archivoHash, contenidoHash) {
  const query = new URLSearchParams({ contenidoHash });
  const respuesta = await request(`/unidades/cargas-relacion/${encodeURIComponent(archivoHash)}?${query}`);
  if (!respuesta || typeof respuesta.yaCargado !== "boolean") {
    throw new Error("La API devolvió un estado de importación con formato no válido.");
  }
  return respuesta;
}

export async function subirDocumentoUnidadApi(id, tipo, archivo) {
  const form = new FormData();
  form.append("tipo", tipo);
  form.append("documento", archivo);
  const response = await fetch(`${API_BASE_URL}/unidades/${encodeURIComponent(id)}/documentos`, {
    method: "POST",
    body: form,
    headers: getAuthHeaders(),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible guardar el documento.");
  return body;
}

export async function eliminarParqueVehicularApi(confirmacion) {
  return request("/admin/parque-vehicular", {
    method: "DELETE",
    body: JSON.stringify({ confirmacion }),
  });
}
