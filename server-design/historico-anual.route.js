/**
 * ============================================================================
 * DISEÑO DE REFERENCIA - CONSOLIDACIÓN DE HISTÓRICO ANUAL
 * ============================================================================
 * Este archivo NO se ejecuta (no hay backend Node.js en este proyecto
 * todavía - es 100% frontend, ver `authService.js` para el contrato de
 * API ya definido). Es la especificación de cómo debe construirse el
 * endpoint real de PHP/Node cuando exista, para que el ciclo de 12 meses
 * que hoy se calcula en `src/utils/historicoAnual.js` en el navegador se
 * "congele" en base de datos y las consultas de años pasados no tengan
 * que recalcularse cada vez (escalabilidad a 20+ años de datos).
 *
 * Framework de referencia: Express + un query builder cualquiera (aquí se
 * muestra en pseudo-SQL parametrizado, agnóstico del motor).
 * ============================================================================
 */

/**
 * POST /api/historico-anual/consolidar
 *
 * Body esperado (= lo que ya arma `construirPayloadConsolidacion` en el
 * frontend, ver `src/utils/historicoAnual.js`):
 * {
 *   anioInicio: "2026-01",       // primer mes del ciclo de 12
 *   anioFin: "2026-12",          // último mes del ciclo de 12
 *   meses: [{ mes, km, litros, importe }, ...],  // 12 registros
 *   totales: { km, litros, importe },
 *   consolidadoEn: "2027-01-05T10:00:00.000Z",
 * }
 *
 * Qué hace este endpoint (diseño):
 *  1. Valida que el ciclo tenga exactamente 12 meses consecutivos y que
 *     ninguno de esos 12 meses ya esté consolidado (evita duplicar).
 *  2. Inserta UN registro resumen en `historico_anual_flota` (los totales
 *     agregados) - esta es la tabla que hace instantáneas las consultas
 *     de "¿cuánto gastó la flota en 2026?" sin sumar fila por fila.
 *  3. Inserta los 12 registros de detalle en `historico_mensual_flota`
 *     (por si se necesita desglosar un año consolidado más adelante).
 *  4. Todo dentro de una transacción: si algo falla, no se guarda nada a medias.
 */
function ejemploHandlerConsolidarHistoricoAnual(app, db) {
  app.post("/api/historico-anual/consolidar", async (req, res) => {
    const { anioInicio, anioFin, meses, totales, consolidadoEn } = req.body;

    // 1. Validación básica del payload - nunca confiar en el cliente.
    if (!Array.isArray(meses) || meses.length !== 12) {
      return res.status(400).json({ mensaje: "El ciclo debe tener exactamente 12 meses para consolidarse." }); // eslint-disable-line
    }

    const conexion = await db.getConnection();
    try {
      await conexion.beginTransaction();

      // 2. Evitar duplicados: ¿ya existe un histórico que traslape estos meses?
      const [existentes] = await conexion.query(
        "SELECT id FROM historico_anual_flota WHERE anio_inicio = ? AND anio_fin = ?",
        [anioInicio, anioFin],
      );
      if (existentes.length > 0) {
        await conexion.rollback();
        return res.status(409).json({ mensaje: "Este ciclo de 12 meses ya fue consolidado anteriormente." });
      }

      // 3. Insertar el resumen anual (lo que el Dashboard consulta después, instantáneo).
      const [resumenInsertado] = await conexion.query(
        `INSERT INTO historico_anual_flota
           (anio_inicio, anio_fin, total_km, total_litros, total_importe, consolidado_en)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [anioInicio, anioFin, totales.km, totales.litros, totales.importe, consolidadoEn],
      );
      const idHistoricoAnual = resumenInsertado.insertId;

      // 4. Insertar el detalle mensual, ligado al resumen anual (para poder desglosarlo si hace falta).
      for (const registroMes of meses) {
        await conexion.query(
          `INSERT INTO historico_mensual_flota
             (id_historico_anual, mes, km, litros, importe)
           VALUES (?, ?, ?, ?, ?)`,
          [idHistoricoAnual, registroMes.mes, registroMes.km, registroMes.litros, registroMes.importe],
        );
      }

      await conexion.commit();
      return res.status(201).json({ id: idHistoricoAnual, mensaje: "Histórico anual consolidado correctamente." });
    } catch (error) {
      await conexion.rollback();
      return res.status(500).json({ mensaje: "No fue posible consolidar el histórico.", detalle: error.message });
    } finally {
      conexion.release();
    }
  });

  /**
   * GET /api/historico-anual?anio=2026
   * Consulta instantánea de un año ya consolidado - nunca recalcula desde
   * las transacciones crudas, solo lee el resumen ya congelado.
   */
  app.get("/api/historico-anual", async (req, res) => {
    const { anio } = req.query;
    const [filas] = await db.query(
      "SELECT * FROM historico_anual_flota WHERE anio_inicio LIKE ? ORDER BY anio_inicio",
      [`${anio}%`],
    );
    return res.json(filas);
  });
}

/**
 * Esquema de tablas de referencia (SQL agnóstico de motor - ajustar tipos
 * exactos a PostgreSQL/MySQL según lo que finalmente use CFE):
 *
 * CREATE TABLE historico_anual_flota (
 *   id              SERIAL PRIMARY KEY,
 *   anio_inicio     VARCHAR(7) NOT NULL,   -- "AAAA-MM" del primer mes del ciclo
 *   anio_fin        VARCHAR(7) NOT NULL,   -- "AAAA-MM" del último mes del ciclo
 *   total_km        NUMERIC NOT NULL,
 *   total_litros    NUMERIC NOT NULL,
 *   total_importe   NUMERIC NOT NULL,
 *   consolidado_en  TIMESTAMP NOT NULL,
 *   UNIQUE (anio_inicio, anio_fin)          -- nunca se consolida el mismo ciclo dos veces
 * );
 *
 * CREATE TABLE historico_mensual_flota (
 *   id                   SERIAL PRIMARY KEY,
 *   id_historico_anual   INTEGER REFERENCES historico_anual_flota(id),
 *   mes                  VARCHAR(7) NOT NULL,  -- "AAAA-MM"
 *   km                   NUMERIC NOT NULL,
 *   litros               NUMERIC NOT NULL,
 *   importe              NUMERIC NOT NULL
 * );
 *
 * Índice recomendado para consultas rápidas por año:
 *   CREATE INDEX idx_historico_anual_inicio ON historico_anual_flota (anio_inicio);
 */

module.exports = { ejemploHandlerConsolidarHistoricoAnual };
