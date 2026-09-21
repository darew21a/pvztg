import { useContext } from "react";
import AuthContext from "../context/AuthContext.jsx";

/**
 * Hook de acceso al contexto de autenticación. Centraliza el `useContext`
 * y valida que se use dentro de un `<AuthProvider>`, para que un error de
 * integración falle rápido y con un mensaje claro en vez de un `null`
 * silencioso más adelante en el árbol de componentes.
 * @returns {{
 *   usuario: object | null,
 *   token: string | null,
 *   rol: "administrador" | "superadmin" | "jefe-departamento" | null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: Function,
 *   loginAdmin: Function,
 *   loginJefeDepartamento: Function,
 *   logout: Function,
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>.");
  }
  return context;
}
