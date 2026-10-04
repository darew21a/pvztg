import { getAuthHeaders } from "./apiAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function marcarCasosAnomaliaVistos(findingIds, token) {
  const response = await fetch(`${API_BASE_URL}/anomalias/casos/marcar-vistas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(token) },
    body: JSON.stringify({ findingIds }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.mensaje ?? "No fue posible marcar las alertas como vistas.");
  }
  return body;
}
