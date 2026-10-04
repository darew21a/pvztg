import { Router } from "express";
import bcrypt from "bcryptjs";
import { pingDatabase, query } from "../config/db.js";
import { createAccessToken, requireAuth } from "../middleware/auth.js";
import { requestRateLimit } from "../middleware/rateLimit.js";

const router = Router();
const loginRateLimit = requestRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Demasiados intentos de acceso. Inténtalo nuevamente más tarde.",
});
function normalizeRole(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const map = {
    auditor: "apv",
    administrador: "apv",
    apv: "apv",
    admin: "stt",
    superadmin: "stt",
    stt: "stt",
    "super-admin": "stt",
    "jefe-departamento": "jefe-departamento",
    "jefe departamento": "jefe-departamento",
    jefe: "jefe-departamento",
  };

  return map[raw] ?? raw;
}

function buildSession(usuario) {
  const rol = normalizeRole(usuario.rol);
  return {
    token: createAccessToken({ ...usuario, rol }),
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol,
      usuario: usuario.usuario,
      email: usuario.email,
      departamentoId: usuario.departamento_id,
      debeCambiarPassword: Boolean(usuario.debe_cambiar_password),
    },
  };
}

function validarPassword(password) {
  const value = String(password ?? "");
  return value.length >= 5 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}

router.get("/health", async (_req, res) => {
  res.json({ ok: true, service: "pvztg-backend", timestamp: new Date().toISOString() });
});

router.get("/health/ready", async (_req, res) => {
  try {
    const databaseReady = await pingDatabase();
    if (!databaseReady) {
      return res.status(503).json({ ok: false, service: "pvztg-backend", database: "unavailable" });
    }
    return res.json({ ok: true, service: "pvztg-backend", database: "ready", timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ ok: false, service: "pvztg-backend", database: "unavailable" });
  }
});

router.post("/auth/login", loginRateLimit, async (req, res) => {
  const { rcf, password, rol } = req.body ?? {};

  if (!rcf || !password) {
    return res.status(400).json({ mensaje: "RCF/usuario y contraseña son obligatorios." });
  }

  const usuario = await query(
    `SELECT * FROM usuarios WHERE usuario = ? AND activo = 1 LIMIT 1`,
    [String(rcf).trim()],
  );

  const usuarioEncontrado = usuario[0];
  if (!usuarioEncontrado) {
    return res.status(401).json({ mensaje: "Credenciales inválidas." });
  }

  const rolEsperado = rol ? normalizeRole(rol) : null;
  const rolReal = normalizeRole(usuarioEncontrado.rol);

  if (rolEsperado && rolReal !== rolEsperado) {
    return res.status(403).json({ mensaje: "El rol solicitado no coincide con este usuario." });
  }

  const passwordValida = await bcrypt.compare(String(password), String(usuarioEncontrado.password_hash));
  if (!passwordValida) {
    return res.status(401).json({ mensaje: "Credenciales inválidas." });
  }

  return res.json(buildSession(usuarioEncontrado));
});

router.post("/auth/password", requireAuth, async (req, res) => {
  const { passwordActual, nuevaPassword } = req.body ?? {};
  if (!passwordActual || !nuevaPassword) return res.status(400).json({ mensaje: "La contraseña actual y la nueva son obligatorias." });
  if (!validarPassword(nuevaPassword)) return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 5 caracteres, una mayúscula, una minúscula y un número." });
  const rows = await query("SELECT id, password_hash FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1", [req.auth.sub]);
  if (!rows[0] || !(await bcrypt.compare(String(passwordActual), rows[0].password_hash))) {
    return res.status(401).json({ mensaje: "La contraseña actual no es correcta." });
  }
  await query("UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0, password_changed_at = CURRENT_TIMESTAMP, session_version = session_version + 1 WHERE id = ?", [await bcrypt.hash(String(nuevaPassword), 12), req.auth.sub]);
  return res.json({ ok: true, mensaje: "Contraseña actualizada correctamente." });
});

router.post("/auth/login-superadmin", loginRateLimit, async (req, res) => {
  const { usuario, password } = req.body ?? {};
  if (!usuario || !password) {
    return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios." });
  }

  const rows = await query(
    `SELECT * FROM usuarios WHERE usuario = ? AND rol = 'stt' AND activo = 1 LIMIT 1`,
    [String(usuario).trim()],
  );

  const usuarioEncontrado = rows[0];
  if (!usuarioEncontrado) {
    return res.status(401).json({ mensaje: "Credenciales inválidas." });
  }

  const passwordValida = await bcrypt.compare(String(password), String(usuarioEncontrado.password_hash));
  if (!passwordValida) {
    return res.status(401).json({ mensaje: "Credenciales inválidas." });
  }

  return res.json(buildSession(usuarioEncontrado));
});

router.post("/auth/login-jefe-departamento", loginRateLimit, async (req, res) => {
  const { usuario, password, departamento } = req.body ?? {};

  if (!usuario || !password || !departamento) {
    return res.status(400).json({ mensaje: "Usuario, contraseña y departamento son obligatorios." });
  }

  const rows = await query(
    `SELECT u.*
     FROM usuarios u
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     WHERE u.usuario = ? AND u.rol = 'jefe-departamento' AND u.activo = 1
       AND (u.departamento_id = ? OR d.nombre = ?)
     LIMIT 1`,
    [String(usuario).trim(), Number(departamento), String(departamento)],
  );

  const usuarioEncontrado = rows[0];
  if (!usuarioEncontrado) {
    return res.status(401).json({ mensaje: "No se encontró un jefe de departamento con ese acceso." });
  }

  const passwordValida = await bcrypt.compare(String(password), String(usuarioEncontrado.password_hash));
  if (!passwordValida) {
    return res.status(401).json({ mensaje: "Credenciales inválidas." });
  }

  return res.json(buildSession(usuarioEncontrado));
});

export default router;
