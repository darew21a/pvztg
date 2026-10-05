import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { query, pool } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { UPLOADS_DIR, uploadFiles, uploadedFileUrl, validateUploadedFileSignatures } from "../middleware/upload.js";
import { getStoredFileUrl } from "../utils/storedFileUrl.js";
import { isDepartmentAllowed, parsePositiveId } from "../policies/accessPolicy.js";
import { parsePagination, setPaginationHeaders } from "../utils/pagination.js";
import { notifyMovementSafely } from "../services/notificationService.js";

const router = Router();
router.use(requireAuth);

function mapReporte(row, unidadesIds = []) {
  return {
    id: String(row.id),
    folio: row.folio,
    tipoReporte: row.tipo_reporte,
    unidadesIds: unidadesIds.map(String),
    autorNombre: row.autor_nombre,
    autorDepartamento: row.autor_departamento,
    departamentoId: row.departamento_id,
    descripcion: row.descripcion,
    gravedad: row.gravedad,
    detalleSiniestro: row.detalle_siniestro,
    involucrados: row.involucrados,
    fechaHechos: row.fecha_hechos,
    lugarHechos: row.lugar_hechos,
    horarioHechos: row.horario_hechos,
    pdfUrl: row.pdf_url,
    fecha: row.created_at,
    estado: row.estado,
    seguimiento: row.seguimiento ?? [],
  };
}

router.get("/reportes", async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const conditions = [];
  const params = [];
  if (req.auth.role === "jefe-departamento") {
    conditions.push("r.departamento_id = ?");
    params.push(req.auth.departmentId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM reportes r ${where}`,
    params,
  );
  const rows = await query(
    `SELECT r.id, r.folio, r.tipo_reporte, r.autor_nombre, r.autor_departamento,
            r.departamento_id,
            r.descripcion, r.gravedad, r.detalle_siniestro, r.involucrados,
            r.fecha_hechos, r.lugar_hechos, r.horario_hechos, r.pdf_url,
            r.created_at, r.estado, GROUP_CONCAT(ru.unidad_id) AS unidades_ids
     FROM reportes r
     LEFT JOIN reporte_unidades ru ON ru.reporte_id = r.id
     ${where}
     GROUP BY r.id
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  setPaginationHeaders(res, { page, limit, total });
  const reporteIds = rows.map((row) => row.id);
  const seguimiento = reporteIds.length
    ? await query(
      `SELECT s.id, s.reporte_id, s.mensaje, s.created_at, u.nombre AS autor_nombre, u.rol AS autor_rol
       FROM reporte_seguimiento s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.reporte_id IN (${reporteIds.map(() => "?").join(", ")})
       ORDER BY s.created_at ASC, s.id ASC`,
      reporteIds,
    )
    : [];
  const seguimientoPorReporte = new Map();
  seguimiento.forEach((item) => {
    const actual = seguimientoPorReporte.get(item.reporte_id) ?? [];
    actual.push({
      id: String(item.id),
      autorTipo: item.autor_rol === "jefe-departamento" ? "departamento" : "administrador",
      autorNombre: item.autor_nombre,
      mensaje: item.mensaje,
      fecha: item.created_at,
    });
    seguimientoPorReporte.set(item.reporte_id, actual);
  });
  return res.json(rows.map((row) => mapReporte(
    { ...row, seguimiento: seguimientoPorReporte.get(row.id) ?? [] },
    row.unidades_ids ? row.unidades_ids.split(",") : [],
  )));
});

router.post("/reportes", uploadFiles.single("incidentPdf"), validateUploadedFileSignatures, async (req, res) => {
  const {
    tipoReporte, descripcion,
    gravedad, detalleSiniestro, involucrados, fechaHechos, lugarHechos,
    horarioHechos, pdfUrl,
  } = req.body ?? {};
  const unidadesIdsValue = req.body?.unidadesIds ?? req.body?.["unidadesIds[]"] ?? [];
  const unidadesIds = Array.isArray(unidadesIdsValue) ? unidadesIdsValue : [unidadesIdsValue];
  const uploadedPdfUrl = getStoredFileUrl(uploadedFileUrl(req.file), pdfUrl);
  if (uploadedPdfUrl === undefined) {
    return res.status(400).json({ mensaje: "El comprobante debe ser un archivo válido subido al servidor." });
  }

  if (!Array.isArray(unidadesIds) || unidadesIds.length === 0 || !descripcion) {
    return res.status(400).json({ mensaje: "Unidades y descripción son obligatorios." });
  }

  const unidadIdsNumericas = [...new Set(unidadesIds.map(Number))];
  if (unidadIdsNumericas.some((id) => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ mensaje: "Las unidades seleccionadas no son válidas." });
  }
  const placeholders = unidadIdsNumericas.map(() => "?").join(", ");
  const unidades = await query(
    `SELECT id, departamento_id FROM unidades WHERE activo = 1 AND id IN (${placeholders})`,
    unidadIdsNumericas,
  );
  if (unidades.length !== unidadIdsNumericas.length) {
    return res.status(400).json({ mensaje: "Una o más unidades no existen o están inactivas." });
  }
  if (unidades.some((unidad) => !isDepartmentAllowed(req.auth, unidad.departamento_id))) {
    return res.status(403).json({ mensaje: "No tiene permisos sobre una de las unidades seleccionadas." });
  }

  const folio = `PVZTG-${Date.now().toString(36).toUpperCase()}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO reportes
       (folio, titulo, descripcion, estado, tipo_reporte, autor_nombre, autor_departamento, departamento_id, creado_por,
        gravedad, detalle_siniestro, involucrados, fecha_hechos, lugar_hechos, horario_hechos, pdf_url)
       VALUES (?, ?, ?, 'recibido', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        folio, detalleSiniestro || tipoReporte || "Reporte", descripcion, tipoReporte || "siniestro",
        req.auth.name || req.auth.username, req.auth.departmentId ?? null, req.auth.departmentId ?? null, Number(req.auth.sub),
        gravedad || null, detalleSiniestro || null,
        involucrados || null, fechaHechos || null, lugarHechos || null, horarioHechos || null, uploadedPdfUrl || null,
      ],
    );
    for (const unidadId of unidadIdsNumericas) {
      await connection.execute("INSERT INTO reporte_unidades (reporte_id, unidad_id) VALUES (?, ?)", [result.insertId, unidadId]);
    }
    await connection.commit();
    await notifyMovementSafely({
      actorId: req.auth.sub,
      departmentId: req.auth.departmentId,
      type: "reporte-creado",
      title: "Nuevo reporte registrado",
      detail: `${folio} fue registrado por ${req.auth.name || req.auth.username}.`,
      entityType: "reporte",
      entityId: result.insertId,
    });
    return res.status(201).json({ id: result.insertId, folio, pdfUrl: uploadedPdfUrl, mensaje: "Reporte registrado correctamente." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.patch("/reportes/:id", requireRoles("stt", "apv"), async (req, res) => {
  const reporteId = parsePositiveId(req.params.id);
  if (!reporteId) return res.status(400).json({ mensaje: "El identificador del reporte no es válido." });
  const allowed = { estado: "estado", pdfUrl: "pdf_url" };
  const entries = Object.entries(allowed).filter(([key]) => req.body?.[key] !== undefined);
  if (!entries.length) return res.status(400).json({ mensaje: "No se recibieron cambios." });
  if (req.body.pdfUrl !== undefined && getStoredFileUrl(null, req.body.pdfUrl) === undefined) {
    return res.status(400).json({ mensaje: "El comprobante debe ser un archivo válido subido al servidor." });
  }
  if (req.body.estado !== undefined && !["recibido", "en-revision", "en-atencion", "resuelto"].includes(req.body.estado)) {
    return res.status(400).json({ mensaje: "Estado de reporte no válido." });
  }
  const values = entries.map(([, key]) => req.body[key]);
  values.push(reporteId);
  const result = await query(`UPDATE reportes SET ${entries.map(([, key]) => `${key} = ?`).join(", ")} WHERE id = ?`, values);
  if (!result.affectedRows) return res.status(404).json({ mensaje: "Reporte no encontrado." });
  const [reportRows] = await pool.query("SELECT departamento_id, folio FROM reportes WHERE id = ? LIMIT 1", [reporteId]);
  await notifyMovementSafely({
    actorId: req.auth.sub,
    departmentId: reportRows[0]?.departamento_id ?? null,
    type: "reporte-actualizado",
    title: "Reporte actualizado",
    detail: `${reportRows[0]?.folio ?? `Reporte ${reporteId}`} cambió a ${req.body.estado ?? "un nuevo estado"}.`,
    entityType: "reporte",
    entityId: reporteId,
  });
  return res.json({ mensaje: "Reporte actualizado correctamente." });
});

router.delete("/reportes/:id", requireRoles("stt", "apv"), async (req, res) => {
  const reporteId = parsePositiveId(req.params.id);
  if (!reporteId) return res.status(400).json({ mensaje: "El identificador del reporte no es válido." });

  const [reportRows] = await pool.query(
    "SELECT id, folio, pdf_url, departamento_id FROM reportes WHERE id = ? LIMIT 1",
    [reporteId],
  );
  const reporte = reportRows[0];
  if (!reporte) return res.status(404).json({ mensaje: "Reporte no encontrado." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM reporte_seguimiento WHERE reporte_id = ?", [reporteId]);
    await connection.execute("DELETE FROM reporte_unidades WHERE reporte_id = ?", [reporteId]);
    await connection.execute("DELETE FROM reportes WHERE id = ?", [reporteId]);
    await connection.commit();

    let archivoEliminado = true;
    if (reporte.pdf_url) {
      const match = String(reporte.pdf_url).match(/^\/api\/uploads\/([a-f0-9-]+)\.(pdf|jpg|png)$/i);
      if (match) {
        try {
          await fs.unlink(path.join(UPLOADS_DIR, `${match[1]}.${match[2].toLowerCase()}`));
        } catch (error) {
          if (error.code !== "ENOENT") {
            archivoEliminado = false;
            console.error(`No fue posible eliminar el PDF del reporte ${reporteId}:`, error.message);
          }
        }
      }
    }

    await notifyMovementSafely({
      actorId: req.auth.sub,
      departmentId: reporte.departamento_id,
      type: "reporte-eliminado",
      title: "Reporte eliminado",
      detail: `${reporte.folio} fue eliminado por ${req.auth.name || req.auth.username}.`,
      entityType: "reporte",
      entityId: reporteId,
    });

    return res.json({
      mensaje: archivoEliminado
        ? "Reporte eliminado correctamente."
        : "Reporte eliminado de la base de datos, pero no fue posible eliminar su archivo PDF.",
      id: reporteId,
      archivoEliminado,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/reportes/:id/seguimiento", requireRoles("stt", "apv", "jefe-departamento"), async (req, res) => {
  const reporteId = parsePositiveId(req.params.id);
  if (!reporteId) return res.status(400).json({ mensaje: "El identificador del reporte no es válido." });
  const mensaje = String(req.body?.mensaje ?? "").trim();
  if (!mensaje || mensaje.length > 5000) {
    return res.status(400).json({ mensaje: "El mensaje es obligatorio y no puede exceder 5000 caracteres." });
  }
  const reportes = await query(
    `SELECT id, departamento_id FROM reportes WHERE id = ? LIMIT 1`,
    [reporteId],
  );
  const reporte = reportes[0];
  if (!reporte) return res.status(404).json({ mensaje: "Reporte no encontrado." });
  if (!isDepartmentAllowed(req.auth, reporte.departamento_id)) {
    return res.status(403).json({ mensaje: "No tiene permisos sobre este reporte." });
  }
  const result = await query(
    "INSERT INTO reporte_seguimiento (reporte_id, usuario_id, mensaje) VALUES (?, ?, ?)",
    [reporteId, Number(req.auth.sub), mensaje],
  );
  await notifyMovementSafely({
    actorId: req.auth.sub,
    departmentId: reporte.departamento_id,
    type: "reporte-seguimiento",
    title: "Nuevo seguimiento de reporte",
    detail: `Se agregó una respuesta al reporte ${reporteId}.`,
    entityType: "reporte",
    entityId: reporteId,
  });
  return res.status(201).json({
    id: String(result.insertId),
    autorTipo: req.auth.role === "jefe-departamento" ? "departamento" : "administrador",
    autorNombre: req.auth.name || req.auth.username,
    mensaje,
    fecha: new Date().toISOString(),
  });
});

export default router;
