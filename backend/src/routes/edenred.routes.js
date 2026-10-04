import { Router } from "express";
import crypto from "node:crypto";
import { pool, query } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { parsePositiveId } from "../policies/accessPolicy.js";
import { parsePagination, setPaginationHeaders } from "../utils/pagination.js";
import { notifyMovementSafely } from "../services/notificationService.js";
import { hashJson } from "../utils/hashJson.js";
import { programarReconciliacionAnomalias } from "../services/anomalyCaseService.js";

const router = Router();
router.use(requireAuth);

function mapCarga(row) {
  const read = (value) => typeof value === "string" ? JSON.parse(value) : (value ?? []);
  return { id: row.id, fechaCarga: row.created_at, periodo: read(row.periodo_json), transacciones: read(row.transacciones_json), resumenAplicado: read(row.resumen_json) };
}

router.get("/edenred/cargas", async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM cargas_edenred WHERE eliminado = 0");
  const rows = await query(
    "SELECT id, periodo_json, transacciones_json, resumen_json, created_at FROM cargas_edenred WHERE eliminado = 0 ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
    [limit, offset],
  );
  setPaginationHeaders(res, { page, limit, total });
  return res.json(rows.map(mapCarga));
});

router.get("/edenred/cargas/:archivoHash", requireRoles("stt", "apv"), async (req, res) => {
  if (!/^[a-f0-9]{64}$/i.test(req.params.archivoHash)) {
    return res.status(400).json({ mensaje: "El hash del archivo Edenred no es válido." });
  }
  const [rows] = await pool.query(
    "SELECT id, created_at FROM cargas_edenred WHERE archivo_hash = ? AND eliminado = 0 LIMIT 1",
    [req.params.archivoHash.toLowerCase()],
  );
  return res.json({ yaCargado: Boolean(rows[0]), carga: rows[0] ?? null });
});

router.delete("/edenred/cargas/:id", requireRoles("stt", "apv"), async (req, res) => {
  const cargaId = String(req.params.id ?? "").trim();
  if (!cargaId || cargaId.length > 64) {
    return res.status(400).json({ mensaje: "El identificador del reporte no es válido." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cargas] = await connection.execute(
      "SELECT id, resumen_json FROM cargas_edenred WHERE id = ? AND eliminado = 0 LIMIT 1 FOR UPDATE",
      [cargaId],
    );
    if (!cargas[0]) {
      await connection.rollback();
      return res.status(404).json({ mensaje: "El reporte ya no existe o ya fue eliminado." });
    }

    const resumen = typeof cargas[0].resumen_json === "string"
      ? JSON.parse(cargas[0].resumen_json)
      : (cargas[0].resumen_json ?? []);
    if (!Array.isArray(resumen)) throw new Error("El resumen del reporte no tiene un formato válido.");
    await connection.execute("UPDATE cargas_edenred SET eliminado = 1 WHERE id = ?", [cargaId]);
    const [cargasHistoricas] = await connection.execute(
      "SELECT resumen_json, eliminado, aplicado_at, created_at FROM cargas_edenred ORDER BY aplicado_at ASC, created_at ASC, id ASC",
    );
    const contribucionesPorUnidad = new Map();
    for (const carga of cargasHistoricas) {
      const elementos = typeof carga.resumen_json === "string" ? JSON.parse(carga.resumen_json) : carga.resumen_json;
      if (!Array.isArray(elementos)) continue;
      for (const elemento of elementos) {
        const unidadId = parsePositiveId(elemento?.unidadId);
        if (!unidadId) continue;
        const contribuciones = contribucionesPorUnidad.get(String(unidadId)) ?? [];
        contribuciones.push({ ...elemento, eliminado: Boolean(carga.eliminado), fechaCarga: carga.created_at });
        contribucionesPorUnidad.set(String(unidadId), contribuciones);
      }
    }

    for (const item of resumen) {
      const unidadId = parsePositiveId(item?.unidadId);
      if (!unidadId) continue;
      const [unidades] = await connection.execute(
        "SELECT historial_json, kilometraje, tipo_combustible FROM unidades WHERE id = ? LIMIT 1 FOR UPDATE",
        [unidadId],
      );
      if (!unidades[0]) continue;

      const historial = typeof unidades[0].historial_json === "string"
        ? JSON.parse(unidades[0].historial_json)
        : (unidades[0].historial_json ?? []);
      const siguiente = Array.isArray(historial)
        ? historial
          .map((registro) => registro.mes === item.mes
            ? {
              ...registro,
              km: Number(registro.km || 0) - Number(item.km || 0),
              litros: Number(registro.litros || 0) - Number(item.litros || 0),
              importe: Number(registro.importe || 0) - Number(item.importe || 0),
            }
            : registro)
          .filter((registro) => Number(registro.km || 0) !== 0 || Number(registro.litros || 0) !== 0 || Number(registro.importe || 0) !== 0)
        : [];
      const kilometrajeActual = Number(unidades[0].kilometraje || 0);
      const kilometrajeAplicado = Number(item.kilometrajeAplicado || 0);
      let kilometraje = kilometrajeActual;
      let tipoCombustible = unidades[0].tipo_combustible;
      const contribuciones = contribucionesPorUnidad.get(String(unidadId)) ?? [];
      if (kilometrajeAplicado > 0 && kilometrajeActual === kilometrajeAplicado) {
        const vigentes = contribuciones.filter((contribucion) => !contribucion.eliminado);
        const baseKilometraje = Number(contribuciones[0]?.kilometrajeAnterior ?? 0);
        kilometraje = Math.max(baseKilometraje, ...vigentes.map((contribucion) => Number(contribucion.kilometrajeAplicado || 0)));
      }
      if (item.tipoCombustible && unidades[0].tipo_combustible === item.tipoCombustible) {
        const vigentes = contribuciones.filter((contribucion) => !contribucion.eliminado && contribucion.tipoCombustible);
        tipoCombustible = vigentes.at(-1)?.tipoCombustible ?? contribuciones[0]?.tipoCombustibleAnterior ?? null;
      }
      await connection.execute(
        "UPDATE unidades SET historial_json = ?, kilometraje = ?, tipo_combustible = ? WHERE id = ?",
        [JSON.stringify(siguiente), kilometraje, tipoCombustible, unidadId],
      );
    }

    await connection.commit();
    programarReconciliacionAnomalias();
    return res.json({ mensaje: "Reporte de Edenred eliminado correctamente.", id: cargaId });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/edenred/cargas/verificar", requireRoles("stt", "apv"), async (req, res) => {
  const transacciones = req.body?.transacciones;
  if (!Array.isArray(transacciones)) return res.status(400).json({ mensaje: "Las transacciones no tienen un formato válido." });
  const hashes = transacciones.map(hashJson);
  const [rows] = await pool.query("SELECT transacciones_hashes_json, transacciones_json FROM cargas_edenred WHERE eliminado = 0");
  const anteriores = new Set();
  for (const row of rows) {
    const guardados = typeof row.transacciones_hashes_json === "string" ? JSON.parse(row.transacciones_hashes_json) : row.transacciones_hashes_json;
    if (Array.isArray(guardados)) guardados.forEach((hash) => anteriores.add(hash));
    if (!Array.isArray(guardados)) {
      const crudas = typeof row.transacciones_json === "string" ? JSON.parse(row.transacciones_json) : row.transacciones_json;
      if (Array.isArray(crudas)) crudas.map(hashJson).forEach((hash) => anteriores.add(hash));
    }
  }
  return res.json({ transaccionesRepetidas: hashes.filter((hash) => anteriores.has(hash)).length });
});

router.post("/edenred/cargas", requireRoles("stt", "apv"), async (req, res) => {
  const { periodo = [], transacciones = [], resumenAplicado = [], archivoHash } = req.body ?? {};
  if (!Array.isArray(periodo) || !Array.isArray(transacciones) || !Array.isArray(resumenAplicado)) {
    return res.status(400).json({ mensaje: "Los datos de la carga Edenred no tienen un formato válido." });
  }
  const elementos = resumenAplicado.map((item) => ({
    ...item,
    unidadId: parsePositiveId(item?.unidadId),
  }));
  if (elementos.some((item) => !item.unidadId)) {
    return res.status(400).json({ mensaje: "La carga contiene una unidad no válida." });
  }
  const hashArchivo = /^[a-f0-9]{64}$/i.test(String(archivoHash ?? ""))
    ? String(archivoHash).toLowerCase()
    : hashJson({ periodo, transacciones, resumenAplicado });
  const id = `carga-${crypto.randomUUID()}`;
  const transaccionesHashes = transacciones.map(hashJson);
  const contenidoHash = hashJson({ periodo, transacciones, resumenAplicado });
  if (new Set(transaccionesHashes).size !== transaccionesHashes.length) {
    return res.status(409).json({ mensaje: "El archivo contiene transacciones repetidas; no se sumarán dos veces.", yaCargado: true });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existentes] = await connection.execute(
      "SELECT id FROM cargas_edenred WHERE (archivo_hash = ? OR contenido_hash = ?) AND eliminado = 0 LIMIT 1 FOR UPDATE",
      [hashArchivo, contenidoHash],
    );
    if (existentes[0]) {
      await connection.rollback();
      return res.status(409).json({ mensaje: "Este archivo de Edenred ya fue cargado; no se volverán a sumar sus transacciones.", yaCargado: true });
    }
    const [cargasAnteriores] = await connection.execute(
      "SELECT transacciones_hashes_json FROM cargas_edenred WHERE eliminado = 0 AND transacciones_hashes_json IS NOT NULL",
    );
    const hashesPrevios = new Set(cargasAnteriores.flatMap((row) => {
      const hashes = typeof row.transacciones_hashes_json === "string" ? JSON.parse(row.transacciones_hashes_json) : row.transacciones_hashes_json;
      return Array.isArray(hashes) ? hashes : [];
    }));
    const repetidas = transaccionesHashes.filter((hash) => hashesPrevios.has(hash));
    if (repetidas.length > 0) {
      await connection.rollback();
      return res.status(409).json({ mensaje: "La carga contiene transacciones que ya fueron aplicadas; no se sumarán nuevamente.", yaCargado: true });
    }
    await connection.execute("INSERT INTO cargas_edenred (id, periodo_json, transacciones_json, resumen_json) VALUES (?, ?, ?, ?)",
      [id, JSON.stringify(periodo), JSON.stringify(transacciones), JSON.stringify(resumenAplicado)]);
    await connection.execute(
      "UPDATE cargas_edenred SET archivo_hash = ?, transacciones_hashes_json = ? WHERE id = ?",
      [hashArchivo, JSON.stringify(transaccionesHashes), id],
    );
    await connection.execute("UPDATE cargas_edenred SET contenido_hash = ? WHERE id = ?", [contenidoHash, id]);
    for (const item of elementos) {
      const [rows] = await connection.execute("SELECT historial_json FROM unidades WHERE id = ? LIMIT 1 FOR UPDATE", [item.unidadId]);
      if (!rows[0]) throw Object.assign(new Error("La unidad de la carga no existe."), { code: "UNIT_NOT_FOUND" });
      const historial = rows[0].historial_json ? (typeof rows[0].historial_json === "string" ? JSON.parse(rows[0].historial_json) : rows[0].historial_json) : [];
      const actual = historial.find((r) => r.mes === item.mes);
      const siguiente = actual
        ? historial.map((r) => r.mes === item.mes ? { ...r, km: Number(r.km || 0) + Number(item.km || 0), litros: Number(r.litros || 0) + Number(item.litros || 0), importe: Number(r.importe || 0) + Number(item.importe || 0) } : r)
        : [...historial, { mes: item.mes, km: Number(item.km || 0), litros: Number(item.litros || 0), importe: Number(item.importe || 0) }];
      await connection.execute(
        "UPDATE unidades SET historial_json = ?, kilometraje = GREATEST(kilometraje, ?), tipo_combustible = COALESCE(?, tipo_combustible) WHERE id = ?",
        [JSON.stringify(siguiente), Number(item.kilometrajeAplicado || 0), item.tipoCombustible ?? null, item.unidadId],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Este archivo de Edenred ya fue cargado; no se volverán a sumar sus transacciones.", yaCargado: true });
    }
    if (error.code === "UNIT_NOT_FOUND") return res.status(400).json({ mensaje: error.message });
    throw error;
  } finally {
    connection.release();
  }
  await notifyMovementSafely({
    actorId: req.auth.sub,
    type: "edenred-carga",
    title: "Nueva carga de Edenred",
    detail: `Se registró una carga con ${transacciones.length} transacción(es).`,
    entityType: "edenred",
    entityId: id,
  });
  programarReconciliacionAnomalias();
  return res.status(201).json({ id, mensaje: "Carga de Edenred guardada correctamente." });
});

export default router;
