import { createHash } from "node:crypto";
import { pool } from "../config/db.js";
import { detectarAnomaliasFlota } from "../../../shared/anomalyRules.js";

let reconciliationTimer;
let reconciliationPromise;
let reconciliationRequestedAgain = false;
let retryDelayMs = 1000;

function parseJson(value, fallback) {
  if (typeof value === "string") return JSON.parse(value);
  return value ?? fallback;
}

function getCaseKey(finding) {
  return createHash("sha256")
    .update(`${finding.regla}\0${finding.id}`)
    .digest("hex");
}

function getActionUrl(finding) {
  if (finding.unidadIds.length > 0) {
    const unitIds = [...new Set(finding.unidadIds)].map(encodeURIComponent).join(",");
    const unidad = finding.targetId == null ? "" : `&unidad=${encodeURIComponent(finding.targetId)}`;
    return `/indice-unidades?anomaly=${encodeURIComponent(finding.id)}&unidadesAnomalia=${unitIds}${unidad}`;
  }
  const parametro = finding.parametro ?? "unidad";
  const destino = finding.ruta ?? "/dashboard";
  return finding.targetId == null
    ? destino
    : `${destino}?${encodeURIComponent(parametro)}=${encodeURIComponent(finding.targetId)}&anomaly=${encodeURIComponent(finding.id)}`;
}

function mapUnit(row) {
  return {
    id: String(row.id),
    economico: row.economico,
    placas: row.placas,
    placas2025: row.placas_2025,
    placasVigentesAnio: row.placas_vigentes_anio,
    marca: row.marca,
    submarca: row.submarca,
    tipo: row.tipo,
    modelo: row.modelo,
    numeroSerie: row.numero_serie,
    departamentoId: row.departamento_id,
    kilometraje: row.kilometraje,
    tipoCombustible: row.tipo_combustible,
    estado: row.estado,
    conductorAsignado: row.conductor_asignado,
    rpeResguardante: row.rpe_resguardante,
    resguardante2: row.resguardante_2,
    requiereResguardante2: Boolean(row.requiere_resguardante_2),
    centroGestor: row.centro_gestor,
    centroCostos: row.centro_costos,
    ubicacionTecnica: row.ubicacion_tecnica,
    arrendadora: row.arrendadora,
    activo: Boolean(row.activo),
  };
}

function mapFinding(finding) {
  return {
    ...finding,
    unidadIds: (finding.unidadIds ?? []).map(String),
    targetId: finding.targetId == null ? null : String(finding.targetId),
    departamentoIds: (finding.departamentoIds ?? []).map(Number),
    entityType: finding.unidadIds?.length ? "unidad" : (finding.tipo.includes("edenred") || finding.tipo === "transaccion-atipica" ? "edenred" : null),
    entityId: finding.targetId == null ? null : String(finding.targetId),
  };
}

async function addEvent(connection, { caseId, actorId = null, eventType, previousStatus = null, nextStatus = null, note = null }) {
  await connection.execute(
    `INSERT INTO anomaly_case_events
       (case_id, actor_id, event_type, previous_status, next_status, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [caseId, actorId, eventType, previousStatus, nextStatus, note],
  );
}

async function notifyCaseOpened(connection, finding, caseId, generation) {
  const departments = [...new Set(finding.departamentoIds.map((id) => Number(id)).filter(Number.isSafeInteger))];
  const [recipients] = await connection.execute(
    `SELECT id, rol, departamento_id
     FROM usuarios
     WHERE activo = 1
       AND rol IN ('stt', 'apv', 'jefe-departamento')`,
  );
  const dedupeKey = `anomaly:${caseId}:opened:${generation}`;
  const detail = `${finding.detalle} ${finding.suggestion ?? ""}`.trim();
  const actionUrl = getActionUrl(finding, caseId);

  for (const recipient of recipients) {
    if (!["stt", "apv"].includes(recipient.rol)
      && (!recipient.departamento_id || !departments.includes(Number(recipient.departamento_id)))) continue;
    await connection.execute(
      `INSERT IGNORE INTO notificaciones
        (usuario_id, tipo, titulo, detalle, entidad_tipo, entidad_id, dedupe_key, action_url)
       VALUES (?, 'anomalia', ?, ?, 'anomalia', ?, ?, ?)`,
      [recipient.id, finding.titulo, detail, String(caseId), `${dedupeKey}:user:${recipient.id}`, actionUrl],
    );
  }
  return actionUrl;
}

export function reconciliarAnomalias() {
  if (reconciliationPromise) {
    reconciliationRequestedAgain = true;
    return reconciliationPromise;
  }
  reconciliationPromise = (async () => {
    do {
      reconciliationRequestedAgain = false;
      await ejecutarReconciliacionAnomalias();
    } while (reconciliationRequestedAgain);
  })().finally(() => {
    reconciliationPromise = undefined;
  });
  return reconciliationPromise;
}

async function ejecutarReconciliacionAnomalias() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [syncRows] = await connection.execute(
      "SELECT initialized FROM anomaly_reconciliation WHERE id = 1 FOR UPDATE",
    );
    if (!syncRows[0]) throw new Error("No existe el control de inicialización de anomalías.");
    const baseline = !syncRows[0].initialized;

    const [unitRows] = await connection.execute(
      `SELECT id, economico, placas, placas_2025, placas_vigentes_anio, marca, submarca, tipo, modelo,
              numero_serie, departamento_id, kilometraje, tipo_combustible, estado,
              conductor_asignado, resguardante_2, requiere_resguardante_2, rpe_resguardante, centro_gestor, centro_costos,
              ubicacion_tecnica, arrendadora, activo
       FROM unidades
       WHERE activo = 1`,
    );
    const [cargaRows] = await connection.execute(
      `SELECT id, transacciones_json, resumen_json
       FROM cargas_edenred
       WHERE eliminado = 0`,
    );
    const unidades = unitRows.map(mapUnit);
    const cargas = cargaRows.map((row) => ({
      id: row.id,
      transacciones: parseJson(row.transacciones_json, []),
      resumenAplicado: parseJson(row.resumen_json, []),
    }));
    const findings = detectarAnomaliasFlota(unidades, cargas).map(mapFinding);
    const currentByKey = new Map(findings.map((finding) => [getCaseKey(finding), finding]));
    const [existingRows] = await connection.execute(
      "SELECT id, case_key, present, status, generation FROM anomaly_cases FOR UPDATE",
    );
    const existingByKey = new Map(existingRows.map((row) => [row.case_key, row]));

    for (const [caseKey, finding] of currentByKey) {
      const previous = existingByKey.get(caseKey);
      const evidence = JSON.stringify(finding);
      if (!previous) {
        const [result] = await connection.execute(
          `INSERT INTO anomaly_cases
            (case_key, rule_key, rule_version, type, category, severity, title, detail,
             evidence_json, entity_type, entity_id, department_ids_json, action_url, target_id,
             present, status, generation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'nueva', 1)`,
          [
            caseKey, finding.regla, finding.versionRegla, finding.tipo, finding.categoria,
            finding.severidad, finding.titulo, finding.detalle, evidence,
            finding.entityType, finding.entityId, JSON.stringify(finding.departamentoIds),
            getActionUrl(finding), finding.targetId,
          ],
        );
        const caseId = String(result.insertId);
        const actionUrl = getActionUrl(finding, caseId);
        await connection.execute("UPDATE anomaly_cases SET action_url = ? WHERE id = ?", [actionUrl, caseId]);
        await addEvent(connection, {
          caseId,
          eventType: baseline ? "baseline_detected" : "detected",
          nextStatus: "nueva",
          note: baseline ? "Caso importado durante el establecimiento inicial del catálogo." : null,
        });
        if (!baseline) await notifyCaseOpened(connection, finding, caseId, 1);
        continue;
      }

      const wasAbsent = !previous.present;
      const generation = Number(previous.generation) + (wasAbsent ? 1 : 0);
      const nextStatus = wasAbsent ? "nueva" : previous.status;
      await connection.execute(
        `UPDATE anomaly_cases
         SET rule_version = ?, type = ?, category = ?, severity = ?, title = ?, detail = ?,
             evidence_json = ?, entity_type = ?, entity_id = ?, department_ids_json = ?,
             action_url = ?, target_id = ?, present = 1, status = ?, generation = ?,
             first_seen_at = IF(?, CURRENT_TIMESTAMP, first_seen_at),
             last_seen_at = CURRENT_TIMESTAMP,
             resolved_at = IF(?, NULL, resolved_at),
             resolution_note = IF(?, NULL, resolution_note)
         WHERE id = ?`,
        [
          finding.versionRegla, finding.tipo, finding.categoria, finding.severidad,
          finding.titulo, finding.detalle, evidence, finding.entityType, finding.entityId,
          JSON.stringify(finding.departamentoIds),
          getActionUrl(finding),
          finding.targetId, nextStatus, generation, wasAbsent ? 1 : 0,
          wasAbsent ? 1 : 0, wasAbsent ? 1 : 0, previous.id,
        ],
      );
      if (wasAbsent) {
        await addEvent(connection, {
          caseId: previous.id,
          eventType: "reopened",
          previousStatus: previous.status,
          nextStatus: "nueva",
          note: "La condición volvió a detectarse después de haber desaparecido.",
        });
        await notifyCaseOpened(connection, finding, String(previous.id), generation);
      }
    }

    for (const previous of existingRows) {
      if (!previous.present || currentByKey.has(previous.case_key)) continue;
      const estadoAnterior = previous.status;
      const estadoSiguiente = ["resuelta", "falso-positivo"].includes(estadoAnterior) ? estadoAnterior : "resuelta";
      await connection.execute(
        `UPDATE anomaly_cases
         SET present = 0, status = ?, resolved_at = CURRENT_TIMESTAMP,
             resolution_note = IF(?, resolution_note, 'La condición dejó de detectarse al revisar los datos actuales.')
         WHERE id = ?`,
        [estadoSiguiente, estadoSiguiente === estadoAnterior ? 1 : 0, previous.id],
      );
      await addEvent(connection, {
        caseId: previous.id,
        eventType: "condition_cleared",
        previousStatus: estadoAnterior,
        nextStatus: estadoSiguiente,
        note: estadoSiguiente === estadoAnterior ? null : "La condición dejó de detectarse al revisar los datos actuales.",
      });
    }

    await connection.execute(
      "UPDATE anomaly_reconciliation SET initialized = 1, last_run_at = CURRENT_TIMESTAMP WHERE id = 1",
    );
    await connection.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("No fue posible revertir la reconciliación de anomalías.", rollbackError);
      }
    }
    throw error;
  } finally {
    connection?.release();
  }
}

export function programarReconciliacionAnomalias() {
  if (reconciliationTimer) return;
  reconciliationTimer = setTimeout(async () => {
    reconciliationTimer = undefined;
    try {
      await reconciliarAnomalias();
      retryDelayMs = 1000;
    } catch (error) {
      console.error("No fue posible sincronizar los casos de anomalías.", error);
      const delay = retryDelayMs;
      retryDelayMs = Math.min(retryDelayMs * 2, 60000);
      reconciliationTimer = setTimeout(() => {
        reconciliationTimer = undefined;
        programarReconciliacionAnomalias();
      }, delay);
      reconciliationTimer.unref?.();
    }
  }, 300);
  reconciliationTimer.unref?.();
}

export function mapAnomalyCase(row) {
  return {
    id: String(row.id),
    key: row.case_key,
    rule: row.rule_key,
    ruleVersion: Number(row.rule_version),
    type: row.type,
    category: row.category,
    severity: row.severity,
    title: row.title,
    detail: row.detail,
    evidence: parseJson(row.evidence_json, {}),
    departmentIds: parseJson(row.department_ids_json, []),
    actionUrl: row.action_url,
    present: Boolean(row.present),
    status: row.status,
    generation: Number(row.generation),
    acknowledged: Number(row.acknowledged_generation) === Number(row.generation),
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by == null ? null : String(row.acknowledged_by),
    assignedTo: row.assigned_to == null ? null : String(row.assigned_to),
    resolutionNote: row.resolution_note,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  };
}
