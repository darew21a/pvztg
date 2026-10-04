import { getAuthHeaders } from "./apiAuth.js";
import { obtenerTodasLasPaginas } from "./paginacionApi.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible completar la operación de combustible.");
  return body;
}

export function obtenerTicketsApi() {
  return obtenerTodasLasPaginas("/tickets-combustible");
}

export function crearTicketApi(datos) {
  if (datos instanceof FormData) return request("/tickets-combustible", { method: "POST", body: datos });
  return request("/tickets-combustible", { method: "POST", body: JSON.stringify(datos) });
}
