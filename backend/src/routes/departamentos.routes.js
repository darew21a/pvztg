import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/departamentos", async (_req, res) => {
  const rows = await query(
    `SELECT id, nombre, icono, orden, activo
     FROM departamentos
     WHERE activo = 1
     ORDER BY orden ASC, id ASC`,
  );

  return res.json(rows);
});

router.post("/departamentos", requireRoles("stt", "apv"), async (req, res) => {
  const nombre = String(req.body?.nombre ?? "").trim();
  const icono = String(req.body?.icono ?? "corporate_fare").trim();
  if (!nombre || nombre.length > 150) {
    return res.status(400).json({ mensaje: "El nombre debe tener entre 1 y 150 caracteres." });
  }
  if (!/^[a-z0-9_-]{1,50}$/i.test(icono)) {
    return res.status(400).json({ mensaje: "El icono indicado no es válido." });
  }
  try {
    const result = await query(
      "INSERT INTO departamentos (nombre, icono) VALUES (?, ?)",
      [nombre, icono],
    );
    return res.status(201).json({
      id: String(result.insertId),
      nombre,
      icono,
      orden: 999,
      activo: 1,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un departamento con ese nombre." });
    }
    throw error;
  }
});

export default router;
