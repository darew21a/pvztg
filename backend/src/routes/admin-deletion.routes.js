import { Router } from "express";
import { createAndValidateBackup } from "../db/backup.js";
import { pool } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { parsePositiveId } from "../policies/accessPolicy.js";
import {
  buildDepartmentDependencies,
  createDepartmentDependencyError,
} from "../policies/departmentDependencies.js";

const router = Router();
const PARQUE_CONFIRMACION = "REINICIAR LINEA BASE DEL PARQUE VEHICULAR";

router.use(requireAuth, requireRoles("stt", "apv"));

function confirmationMatches(value, expected) {
  return String(value ?? "").trim().toUpperCase() === expected;
}

async function parqueDependencies(connection) {
  const queries = {
    unidades: "SELECT COUNT(*) AS cantidad FROM unidades",
    reportes: "SELECT COUNT(*) AS cantidad FROM reportes",
    tickets: "SELECT COUNT(*) AS cantidad FROM tickets_combustible",
    polizas: "SELECT COUNT(*) AS cantidad FROM polizas_seguro",
    tarjetas: "SELECT COUNT(*) AS cantidad FROM tarjetas_circulacion",
    relacionesReportes: "SELECT COUNT(*) AS cantidad FROM reporte_unidades",
    cargasEdenred: "SELECT COUNT(*) AS cantidad FROM cargas_edenred",
    cargasRelacion: "SELECT COUNT(*) AS cantidad FROM cargas_relacion_unidades",
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    const [rows] = await connection.query(sql);
    result[name] = Number(rows[0]?.cantidad ?? 0);
  }
  return result;
}

router.delete("/admin/parque-vehicular", async (req, res) => {
  if (!confirmationMatches(req.body?.confirmacion, PARQUE_CONFIRMACION)) {
    return res.status(400).json({
      mensaje: `Escribe exactamente «${PARQUE_CONFIRMACION}» para confirmar. No se borró ningún dato.`,
      codigo: "CONFIRMACION_INVALIDA",
    });
  }

  const backup = await createAndValidateBackup();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const counts = await parqueDependencies(connection);
    await connection.query("DELETE FROM reporte_unidades");
    await connection.query("DELETE FROM reporte_seguimiento");
    await connection.query("DELETE FROM reportes");
    await connection.query("DELETE FROM tickets_combustible");
    await connection.query("DELETE FROM polizas_seguro");
    await connection.query("DELETE FROM tarjetas_circulacion");
    await connection.query("DELETE FROM cargas_edenred");
    await connection.query("DELETE FROM cargas_relacion_unidades");
    await connection.query("DELETE FROM anomalias_estados");
    await connection.query("DELETE FROM unidades");
    await connection.commit();
    return res.json({
      mensaje: `Línea base reiniciada: se eliminaron unidades y datos operativos vinculados. Backup validado: ${backup}.`,
      eliminadas: counts.unidades ?? 0,
      backup,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.delete("/admin/departamentos/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "El identificador del departamento no es válido." });

  const [[department]] = await pool.query("SELECT id, nombre FROM departamentos WHERE id = ? LIMIT 1", [id]);
  if (!department) return res.status(404).json({ mensaje: "El departamento no existe." });
  const expected = `BORRAR DEPARTAMENTO ${String(department.nombre).trim().toUpperCase()}`;
  if (!confirmationMatches(req.body?.confirmacion, expected)) {
    return res.status(400).json({
      mensaje: `Escribe exactamente «${expected}» para confirmar. No se borró ningún dato.`,
      codigo: "CONFIRMACION_INVALIDA",
    });
  }

  const backup = await createAndValidateBackup();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const queries = {
      unidades: "SELECT COUNT(*) AS cantidad FROM unidades WHERE departamento_id = ?",
      usuarios: "SELECT COUNT(*) AS cantidad FROM usuarios WHERE departamento_id = ?",
      reportes: "SELECT COUNT(*) AS cantidad FROM reportes WHERE departamento_id = ?",
    };
    const counts = {};
    for (const [name, sql] of Object.entries(queries)) {
      const [rows] = await connection.execute(sql, [id]);
      counts[name] = Number(rows[0]?.cantidad ?? 0);
    }
    const dependencias = buildDepartmentDependencies(counts);
    if (dependencias.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        ...createDepartmentDependencyError(department.nombre, dependencias),
        backup,
      });
    }
    const [result] = await connection.execute("DELETE FROM departamentos WHERE id = ?", [id]);
    await connection.commit();
    return res.json({ mensaje: `Departamento «${department.nombre}» eliminado.`, eliminados: result.affectedRows, backup });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export default router;
