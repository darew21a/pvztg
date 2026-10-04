import { getAuthHeaders } from "./apiAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.mensaje ?? "No fue posible completar la operación de usuarios.");
  }

  return body;
}

export async function obtenerUsuarios() {
  return request("/usuarios");
}

export async function obtenerPerfil() {
  return request("/usuarios/perfil");
}

export async function actualizarPerfil(datos) {
  return request("/usuarios/perfil", {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

export async function crearUsuario(datos) {
  return request("/usuarios", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarUsuario(id, datos) {
  return request(`/usuarios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

export async function actualizarEstadoUsuario(id, activo) {
  return request(`/usuarios/${encodeURIComponent(id)}/activo`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}

export async function eliminarUsuario(id) {
  return request(`/usuarios/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
