/**
 * ============================================================================
 * DISEÑO DE REFERENCIA - ESQUEMA RELACIONAL DEL ECOSISTEMA
 * ============================================================================
 * Este archivo NO se ejecuta - es la especificación del esquema que debe
 * implementarse cuando exista el backend real (PHP/Node), diseñado para
 * escalar a N unidades y N departamentos durante décadas sin rediseñar
 * tablas. Complementa a `historico-anual.route.js` (consolidación anual)
 * con el resto del ecosistema: departamentos dinámicos, unidades, y los
 * dos flujos de archivos (baja frecuencia: pólizas/tarjetas; alta
 * frecuencia: tickets de combustible).
 * ============================================================================
 */

/**
 * -- Departamentos: tabla abierta, sin límite de filas. El id numérico
 * -- autoincremental es lo único "fijo" - el catálogo de nombres crece
 * -- libremente conforme CFE reorganiza áreas.
 * CREATE TABLE departamentos (
 *   id      SERIAL PRIMARY KEY,
 *   nombre  VARCHAR(150) NOT NULL UNIQUE,
 *   icono   VARCHAR(50)                    -- nombre del ícono de Material Symbols, cosmético
 * );
 *
 * -- Unidades: la relación con departamento es dinámica (FK), nunca un
 * -- valor de texto fijo - así, si un departamento se renombra, no hay
 * -- que tocar cada unidad.
 * CREATE TABLE unidades (
 *   id                 SERIAL PRIMARY KEY,
 *   economico          VARCHAR(20) UNIQUE,
 *   placa              VARCHAR(15),
 *   marca              VARCHAR(80),
 *   submarca           VARCHAR(80),
 *   modelo             VARCHAR(10),
 *   numero_serie       VARCHAR(30) UNIQUE NOT NULL,   -- VIN, llave de negocio verdadera
 *   departamento_id    INTEGER REFERENCES departamentos(id),  -- dinámico, nunca un enum fijo
 *   kilometraje        NUMERIC,
 *   tipo_combustible   VARCHAR(30),
 *   estado             VARCHAR(20)          -- OPER/EAPR/SINI/ROBA/EAPE/ENAJ/PTBO, según MySAP
 * );
 *
 * -- ─── FLUJO A: BAJA FRECUENCIA (Pólizas y Tarjetas de Circulación) ───────
 * -- Histórico relacional indexado por año de vigencia - nunca se
 * -- sobreescribe un año anterior, cada carga nueva es una fila nueva.
 * CREATE TABLE polizas_seguro (
 *   id            SERIAL PRIMARY KEY,
 *   unidad_id     INTEGER REFERENCES unidades(id),
 *   anio_vigencia INTEGER NOT NULL,
 *   url_archivo   TEXT NOT NULL,
 *   fecha_carga   TIMESTAMP NOT NULL,
 *   UNIQUE (unidad_id, anio_vigencia)      -- un solo archivo activo por año y unidad
 * );
 *
 * CREATE TABLE tarjetas_circulacion (
 *   id            SERIAL PRIMARY KEY,
 *   unidad_id     INTEGER REFERENCES unidades(id),
 *   anio_vigencia INTEGER NOT NULL,
 *   url_archivo   TEXT NOT NULL,
 *   fecha_carga   TIMESTAMP NOT NULL,
 *   UNIQUE (unidad_id, anio_vigencia)
 * );
 *
 * -- ─── FLUJO B: ALTA FRECUENCIA (Transacciones de Combustible) ────────────
 * -- Una fila por cada recarga individual, con sus 3 comprobantes.
 * CREATE TABLE transacciones_combustible (
 *   id                   SERIAL PRIMARY KEY,
 *   unidad_id            INTEGER REFERENCES unidades(id),
 *   fecha_hora           TIMESTAMP NOT NULL,     -- cuándo se hizo la recarga (no cuándo se subió)
 *   litros               NUMERIC NOT NULL,
 *   importe              NUMERIC NOT NULL,
 *   url_ticket_bomba     TEXT NOT NULL,          -- obligatorio
 *   url_ticket_edenred   TEXT,                   -- opcional
 *   url_pdf_fusionado    TEXT,                   -- opcional
 *   subido_por           INTEGER REFERENCES usuarios(id)  -- Jefe de Departamento que lo cargó
 * );
 *
 * -- Índices para que el Módulo de Auditoría Global filtre rápido incluso
 * -- con años de datos acumulados (miles de recargas).
 * CREATE INDEX idx_transacciones_unidad_fecha ON transacciones_combustible (unidad_id, fecha_hora);
 * CREATE INDEX idx_unidades_departamento ON unidades (departamento_id);
 */

/**
 * Endpoints de referencia (Express, mismo estilo que
 * `historico-anual.route.js`) para el flujo de combustible de alta
 * frecuencia - la lógica de "a qué departamento pertenece" siempre se
 * resuelve con un JOIN a `unidades`/`departamentos`, nunca duplicando el
 * nombre del departamento dentro de `transacciones_combustible`.
 */
function ejemploHandlersCombustible(app, db) {
  // Alta de una recarga - la sube el Jefe de Departamento desde su interfaz.
  app.post("/api/tickets-combustible", async (req, res) => {
    const { unidadId, fechaHora, litros, importe, urlTicketBomba, urlTicketEdenred, urlPdfFusionado, subidoPor } = req.body;
    if (!urlTicketBomba) {
      return res.status(400).json({ mensaje: "El Ticket Bomba es obligatorio." });
    }
    const [resultado] = await db.query(
      `INSERT INTO transacciones_combustible
         (unidad_id, fecha_hora, litros, importe, url_ticket_bomba, url_ticket_edenred, url_pdf_fusionado, subido_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [unidadId, fechaHora, litros, importe, urlTicketBomba, urlTicketEdenred ?? null, urlPdfFusionado ?? null, subidoPor],
    );
    return res.status(201).json({ id: resultado.insertId });
  });

  // Auditoría global - el Administrador cruza por unidad/departamento/fecha con un solo JOIN.
  app.get("/api/tickets-combustible", async (req, res) => {
    const { placa, economico, departamentoId, anio, mes, dia, hora } = req.query;

    const condiciones = [];
    const parametros = [];
    if (placa) { condiciones.push("u.placa = ?"); parametros.push(placa); }
    if (economico) { condiciones.push("u.economico = ?"); parametros.push(economico); }
    if (departamentoId) { condiciones.push("u.departamento_id = ?"); parametros.push(departamentoId); }
    if (anio) { condiciones.push("EXTRACT(YEAR FROM t.fecha_hora) = ?"); parametros.push(anio); }
    if (mes) { condiciones.push("EXTRACT(MONTH FROM t.fecha_hora) = ?"); parametros.push(mes); }
    if (dia) { condiciones.push("EXTRACT(DAY FROM t.fecha_hora) = ?"); parametros.push(dia); }
    if (hora) { condiciones.push("EXTRACT(HOUR FROM t.fecha_hora) = ?"); parametros.push(hora); }

    const dondeSql = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const [filas] = await db.query(
      `SELECT t.*, u.economico, u.placa, d.nombre AS departamento
         FROM transacciones_combustible t
         JOIN unidades u ON u.id = t.unidad_id
         JOIN departamentos d ON d.id = u.departamento_id
         ${dondeSql}
        ORDER BY t.fecha_hora DESC`,
      parametros,
    );
    return res.json(filas);
  });
}

module.exports = { ejemploHandlersCombustible };
