import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET ?? "").trim();
  if (secret.length < 32) {
    throw new Error("JWT_SECRET debe existir y tener al menos 32 caracteres.");
  }
  return secret;
}

export function createAccessToken(usuario) {
  return jwt.sign(
    {
      role: usuario.rol,
      username: usuario.usuario,
      name: usuario.nombre,
      departmentId: usuario.departamento_id ?? null,
      mustChangePassword: Boolean(usuario.debe_cambiar_password ?? usuario.mustChangePassword),
      sessionVersion: Number(usuario.session_version ?? usuario.sessionVersion ?? 0),
    },
    getJwtSecret(),
    { subject: String(usuario.id), expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );
}

export function requirePasswordChangeComplete(req, res, next) {
  if (req.auth?.mustChangePassword) {
    return res.status(403).json({ mensaje: "Debe cambiar su contraseña temporal antes de continuar.", codigo: "PASSWORD_CHANGE_REQUIRED" });
  }
  return next();
}

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ mensaje: "Se requiere un token de acceso." });
  }

  try {
    req.auth = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ mensaje: "El token de acceso no es válido o ha expirado." });
  }
  if (!req.app || (process.env.NODE_ENV === "test" && !process.env.TEST_DB_NAME)) {
    return next();
  }
  try {
    const rows = await query(
      "SELECT activo, rol, departamento_id, session_version, debe_cambiar_password FROM usuarios WHERE id = ? LIMIT 1",
      [req.auth.sub],
    );
    const usuario = rows[0];
    if (!usuario
      || !usuario.activo
      || Number(usuario.session_version) !== Number(req.auth.sessionVersion ?? 0)
      || String(usuario.rol) !== String(req.auth.role)
      || Number(usuario.departamento_id ?? 0) !== Number(req.auth.departmentId ?? 0)) {
      return res.status(401).json({ mensaje: "El token de acceso no es válido o ha expirado." });
    }
    req.auth.mustChangePassword = Boolean(usuario.debe_cambiar_password);
    if (req.auth.mustChangePassword && !["/auth/password", "/password"].includes(req.path)) {
      return res.status(403).json({
        mensaje: "Debe cambiar su contraseña temporal antes de continuar.",
        codigo: "PASSWORD_CHANGE_REQUIRED",
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ mensaje: "No tiene permisos para realizar esta operación." });
    }
    return next();
  };
}
