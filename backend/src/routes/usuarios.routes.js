import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/usuarios/perfil", async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.nombre, u.usuario, u.email, u.celular, u.rol, u.departamento_id,
            u.contactos_adicionales_json,
            d.nombre AS departamento, u.debe_cambiar_password
     FROM usuarios u
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     WHERE u.id = ? AND u.activo = 1 LIMIT 1`,
    [req.auth.sub],
  );
  if (!rows[0]) return res.status(404).json({ mensaje: "Perfil no encontrado." });
  const contactos = rows[0].contactos_adicionales_json;
  let contactosAdicionales = [];
  if (Array.isArray(contactos)) {
    contactosAdicionales = contactos;
  } else if (typeof contactos === "string" && contactos) {
    contactosAdicionales = JSON.parse(contactos);
    if (!Array.isArray(contactosAdicionales)) {
      throw new Error("Los contactos adicionales guardados en el perfil no tienen un formato válido.");
    }
  } else if (contactos != null) {
    throw new Error("Los contactos adicionales guardados en el perfil no tienen un formato válido.");
  }
  const perfil = { ...rows[0] };
  delete perfil.contactos_adicionales_json;
  return res.json({ ...perfil, contactosAdicionales });
});

router.patch("/usuarios/perfil", async (req, res) => {
  const { nombre, email, celular, contactosAdicionales } = req.body ?? {};
  const nombreNormalizado = String(nombre ?? "").trim();
  const emailNormalizado = String(email ?? "").trim().toLowerCase();
  const celularNormalizado = String(celular ?? "").trim();
  if (!nombreNormalizado || !emailNormalizado || !celularNormalizado) {
    return res.status(400).json({ mensaje: "Nombre, correo y celular son obligatorios." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    return res.status(400).json({ mensaje: "El correo electrónico no es válido." });
  }
  if (contactosAdicionales !== undefined && !Array.isArray(contactosAdicionales)) {
    return res.status(400).json({ mensaje: "Los contactos adicionales deben enviarse como una lista." });
  }
  if (contactosAdicionales?.length > 20) {
    return res.status(400).json({ mensaje: "No se pueden guardar más de 20 contactos adicionales." });
  }
  const contactosNormalizados = contactosAdicionales?.map((contacto) => {
    const etiqueta = String(contacto?.etiqueta ?? "").trim();
    const valor = String(contacto?.valor ?? "").trim();
    const id = String(contacto?.id ?? "").trim();
    if (!etiqueta || !valor || etiqueta.length > 80 || valor.length > 255 || !id || id.length > 100) {
      return null;
    }
    return { id, etiqueta, valor };
  });
  if (contactosNormalizados?.some((contacto) => contacto === null)) {
    return res.status(400).json({ mensaje: "Cada contacto adicional requiere etiqueta e información, con un máximo de 80 y 255 caracteres respectivamente." });
  }
  if (contactosNormalizados && new Set(contactosNormalizados.map(({ id }) => id)).size !== contactosNormalizados.length) {
    return res.status(400).json({ mensaje: "Cada contacto adicional debe tener un identificador único." });
  }

  const campos = ["nombre = ?", "email = ?", "celular = ?"];
  const valores = [nombreNormalizado, emailNormalizado, celularNormalizado];
  if (contactosNormalizados) {
    campos.push("contactos_adicionales_json = ?");
    valores.push(JSON.stringify(contactosNormalizados));
  }
  valores.push(req.auth.sub);
  const result = await query(
    `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ? AND activo = 1`,
    valores,
  );
  if (!result.affectedRows) {
    const rows = await query("SELECT id FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1", [req.auth.sub]);
    if (!rows[0]) return res.status(404).json({ mensaje: "Perfil no encontrado." });
  }
  return res.json({
    mensaje: "Perfil actualizado correctamente.",
    nombre: nombreNormalizado,
    email: emailNormalizado,
    celular: celularNormalizado,
    ...(contactosNormalizados ? { contactosAdicionales: contactosNormalizados } : {}),
  });
});

router.get("/usuarios", requireRoles("stt"), async (_req, res) => {
  const rows = await query(
    `    SELECT u.id, u.nombre, u.usuario, u.email, u.rol, u.activo, u.celular, u.departamento_id, u.debe_cambiar_password,
            d.nombre AS departamento
     FROM usuarios u
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     ORDER BY u.created_at DESC`,
  );

  return res.json(rows);
});

router.post("/usuarios", requireRoles("stt"), async (req, res) => {
  const { nombre, usuario, email, password, rol, departamentoId, activo, celular } = req.body ?? {};

  const rolesPermitidos = ["stt", "apv", "jefe-departamento"];
  if (!nombre || !usuario || !password || !rol) {
    return res.status(400).json({ mensaje: "Nombre, usuario, password y rol son obligatorios." });
  }
  if (!rolesPermitidos.includes(String(rol).trim().toLowerCase())) {
    return res.status(400).json({ mensaje: "El rol indicado no es válido." });
  }
  if (String(password).length < 5 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ mensaje: "La contraseña temporal debe tener al menos 5 caracteres, una mayúscula, una minúscula y un número." });
  }
  const rolNormalizado = String(rol).trim().toLowerCase();
  if (rolNormalizado === "jefe-departamento" && (!departamentoId || !Number.isInteger(Number(departamentoId)))) {
    return res.status(400).json({ mensaje: "El jefe de departamento requiere un departamento válido." });
  }
  if (departamentoId) {
    const departamentos = await query("SELECT id FROM departamentos WHERE id = ? AND activo = 1 LIMIT 1", [Number(departamentoId)]);
    if (!departamentos[0]) {
      return res.status(400).json({ mensaje: "El departamento indicado no existe o está inactivo." });
    }
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  let result;
  try {
    result = await query(
      `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, departamento_id, activo, celular, debe_cambiar_password, password_changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      [
        String(nombre).trim(),
        String(usuario).trim(),
        email ?? null,
        passwordHash,
        String(rol).trim().toLowerCase(),
        departamentoId ? Number(departamentoId) : null,
        activo === undefined ? 1 : activo ? 1 : 0,
        celular ?? null,
      ],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "El usuario indicado ya existe." });
    }
    throw error;
  }

  return res.status(201).json({ id: result.insertId, mensaje: "Usuario creado correctamente." });
});

router.patch("/usuarios/:id", requireRoles("stt"), async (req, res) => {
  const { nombre, usuario, email, celular, password, rol, departamentoId, activo } = req.body ?? {};
  const rolesPermitidos = ["stt", "apv", "jefe-departamento"];
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || !nombre || !usuario || !rol) {
    return res.status(400).json({ mensaje: "Nombre, usuario y rol son obligatorios." });
  }
  const rolNormalizado = String(rol).trim().toLowerCase();
  if (!rolesPermitidos.includes(rolNormalizado)) {
    return res.status(400).json({ mensaje: "El rol indicado no es válido." });
  }
  if (rolNormalizado === "jefe-departamento" && (!departamentoId || !Number.isInteger(Number(departamentoId)))) {
    return res.status(400).json({ mensaje: "El jefe de departamento requiere un departamento válido." });
  }
  if (departamentoId) {
    const departamentos = await query("SELECT id FROM departamentos WHERE id = ? AND activo = 1 LIMIT 1", [Number(departamentoId)]);
    if (!departamentos[0]) return res.status(400).json({ mensaje: "El departamento indicado no existe o está inactivo." });
  }
  if (password && (String(password).length < 5 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 5 caracteres, una mayúscula, una minúscula y un número." });
  }
  const emailNormalizado = email == null ? null : String(email).trim().toLowerCase();
  if (emailNormalizado && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    return res.status(400).json({ mensaje: "El correo electrónico no es válido." });
  }
  const campos = ["nombre = ?", "usuario = ?", "email = ?", "celular = ?", "rol = ?", "departamento_id = ?", "activo = ?", "session_version = session_version + 1"];
  const valores = [String(nombre).trim(), String(usuario).trim().toLowerCase(), emailNormalizado, celular == null ? null : String(celular).trim(), rolNormalizado, departamentoId ? Number(departamentoId) : null, activo ? 1 : 0];
  if (password) {
    campos.push("password_hash = ?", "debe_cambiar_password = 1", "password_changed_at = NULL");
    valores.push(await bcrypt.hash(String(password), 10));
  }
  valores.push(id);
  try {
    const result = await query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, valores);
    if (!result.affectedRows) return res.status(404).json({ mensaje: "Usuario no encontrado." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "El usuario indicado ya existe." });
    throw error;
  }
  return res.json({ mensaje: "Credencial actualizada correctamente." });
});

router.patch("/usuarios/:id/activo", requireRoles("stt"), async (req, res) => {
  const activo = req.body?.activo;
  if (typeof activo !== "boolean") return res.status(400).json({ mensaje: "activo debe ser booleano." });
  const result = await query("UPDATE usuarios SET activo = ?, session_version = session_version + 1 WHERE id = ?", [activo ? 1 : 0, Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ mensaje: "Usuario no encontrado." });
  return res.json({ mensaje: "Estado de usuario actualizado." });
});

router.delete("/usuarios/:id", requireRoles("stt"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ mensaje: "El identificador de usuario no es válido." });
  if (String(id) === String(req.auth.sub)) return res.status(400).json({ mensaje: "No puede eliminar la credencial con la que inició sesión." });

  const usuarios = await query("SELECT id FROM usuarios WHERE id = ? LIMIT 1", [id]);
  if (!usuarios[0]) return res.status(404).json({ mensaje: "Usuario no encontrado." });

  const referencias = await query(
    `SELECT
       (SELECT COUNT(*) FROM tickets_combustible WHERE subido_por = ?) AS tickets,
       (SELECT COUNT(*) FROM reportes WHERE creado_por = ?) AS reportes,
       (SELECT COUNT(*) FROM reporte_seguimiento WHERE usuario_id = ?) AS seguimiento`,
    [id, id, id],
  );
  const dependencias = referencias[0];
  if (Number(dependencias.tickets) || Number(dependencias.reportes) || Number(dependencias.seguimiento)) {
    return res.status(409).json({
      mensaje: "La credencial tiene historial asociado y no puede eliminarse sin perder trazabilidad. Desactívela para conservar los registros.",
      dependencias: {
        tickets: Number(dependencias.tickets),
        reportes: Number(dependencias.reportes),
        seguimiento: Number(dependencias.seguimiento),
      },
    });
  }

  const result = await query("DELETE FROM usuarios WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ mensaje: "Usuario no encontrado." });
  return res.json({ mensaje: "Credencial eliminada correctamente." });
});

export default router;
