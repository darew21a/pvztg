import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/notificaciones", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const rows = await query(
    `SELECT id, tipo, titulo, detalle, entidad_tipo, entidad_id, action_url, leida, created_at
     FROM notificaciones
     WHERE usuario_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [Number(req.auth.sub), limit],
  );
  return res.json(rows.map((row) => ({
    id: String(row.id),
    type: row.tipo,
    title: row.titulo,
    detail: row.detalle,
    entityType: row.entidad_tipo,
    entityId: row.entidad_id,
    actionUrl: row.action_url,
    unread: Number(row.leida) !== 1,
    time: row.created_at,
  })));
});

router.put("/notificaciones/leidas", async (req, res) => {
  await query("UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?", [Number(req.auth.sub)]);
  return res.json({ ok: true });
});

router.put("/notificaciones/:id/leida", async (req, res) => {
  const result = await query(
    "UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?",
    [Number(req.params.id), Number(req.auth.sub)],
  );
  if (!result.affectedRows) return res.status(404).json({ mensaje: "Notificación no encontrada." });
  return res.json({ ok: true });
});

router.get("/notificaciones/estados", async (req, res) => {
  const rows = await query(
    "SELECT notificacion_id, visto FROM notificaciones_estados WHERE usuario_id = ?",
    [req.auth.sub],
  );
  return res.json(Object.fromEntries(rows.map((row) => [row.notificacion_id, Boolean(row.visto)])));
});

router.put("/notificaciones/estados/:id", async (req, res) => {
  await query(
    `INSERT INTO notificaciones_estados (usuario_id, notificacion_id, visto)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE visto = 1, actualizado_at = CURRENT_TIMESTAMP`,
    [req.auth.sub, String(req.params.id)],
  );
  return res.json({ ok: true });
});

export default router;
