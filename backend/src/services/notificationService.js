import { query } from "../config/db.js";

export async function notifyMovement({
  actorId,
  departmentId = null,
  type,
  title,
  detail,
  entityType = null,
  entityId = null,
}) {
  const recipients = await query(
    `SELECT id
     FROM usuarios
     WHERE activo = 1
       AND id <> ?
       AND (
         rol IN ('stt', 'apv')
         OR (rol = 'jefe-departamento' AND (? IS NULL OR departamento_id = ?))
       )`,
    [Number(actorId), departmentId, departmentId],
  );

  if (recipients.length === 0) return;

  const values = [];
  const placeholders = recipients.map((recipient) => {
    values.push(
      Number(recipient.id),
      type,
      title,
      detail,
      entityType,
      entityId == null ? null : String(entityId),
      Number(actorId),
    );
    return "(?, ?, ?, ?, ?, ?, ?)";
  }).join(", ");

  await query(
    `INSERT INTO notificaciones
      (usuario_id, tipo, titulo, detalle, entidad_tipo, entidad_id, creado_por)
     VALUES ${placeholders}`,
    values,
  );
}

export async function notifyMovementSafely(payload) {
  try {
    await notifyMovement(payload);
  } catch (error) {
    console.error("No fue posible registrar la notificación del movimiento.", error);
  }
}
