import { Router } from "express";
import { query, pool } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { mapAnomalyCase } from "../services/anomalyCaseService.js";
import { parsePagination, setPaginationHeaders } from "../utils/pagination.js";

const router = Router();
router.use(requireAuth);

function tieneAlcanceDepartamento(req, caseRow) {
  return ["stt", "apv"].includes(req.auth.role)
    || caseRow.department_ids_json.some((id) => Number(id) === Number(req.auth.departmentId));
}

router.get("/anomalias/casos", async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const values = [];
  let scope = "";
  if (req.auth.role === "jefe-departamento") {
    scope = "AND JSON_CONTAINS(department_ids_json, ?)";
    values.push(JSON.stringify(Number(req.auth.departmentId)));
  }
  const historial = req.query.historial === "true";
  const estadoFiltro = historial ? "" : "AND present = 1";
  const where = `WHERE 1 = 1 ${scope} ${estadoFiltro}`;
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM anomaly_cases ${where}`,
    values,
  );
  const [rows] = await pool.execute(
    `SELECT id, case_key, rule_key, rule_version, type, category, severity, title, detail,
            evidence_json, department_ids_json, action_url, present, status, generation,
            acknowledged_generation, acknowledged_at, acknowledged_by,
            assigned_to, resolution_note, first_seen_at, last_seen_at, resolved_at, updated_at
     FROM anomaly_cases
     ${where}
     ORDER BY FIELD(severity, 'critica', 'alta', 'media', 'baja'), last_seen_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  setPaginationHeaders(res, { page, limit, total });
  return res.json(rows.map(mapAnomalyCase));
});

router.post("/anomalias/casos/marcar-vistas", async (req, res) => {
  const findingIds = [...new Set((Array.isArray(req.body?.findingIds) ? req.body.findingIds : [])
    .filter((id) => typeof id === "string")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= 180))];
  if (findingIds.length === 0 || findingIds.length > 200) {
    return res.status(400).json({ mensaje: "Selecciona entre 1 y 200 alertas válidas para marcar como vistas." });
  }

  const placeholders = findingIds.map(() => "?").join(", ");
  let rows = await query(
    `SELECT id, category, department_ids_json, status, present, generation, acknowledged_generation
     FROM anomaly_cases
     WHERE present = 1
       AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.id')) IN (${placeholders})`,
    findingIds,
  );
  if (rows.length !== findingIds.length) {
    const { reconciliarAnomalias } = await import("../services/anomalyCaseService.js");
    await reconciliarAnomalias();
    rows = await query(
      `SELECT id, category, department_ids_json, status, present, generation, acknowledged_generation
       FROM anomaly_cases
       WHERE present = 1
         AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.id')) IN (${placeholders})`,
      findingIds,
    );
  }
  if (rows.length !== findingIds.length) {
    return res.status(409).json({ mensaje: "Una o más alertas ya no están activas. Actualiza el expediente e inténtalo de nuevo." });
  }

  const ids = rows.map((row) => Number(row.id));
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [lockedRows] = await connection.execute(
      `SELECT id, category, department_ids_json, status, present, generation, acknowledged_generation
       FROM anomaly_cases
       WHERE id IN (${ids.map(() => "?").join(", ")})
       FOR UPDATE`,
      ids,
    );
    if (lockedRows.length !== ids.length || lockedRows.some((row) =>
      !row.present
      || !["edenred", "transacciones"].includes(row.category)
      || !tieneAlcanceDepartamento(req, {
        ...row,
        department_ids_json: typeof row.department_ids_json === "string"
          ? JSON.parse(row.department_ids_json)
          : row.department_ids_json,
      }))) {
      await connection.rollback();
      return res.status(403).json({ mensaje: "Una o más alertas no están disponibles para marcar como vistas." });
    }

    for (const row of lockedRows) {
      if (Number(row.acknowledged_generation) === Number(row.generation)) continue;
      await connection.execute(
        `UPDATE anomaly_cases
         SET status = 'resuelta', acknowledged_generation = generation,
             acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = ?,
             resolved_at = CURRENT_TIMESTAMP,
             resolution_note = 'Marcada como vista; queda atendida para esta generación de la alerta.'
         WHERE id = ?`,
        [Number(req.auth.sub), row.id],
      );
      await connection.execute(
        `INSERT INTO anomaly_case_events
          (case_id, actor_id, event_type, previous_status, next_status, note)
         VALUES (?, ?, 'marked_seen', ?, 'resuelta', 'Marcada como vista; queda atendida para esta generación de la alerta.')`,
        [row.id, Number(req.auth.sub), row.status],
      );
    }
    await connection.commit();
    return res.json({ ok: true, findingIds });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.get("/anomalias/casos/:id/eventos", async (req, res) => {
  const [caseRows] = await pool.execute(
    "SELECT id, department_ids_json FROM anomaly_cases WHERE id = ? LIMIT 1",
    [req.params.id],
  );
  const caseRow = caseRows[0];
  if (!caseRow) return res.status(404).json({ mensaje: "Caso de anomalía no encontrado." });
  caseRow.department_ids_json = typeof caseRow.department_ids_json === "string"
    ? JSON.parse(caseRow.department_ids_json)
    : caseRow.department_ids_json;
  if (!tieneAlcanceDepartamento(req, caseRow)) {
    return res.status(403).json({ mensaje: "No tiene acceso a este caso de anomalía." });
  }
  const [events] = await pool.execute(
    `SELECT e.id, e.event_type, e.previous_status, e.next_status, e.note, e.created_at,
            u.nombre AS actor_name
     FROM anomaly_case_events e
     LEFT JOIN usuarios u ON u.id = e.actor_id
     WHERE e.case_id = ?
     ORDER BY e.created_at DESC, e.id DESC`,
    [req.params.id],
  );
  return res.json(events);
});

router.put("/anomalias/casos/:id/estado", requireRoles("stt", "apv", "jefe-departamento"), async (req, res) => {
  const nextStatus = String(req.body?.estado ?? "");
  const note = typeof req.body?.nota === "string" ? req.body.nota.trim() : "";
  if (!["en_revision", "falso-positivo", "resuelta"].includes(nextStatus)) {
    return res.status(400).json({ mensaje: "El estado solicitado no es válido." });
  }
  if (!note) return res.status(400).json({ mensaje: "Agrega una nota para dejar constancia del cambio." });
  if (note.length > 2000) return res.status(400).json({ mensaje: "La nota no puede superar los 2000 caracteres." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT id, department_ids_json, status, present FROM anomaly_cases WHERE id = ? FOR UPDATE",
      [req.params.id],
    );
    const caseRow = rows[0];
    if (!caseRow) {
      await connection.rollback();
      return res.status(404).json({ mensaje: "Caso de anomalía no encontrado." });
    }
    caseRow.department_ids_json = typeof caseRow.department_ids_json === "string"
      ? JSON.parse(caseRow.department_ids_json)
      : caseRow.department_ids_json;
    if (!tieneAlcanceDepartamento(req, caseRow)) {
      await connection.rollback();
      return res.status(403).json({ mensaje: "No tiene acceso a este caso de anomalía." });
    }
    if (nextStatus === "resuelta" && Boolean(caseRow.present)) {
      await connection.rollback();
      return res.status(409).json({
        mensaje: "La condición todavía está presente. Corrige los datos para que el sistema cierre el caso automáticamente.",
      });
    }
    await connection.execute(
      `UPDATE anomaly_cases
       SET status = ?, resolution_note = ?, assigned_to = ?,
           resolved_at = IF(? IN ('resuelta', 'falso-positivo'), CURRENT_TIMESTAMP, NULL)
       WHERE id = ?`,
      [nextStatus, note, Number(req.auth.sub), nextStatus, caseRow.id],
    );
    await connection.execute(
      `INSERT INTO anomaly_case_events
        (case_id, actor_id, event_type, previous_status, next_status, note)
       VALUES (?, ?, 'status_changed', ?, ?, ?)`,
      [caseRow.id, Number(req.auth.sub), caseRow.status, nextStatus, note],
    );
    await connection.commit();
    return res.json({ ok: true, estado: nextStatus });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.get("/anomalias/estados", async (req, res) => {
  const rows = await query(
    "SELECT anomalia_id, estado, visto, actualizado_at FROM anomalias_estados WHERE usuario_id = ?",
    [req.auth.sub],
  );
  return res.json(Object.fromEntries(rows.map((row) => [
    row.anomalia_id,
    { estado: row.estado, visto: Boolean(row.visto), actualizadoEn: row.actualizado_at },
  ])));
});

router.put("/anomalias/estados/:anomaliaId", async (req, res) => {
  const estado = String(req.body?.estado ?? "");
  if (!["abierta", "resuelta"].includes(estado)) {
    return res.status(400).json({ mensaje: "Estado de anomalía no válido." });
  }
  const visto = req.body?.visto === undefined ? null : (req.body.visto ? 1 : 0);
  await query(
    `INSERT INTO anomalias_estados (usuario_id, anomalia_id, estado, visto)
     VALUES (?, ?, ?, COALESCE(?, 0))
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       visto = COALESCE(VALUES(visto), visto),
       actualizado_at = CURRENT_TIMESTAMP`,
    [req.auth.sub, String(req.params.anomaliaId), estado, visto],
  );
  return res.json({ ok: true, estado, visto: visto === null ? undefined : Boolean(visto) });
});

router.put("/anomalias/estados/:anomaliaId/visto", async (req, res) => {
  await query(
    `INSERT INTO anomalias_estados (usuario_id, anomalia_id, estado, visto)
     VALUES (?, ?, 'abierta', 1)
     ON DUPLICATE KEY UPDATE visto = 1, actualizado_at = CURRENT_TIMESTAMP`,
    [req.auth.sub, String(req.params.anomaliaId)],
  );
  return res.json({ ok: true, visto: true });
});

export default router;
