import { getAuthHeaders } from "./apiAuth.js";
import { extraerErrorEliminacionDepartamento } from "../utils/departamentoDependencias.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function obtenerDepartamentos() {
  const response = await fetch(`${API_BASE_URL}/departamentos`, { headers: getAuthHeaders() });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.mensaje ?? "No fue posible cargar los departamentos.");
  }

  return body;
}

export async function crearDepartamentoApi(datos) {
  const response = await fetch(`${API_BASE_URL}/departamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(datos),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.mensaje ?? "No fue posible crear el departamento.");
  return body;
}

export async function eliminarDepartamentoApi(id, confirmacion) {
  const response = await fetch(`${API_BASE_URL}/admin/departamentos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ confirmacion }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detalle = extraerErrorEliminacionDepartamento(body);
    const error = new Error(detalle.mensaje);
    error.codigo = detalle.codigo;
    error.dependencias = detalle.dependencias;
    throw error;
  }
  return body;
}
