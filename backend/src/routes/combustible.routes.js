import { Router } from "express";
import { query, pool } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { uploadFiles, uploadedFileUrl, validateUploadedFileSignatures } from "../middleware/upload.js";
import { getStoredFileUrl } from "../utils/storedFileUrl.js";
import { isDepartmentAllowed, parsePositiveId } from "../policies/accessPolicy.js";
import { parsePagination, setPaginationHeaders } from "../utils/pagination.js";
import { notifyMovementSafely } from "../services/notificationService.js";

const router = Router();
router.use(requireAuth);

function mapTicket(row) {
  return {
    id: String(row.id),
    unidadId: String(row.unidad_id),
    fechaHora: row.fecha_hora,
    litros: Number(row.litros),
    importe: Number(row.importe),
    urlTicketBomba: row.url_ticket_bomba,
    urlTicketEdenred: row.url_ticket_edenred,
    urlPdfFusionado: row.url_pdf_fusionado,
    subidoPor: row.subido_por_nombre ?? row.subido_por,
    economico: row.economico,
    departamento: row.departamento,
  };
}

router.get("/tickets-combustible", async (req, res) => {
  const { unidadId, departamentoId, anio, mes, search } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  const conditions = ["u.activo = 1"];
  const params = [];
  if (req.auth.role === "jefe-departamento") {
    conditions.push("u.departamento_id = ?");
    params.push(req.auth.departmentId);
  } else if (departamentoId) {
    const departamentoIdNumerico = parsePositiveId(departamentoId);
    if (!departamentoIdNumerico) return res.status(400).json({ mensaje: "El identificador del departamento no es válido." });
    conditions.push("u.departamento_id = ?");
    params.push(departamentoIdNumerico);
  }
  if (unidadId) {
    const unidadIdNumerica = parsePositiveId(unidadId);
    if (!unidadIdNumerica) return res.status(400).json({ mensaje: "El identificador de la unidad no es válido." });
    conditions.push("t.unidad_id = ?");
    params.push(unidadIdNumerica);
  }
  if (anio) {
    const anioNumerico = Number(anio);
    if (!Number.isInteger(anioNumerico) || anioNumerico < 2000 || anioNumerico > 2200) {
      return res.status(400).json({ mensaje: "El año no es válido." });
    }
    conditions.push("YEAR(t.fecha_hora) = ?");
    params.push(anioNumerico);
  }
  if (mes) {
    const mesNumerico = Number(mes);
    if (!Number.isInteger(mesNumerico) || mesNumerico < 1 || mesNumerico > 12) {
      return res.status(400).json({ mensaje: "El mes no es válido." });
    }
    conditions.push("MONTH(t.fecha_hora) = ?");
    params.push(mesNumerico);
  }
  const texto = String(search ?? "").trim();
  if (texto) {
    conditions.push("(u.economico LIKE ? OR u.placas LIKE ? OR t.url_ticket_bomba LIKE ?)");
    params.push(...Array(3).fill(`%${texto}%`));
  }

  const where = conditions.join(" AND ");
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tickets_combustible t
     JOIN unidades u ON u.id = t.unidad_id
     WHERE ${where}`,
    params,
  );
  const rows = await query(
    `SELECT t.*, u.economico, d.nombre AS departamento, usr.nombre AS subido_por_nombre
     FROM tickets_combustible t
     JOIN unidades u ON u.id = t.unidad_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     LEFT JOIN usuarios usr ON usr.id = t.subido_por
     WHERE ${where}
     ORDER BY t.fecha_hora DESC, t.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  setPaginationHeaders(res, { page, limit, total });
  return res.json(rows.map(mapTicket));
});

router.post("/tickets-combustible", requireRoles("stt", "apv", "jefe-departamento"), uploadFiles.fields([
  { name: "ticketBomba", maxCount: 1 },
  { name: "ticketEdenred", maxCount: 1 },
  { name: "pdfFusionado", maxCount: 1 },
]), validateUploadedFileSignatures, async (req, res) => {
  const {
    unidadId, fechaHora, litros, importe, urlTicketBomba,
    urlTicketEdenred, urlPdfFusionado,
  } = req.body ?? {};
  const files = req.files ?? {};
  const ticketBombaUrl = getStoredFileUrl(uploadedFileUrl(files.ticketBomba?.[0]), urlTicketBomba);
  const ticketEdenredUrl = getStoredFileUrl(uploadedFileUrl(files.ticketEdenred?.[0]), urlTicketEdenred);
  const pdfFusionadoUrl = getStoredFileUrl(uploadedFileUrl(files.pdfFusionado?.[0]), urlPdfFusionado);

  if (!unidadId || !fechaHora || !ticketBombaUrl || Number(litros) <= 0 || Number(importe) < 0) {
    return res.status(400).json({ mensaje: "Unidad, fecha, litros, importe y Ticket Bomba son obligatorios." });
  }

  const unidadIdNumerica = parsePositiveId(unidadId);
  if (!unidadIdNumerica) return res.status(400).json({ mensaje: "El identificador de la unidad no es válido." });
  const unidades = await query(
    "SELECT id, departamento_id FROM unidades WHERE id = ? AND activo = 1 LIMIT 1",
    [unidadIdNumerica],
  );
  const unidad = unidades[0];
  if (!unidad) return res.status(404).json({ mensaje: "La unidad no existe o está inactiva." });
  if (!isDepartmentAllowed(req.auth, unidad.departamento_id)) {
    return res.status(403).json({ mensaje: "No tiene permisos sobre la unidad seleccionada." });
  }
  if ([ticketBombaUrl, ticketEdenredUrl, pdfFusionadoUrl].some((value) => value === undefined)) {
    return res.status(400).json({ mensaje: "Los comprobantes deben ser archivos válidos subidos al servidor." });
  }

  const result = await query(
    `INSERT INTO tickets_combustible
      (unidad_id, fecha_hora, litros, importe, url_ticket_bomba, url_ticket_edenred, url_pdf_fusionado, subido_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      unidadIdNumerica, new Date(fechaHora), Number(litros), Number(importe),
      String(ticketBombaUrl), ticketEdenredUrl || null, pdfFusionadoUrl || null,
      Number(req.auth.sub),
    ],
  );
  await notifyMovementSafely({
    actorId: req.auth.sub,
    departmentId: unidad.departamento_id,
    type: "combustible-registrado",
    title: "Nuevo movimiento de combustible",
    detail: `Se registró una recarga para la unidad ${unidadIdNumerica}.`,
    entityType: "ticket-combustible",
    entityId: result.insertId,
  });
  return res.status(201).json({
    id: result.insertId,
    urlTicketBomba: ticketBombaUrl,
    urlTicketEdenred: ticketEdenredUrl,
    urlPdfFusionado: pdfFusionadoUrl,
    mensaje: "Recarga registrada correctamente.",
  });
});

export default router;
