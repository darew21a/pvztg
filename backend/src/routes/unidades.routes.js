import { Router } from "express";
import { query, pool } from "../config/db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { uploadFiles, uploadedFileUrl, validateUploadedFileSignatures } from "../middleware/upload.js";
import { parsePositiveId } from "../policies/accessPolicy.js";
import { parsePagination, setPaginationHeaders } from "../utils/pagination.js";
import { notifyMovementSafely } from "../services/notificationService.js";
import { programarReconciliacionAnomalias } from "../services/anomalyCaseService.js";
import { normalizarVin } from "../../../shared/anomalyRules.js";
const router = Router();
router.use(requireAuth);

function hashValido(valor) {
  return /^[a-f0-9]{64}$/i.test(String(valor ?? ""));
}

function obtenerDepartamentoCambio(entries, values) {
  const index = entries.findIndex(([column]) => column === "departamento_id");
  return index < 0 ? null : values[index];
}

function normalizarIdentificador(valor) {
  if (valor == null) return null;
  const normalizado = String(valor).trim();
  return normalizado || null;
}

function normalizarComparacionIdentificador(valor) {
  return normalizarIdentificador(valor)?.toUpperCase().replace(/\s+/g, " ") ?? null;
}

function mensajeDuplicadoUnidad(conflicto, economico, numeroSerie) {
  if (conflicto?.economico != null
    && normalizarComparacionIdentificador(economico) === normalizarComparacionIdentificador(conflicto.economico)) {
    return `El número económico "${String(economico).trim()}" ya está asignado a otra unidad.`;
  }
  const vin = normalizarVin(numeroSerie);
  if (conflicto?.numero_serie != null && vin && vin === normalizarVin(conflicto.numero_serie)) {
    return `El número de serie (VIN) "${String(numeroSerie).trim()}" ya está asignado a otra unidad.`;
  }
  return "El número económico o el VIN ya está asignado a otra unidad.";
}

async function buscarConflictoIdentidad({ economico, numeroSerie, excluirId = null }) {
  const economicoNormalizado = normalizarComparacionIdentificador(economico);
  const vinNormalizado = normalizarVin(numeroSerie);
  if (!economicoNormalizado && !vinNormalizado) return null;
  const exclusion = excluirId == null ? "" : "AND id <> ?";
  const parametros = excluirId == null ? [] : [excluirId];
  const [rows] = await pool.query(
    `SELECT id, economico, numero_serie
     FROM unidades
     WHERE (economico IS NOT NULL OR numero_serie IS NOT NULL)
       ${exclusion}`,
    parametros,
  );
  return rows.find((row) =>
    (economicoNormalizado && normalizarIdentificador(row.economico) === economicoNormalizado)
    || (vinNormalizado && normalizarVin(row.numero_serie) === vinNormalizado)) ?? null;
}

router.get("/unidades/cargas-relacion/:archivoHash", requireRoles("stt", "apv"), async (req, res) => {
  if (!hashValido(req.params.archivoHash)) return res.status(400).json({ mensaje: "El hash del archivo no es válido." });
  const [rows] = await pool.query(
    "SELECT nombre_archivo, created_at FROM cargas_relacion_unidades WHERE archivo_hash = ? OR contenido_hash = ? LIMIT 1",
    [req.params.archivoHash.toLowerCase(), String(req.query.contenidoHash ?? "").toLowerCase()],
  );
  return res.json({ yaCargado: Boolean(rows[0]), carga: rows[0] ?? null });
});

router.post("/unidades/cargas-relacion", requireRoles("stt", "apv"), async (req, res) => {
  const { archivoHash, contenidoHash, nombreArchivo } = req.body ?? {};
  if (!hashValido(archivoHash)) return res.status(400).json({ mensaje: "El hash del archivo no es válido." });
  if (!hashValido(contenidoHash)) return res.status(400).json({ mensaje: "El hash del contenido no es válido." });
  try {
    await query(
      "INSERT INTO cargas_relacion_unidades (archivo_hash, contenido_hash, nombre_archivo) VALUES (?, ?, ?)",
      [String(archivoHash).toLowerCase(), String(contenidoHash).toLowerCase(), String(nombreArchivo ?? "").slice(0, 255) || null],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Este archivo de relación de unidades ya fue cargado.", yaCargado: true });
    }
    throw error;
  }
  return res.status(201).json({ mensaje: "Archivo de relación registrado correctamente." });
});

router.post("/unidades/importacion-relacion", requireRoles("stt", "apv"), async (req, res) => {
  const { archivoHash, contenidoHash, nombreArchivo, actualizaciones = [], altas = [] } = req.body ?? {};
  if (!hashValido(archivoHash) || !hashValido(contenidoHash)
    || !Array.isArray(actualizaciones) || !Array.isArray(altas)
    || actualizaciones.length + altas.length > 2000) {
    return res.status(400).json({ mensaje: "Los datos de la importación no son válidos o exceden el límite de 2000 unidades." });
  }
  const columnas = {
    numeroSerie: "numero_serie",
    economico: "economico",
    placas: "placas",
    placas2025: "placas_2025",
    placasVigentesAnio: "placas_vigentes_anio",
    marca: "marca",
    submarca: "submarca",
    cilindros: "cilindros",
    tipo: "tipo",
    modelo: "modelo",
    departamentoId: "departamento_id",
    kilometraje: "kilometraje",
    tipoCombustible: "tipo_combustible",
    estado: "estado",
    conductorAsignado: "conductor_asignado",
    resguardante2: "resguardante_2",
    rpeResguardante: "rpe_resguardante",
    centroGestor: "centro_gestor",
    centroCostos: "centro_costos",
    ubicacionTecnica: "ubicacion_tecnica",
    arrendadora: "arrendadora",
    tarjetaEdenred: "tarjeta_edenred",
    nip: "nip_edenred",
  };
  const connection = await pool.getConnection();
  const unidadesCreadas = [];
  try {
    await connection.beginTransaction();
    try {
      await connection.execute(
        "INSERT INTO cargas_relacion_unidades (archivo_hash, contenido_hash, nombre_archivo) VALUES (?, ?, ?)",
        [String(archivoHash).toLowerCase(), String(contenidoHash).toLowerCase(), String(nombreArchivo ?? "").slice(0, 255) || null],
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        await connection.rollback();
        return res.status(409).json({ mensaje: "Esta relación de unidades ya fue procesada. No se aplicaron cambios.", yaCargado: true });
      }
      throw error;
    }

    for (const actualizacion of actualizaciones) {
      const unidadId = parsePositiveId(actualizacion?.id);
      const cambios = actualizacion?.cambios;
      if (!unidadId || !cambios || typeof cambios !== "object" || Array.isArray(cambios)) {
        throw Object.assign(new Error("Una unidad de la importación no tiene identificador o cambios válidos."), { code: "INVALID_IMPORT" });
      }
      const [unidadExistente] = await connection.execute(
        "SELECT id FROM unidades WHERE id = ? LIMIT 1 FOR UPDATE",
        [unidadId],
      );
      if (!unidadExistente[0]) {
        throw Object.assign(new Error(`La unidad ${unidadId} ya no existe. Recarga la flota antes de importar.`), { code: "INVALID_IMPORT" });
      }
      const entries = Object.entries(columnas)
        .filter(([campo]) => cambios[campo] !== undefined)
        .map(([campo, columna]) => [columna, cambios[campo]]);
      if (entries.length === 0) continue;
      const values = entries.map(([columna, valor]) => {
        if (columna === "departamento_id") return valor === "" || valor == null ? null : parsePositiveId(valor);
        return valor === "" || valor == null ? null : valor;
      });
      if (entries.some(([columna], index) => columna === "departamento_id" && cambios.departamentoId && !values[index])) {
        throw Object.assign(new Error("La importación contiene un departamento no válido."), { code: "INVALID_IMPORT" });
      }
      const departamentoId = obtenerDepartamentoCambio(entries, values);
      if (departamentoId) {
        const [departamentoRows] = await connection.execute(
          "SELECT id FROM departamentos WHERE id = ? AND activo = 1 LIMIT 1",
          [departamentoId],
        );
        if (!departamentoRows[0]) {
          throw Object.assign(new Error("La importación contiene un departamento inexistente o inactivo."), { code: "INVALID_IMPORT" });
        }
      }
      await connection.execute(
        `UPDATE unidades SET ${entries.map(([columna]) => `${columna} = ?`).join(", ")} WHERE id = ?`,
        [...values, unidadId],
      );
    }

    for (const alta of altas) {
      const datos = alta?.datos;
      if (!datos || typeof datos !== "object" || Array.isArray(datos) || !String(datos.numeroSerie ?? "").trim()) {
        throw Object.assign(new Error("Cada unidad nueva debe incluir número de serie."), { code: "INVALID_IMPORT" });
      }
      const entries = Object.entries(columnas)
        .filter(([campo]) => datos[campo] !== undefined)
        .map(([campo, columna]) => [columna, datos[campo]]);
      const columns = entries.map(([columna]) => columna);
      const values = entries.map(([columna, valor]) => {
        if (columna === "departamento_id") return valor === "" || valor == null ? null : parsePositiveId(valor);
        return valor === "" || valor == null ? null : valor;
      });
      if (entries.some(([columna], index) => columna === "departamento_id" && datos.departamentoId && !values[index])) {
        throw Object.assign(new Error("La importación contiene un departamento no válido."), { code: "INVALID_IMPORT" });
      }
      const departamentoId = obtenerDepartamentoCambio(entries, values);
      if (departamentoId) {
        const [departamentoRows] = await connection.execute(
          "SELECT id FROM departamentos WHERE id = ? AND activo = 1 LIMIT 1",
          [departamentoId],
        );
        if (!departamentoRows[0]) {
          throw Object.assign(new Error("La importación contiene un departamento inexistente o inactivo."), { code: "INVALID_IMPORT" });
        }
      }
      const [result] = await connection.execute(
        `INSERT INTO unidades (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        values,
      );
      const datosPublicos = Object.fromEntries(
        Object.entries(datos).filter(([campo]) => !["tarjetaEdenred", "nip"].includes(campo)),
      );
      unidadesCreadas.push({ id: String(result.insertId), datos: datosPublicos });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "INVALID_IMPORT") return res.status(400).json({ mensaje: error.message });
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "La importación contiene un económico o número de serie que ya existe. No se aplicaron cambios." });
    throw error;
  } finally {
    connection.release();
  }
  programarReconciliacionAnomalias();
  return res.status(200).json({
    mensaje: "Importación aplicada completamente.",
    actualizadas: actualizaciones.length,
    creadas: unidadesCreadas,
  });
});

router.delete("/unidades/cargas-relacion/:archivoHash", requireRoles("stt", "apv"), async (req, res) => {
  if (!hashValido(req.params.archivoHash)) return res.status(400).json({ mensaje: "El hash del archivo no es válido." });
  await query("DELETE FROM cargas_relacion_unidades WHERE archivo_hash = ?", [req.params.archivoHash.toLowerCase()]);
  return res.status(204).send();
});

const SELECT_UNIDADES = `
  SELECT u.id, u.economico, u.placas, u.placas_2025, u.placas_vigentes_anio,
         u.marca, u.submarca, u.cilindros, u.tipo, u.modelo,
         u.numero_serie, u.departamento_id, u.kilometraje, u.tipo_combustible,
         u.estado, u.conductor_asignado, u.resguardante_2, u.requiere_resguardante_2, u.rpe_resguardante,
         u.centro_gestor, u.centro_costos, u.ubicacion_tecnica, u.arrendadora,
         u.historial_json, u.activo, d.nombre AS departamento
  FROM unidades u
  LEFT JOIN departamentos d ON d.id = u.departamento_id
`;

function mapUnidad(row) {
  return {
    id: String(row.id),
    economico: row.economico,
    placas: row.placas,
    placas2025: row.placas_2025,
    placasVigentesAnio: row.placas_vigentes_anio,
    marca: row.marca,
    submarca: row.submarca,
    cilindros: row.cilindros,
    tipo: row.tipo,
    modelo: row.modelo,
    numeroSerie: row.numero_serie,
    departamentoId: row.departamento_id,
    departamento: row.departamento,
    kilometraje: row.kilometraje,
    tipoCombustible: row.tipo_combustible,
    estado: row.estado,
    conductorAsignado: row.conductor_asignado,
    resguardante2: row.resguardante_2,
    requiereResguardante2: Boolean(row.requiere_resguardante_2),
    rpeResguardante: row.rpe_resguardante,
    centroGestor: row.centro_gestor,
    centroCostos: row.centro_costos,
    ubicacionTecnica: row.ubicacion_tecnica,
    arrendadora: row.arrendadora,
    historialCombustible: row.historial_json ? (typeof row.historial_json === "string" ? JSON.parse(row.historial_json) : row.historial_json) : [],
    documentos: row.documentos ?? [],
  };
}

router.get("/unidades", async (req, res) => {
  const { departamentoId, search } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  const esJefe = req.auth.role === "jefe-departamento";
  let departamentoFiltrado = null;
  if (!esJefe && departamentoId) {
    departamentoFiltrado = parsePositiveId(departamentoId);
    if (!departamentoFiltrado) return res.status(400).json({ mensaje: "El identificador del departamento no es válido." });
  }
  const filtroDepartamento = esJefe || departamentoFiltrado ? "AND u.departamento_id = ?" : "";
  const parametrosDepartamento = esJefe ? [req.auth.departmentId] : (departamentoFiltrado ? [departamentoFiltrado] : []);
  const texto = String(search ?? "").trim();
  const filtroBusqueda = texto
    ? "AND (u.economico LIKE ? OR u.placas LIKE ? OR u.placas_2025 LIKE ? OR u.numero_serie LIKE ? OR u.marca LIKE ? OR u.submarca LIKE ?)"
    : "";
  if (texto) parametrosDepartamento.push(...Array(6).fill(`%${texto}%`));
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM unidades u
     WHERE u.activo = 1 ${filtroDepartamento} ${filtroBusqueda}`,
    parametrosDepartamento,
  );
  const rows = await query(
    `${SELECT_UNIDADES}
     WHERE u.activo = 1 ${filtroDepartamento} ${filtroBusqueda}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...parametrosDepartamento, limit, offset],
  );
  if (rows.length > 0) {
    const ids = rows.map((row) => row.id);
    const documentos = await query(
      `SELECT id, unidad_id, tipo, nombre_archivo, url_archivo, fecha_carga
       FROM unidad_documentos
       WHERE unidad_id IN (${ids.map(() => "?").join(", ")})
       ORDER BY fecha_carga DESC, id DESC`,
      ids,
    );
    const documentosPorUnidad = new Map();
    documentos.forEach((documento) => {
      const lista = documentosPorUnidad.get(documento.unidad_id) ?? [];
      lista.push({
        id: String(documento.id),
        tipo: documento.tipo,
        nombreArchivo: documento.nombre_archivo,
        url: documento.url_archivo,
        fechaCarga: documento.fecha_carga,
      });
      documentosPorUnidad.set(documento.unidad_id, lista);
    });
    rows.forEach((row) => { row.documentos = documentosPorUnidad.get(row.id) ?? []; });
  }
  setPaginationHeaders(res, { page, limit, total });
  return res.json(rows.map(mapUnidad));
});

router.get(
  "/unidades/:id/credenciales-edenred",
  requireRoles("stt", "apv"),
  async (req, res) => {
    const unidadId = parsePositiveId(req.params.id);
    if (!unidadId) return res.status(400).json({ mensaje: "El identificador de la unidad no es válido." });
    const rows = await query(
      `SELECT tarjeta_edenred, nip_edenred, tarjeta_edenred_cifrada, nip_edenred_cifrado
       FROM unidades WHERE id = ? AND activo = 1 LIMIT 1`,
      [unidadId],
    );
    if (!rows[0]) return res.status(404).json({ mensaje: "La unidad no existe o está inactiva." });
    if ((rows[0].tarjeta_edenred_cifrada && !rows[0].tarjeta_edenred)
      || (rows[0].nip_edenred_cifrado && !rows[0].nip_edenred)) {
      return res.status(409).json({
        mensaje: "Esta unidad conserva una credencial del formato cifrado anterior y no tiene su valor de texto normal. Vuelve a importar la tarjeta y el NIP desde la relación vehicular.",
      });
    }
    return res.json({
      tarjetaEdenred: rows[0].tarjeta_edenred,
      nip: rows[0].nip_edenred,
    });
  },
);

router.post("/unidades", requireRoles("stt", "apv"), async (req, res) => {
  const {
    numeroSerie, economico, placas, placas2025, marca, submarca, cilindros, tipo, modelo, departamentoId,
    kilometraje, tipoCombustible, estado, conductorAsignado, resguardante2, rpeResguardante,
    centroGestor, centroCostos, ubicacionTecnica, arrendadora,
    requiereResguardante2,
  } = req.body ?? {};

  if (!numeroSerie || !String(numeroSerie).trim()) {
    return res.status(400).json({ mensaje: "El número de serie es obligatorio." });
  }

  const conflicto = await buscarConflictoIdentidad({ economico, numeroSerie });
  if (conflicto) {
    return res.status(409).json({
      mensaje: mensajeDuplicadoUnidad(conflicto, economico, numeroSerie),
    });
  }

  try {
    const result = await query(
      `INSERT INTO unidades
       (numero_serie, economico, placas, placas_2025, marca, submarca, cilindros, tipo, modelo, departamento_id,
        kilometraje, tipo_combustible, estado, conductor_asignado, resguardante_2, requiere_resguardante_2, rpe_resguardante,
        centro_gestor, centro_costos, ubicacion_tecnica, arrendadora)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        String(numeroSerie).trim(), economico || null, placas || null, placas2025 || null, marca || null,
        submarca || null, cilindros || null, tipo || null, modelo || null, departamentoId ? Number(departamentoId) : null,
        kilometraje ? Number(kilometraje) : 0, tipoCombustible || null,
        estado || "en-estacion", conductorAsignado || null, resguardante2 || null, requiereResguardante2 === true ? 1 : 0, rpeResguardante || null,
        centroGestor || null, centroCostos || null, ubicacionTecnica || null, arrendadora || null,
      ],
    );
    programarReconciliacionAnomalias();
    return res.status(201).json({ id: result.insertId, mensaje: "Unidad creada correctamente." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const conflicto = await buscarConflictoIdentidad({ economico, numeroSerie });
      return res.status(409).json({ mensaje: mensajeDuplicadoUnidad(conflicto, economico, numeroSerie) });
    }
    throw error;
  }
});

router.patch("/unidades/:id", requireRoles("stt", "apv"), async (req, res) => {
  const unidadId = parsePositiveId(req.params.id);
  if (!unidadId) return res.status(400).json({ mensaje: "El identificador de la unidad no es válido." });
  const campos = {
    numeroSerie: "numero_serie",
    economico: "economico",
    placas: "placas",
    placas2025: "placas_2025",
    placasVigentesAnio: "placas_vigentes_anio",
    marca: "marca",
    submarca: "submarca",
    cilindros: "cilindros",
    tipo: "tipo",
    modelo: "modelo",
    departamentoId: "departamento_id",
    kilometraje: "kilometraje",
    tipoCombustible: "tipo_combustible",
    estado: "estado",
    conductorAsignado: "conductor_asignado",
    resguardante2: "resguardante_2",
    requiereResguardante2: "requiere_resguardante_2",
    rpeResguardante: "rpe_resguardante",
    centroGestor: "centro_gestor",
    centroCostos: "centro_costos",
    ubicacionTecnica: "ubicacion_tecnica",
    arrendadora: "arrendadora",
    tarjetaEdenred: "tarjeta_edenred",
    nip: "nip_edenred",
    historialCombustible: "historial_json",
  };
  const entries = Object.entries(campos)
    .filter(([key]) => req.body?.[key] !== undefined)
    .map(([key, column]) => [
      column,
      key === "requiereResguardante2"
        ? (req.body[key] === true || req.body[key] === 1 || req.body[key] === "1" ? 1 : 0)
        : req.body[key],
    ]);

  if (entries.length === 0) {
    return res.status(400).json({ mensaje: "No se recibieron cambios." });
  }

  const [actualRows] = await pool.query(
    "SELECT economico, placas, placas_2025, numero_serie FROM unidades WHERE id = ? LIMIT 1",
    [unidadId],
  );
  if (!actualRows[0]) return res.status(404).json({ mensaje: "La unidad no existe." });
  const identidadPropuesta = { ...actualRows[0] };
  entries.forEach(([column, value], index) => {
    const normalizado = ["economico", "numero_serie"].includes(column)
      ? normalizarIdentificador(value)
      : value;
    if (Object.prototype.hasOwnProperty.call(identidadPropuesta, column)) identidadPropuesta[column] = normalizado;
    entries[index][1] = normalizado;
  });
  const conflicto = await buscarConflictoIdentidad({
    economico: identidadPropuesta.economico,
    numeroSerie: identidadPropuesta.numero_serie,
    excluirId: unidadId,
  });
  if (conflicto) {
    return res.status(409).json({
      mensaje: mensajeDuplicadoUnidad(conflicto, identidadPropuesta.economico, identidadPropuesta.numero_serie),
    });
  }
  const values = entries.map(([column, value]) => {
    if (column === "historial_json") return JSON.stringify(value ?? []);
    return value === "" ? null : value;
  });
  const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
  values.push(unidadId);
  await query(`UPDATE unidades SET ${assignments} WHERE id = ?`, values);
  programarReconciliacionAnomalias();
  await notifyMovementSafely({
    actorId: req.auth.sub,
    type: "unidad-actualizada",
    title: "Datos de unidad actualizados",
    detail: `Se actualizaron los datos de la unidad ${unidadId}.`,
    entityType: "unidad",
    entityId: unidadId,
  });
  return res.json({ mensaje: "Unidad actualizada correctamente." });
});

router.post(
  "/unidades/:id/documentos",
  requireRoles("stt", "apv"),
  uploadFiles.single("documento"),
  validateUploadedFileSignatures,
  async (req, res) => {
    const unidadId = parsePositiveId(req.params.id);
    if (!unidadId) return res.status(400).json({ mensaje: "El identificador de la unidad no es válido." });
    if (!req.file) return res.status(400).json({ mensaje: "Selecciona un documento PDF." });
    const tipo = String(req.body?.tipo ?? "");
    if (!["seguro", "tarjeta-circulacion"].includes(tipo)) {
      return res.status(400).json({ mensaje: "El tipo de documento no es válido." });
    }
    const [unidades] = await pool.query("SELECT id FROM unidades WHERE id = ? AND activo = 1 LIMIT 1", [unidadId]);
    if (!unidades[0]) return res.status(404).json({ mensaje: "La unidad no existe o está inactiva." });
    const result = await query(
      `INSERT INTO unidad_documentos (unidad_id, tipo, nombre_archivo, url_archivo, creado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [unidadId, tipo, String(req.file.originalname).slice(0, 255), uploadedFileUrl(req.file), Number(req.auth.sub)],
    );
    return res.status(201).json({
      id: String(result.insertId),
      tipo,
      nombreArchivo: String(req.file.originalname).slice(0, 255),
      url: uploadedFileUrl(req.file),
      fechaCarga: new Date().toISOString(),
    });
  },
);

export default router;
