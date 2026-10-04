import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import request from "supertest";

const configuredDatabase = String(process.env.TEST_DB_NAME ?? "").trim();
const productionDatabase = String(process.env.DB_NAME ?? "pvztg").trim();
const canRun = Boolean(configuredDatabase) && configuredDatabase !== productionDatabase;

let adminConnection;
let pool;
let createdTestDatabase = false;
let app;
let adminToken;
let jefeToken;
let foreignUnitId;

async function createTestDatabase() {
  if (!canRun) return;
  if (!/^[A-Za-z0-9_]{1,64}$/.test(configuredDatabase)) {
    throw new Error("TEST_DB_NAME debe ser un identificador MySQL de hasta 64 caracteres.");
  }
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  };
  adminConnection = await mysql.createConnection(config);
  const [existingDatabases] = await adminConnection.query(
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
    [configuredDatabase],
  );
  if (existingDatabases.length > 0) {
    throw new Error("TEST_DB_NAME ya existe; elige un nombre temporal nuevo para proteger datos existentes.");
  }
  await adminConnection.query(`CREATE DATABASE \`${configuredDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  createdTestDatabase = true;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
  process.env.DB_NAME = configuredDatabase;
  ({ pool } = await import("../src/config/db.js"));
  const { runMigrations } = await import("../src/db/migrate.js");
  await runMigrations();
  await adminConnection.changeUser({ database: configuredDatabase });
  const passwordHash = await bcrypt.hash("Test2026!", 10);
  const [department] = await adminConnection.query(
    "INSERT INTO departamentos (nombre, icono, orden) VALUES (?, ?, ?)",
    ["Departamento de integración", "test", 999],
  );
  const departmentId = department.insertId;
  const [foreignDepartment] = await adminConnection.query(
    "INSERT INTO departamentos (nombre, icono, orden) VALUES (?, ?, ?)",
    ["Departamento externo de integración", "test", 1000],
  );
  const [admin] = await adminConnection.query(
    `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, activo, debe_cambiar_password)
     VALUES (?, ?, ?, ?, 'stt', 1, 0)`,
    ["Administrador de integración", "it-admin", "it-admin@example.test", passwordHash],
  );
  const [jefe] = await adminConnection.query(
    `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, departamento_id, activo, debe_cambiar_password)
     VALUES (?, ?, ?, ?, 'jefe-departamento', ?, 1, 0)`,
    ["Jefe de integración", "it-jefe", "it-jefe@example.test", passwordHash, departmentId],
  );
  await adminConnection.query(
    `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, activo, debe_cambiar_password)
     VALUES (?, ?, ?, ?, 'apv', 1, 0)`,
    ["APV de integración", "it-apv", "it-apv@example.test", passwordHash],
  );
  await adminConnection.query(
    `INSERT INTO unidades (economico, numero_serie, departamento_id, activo)
     VALUES (?, ?, ?, 1)`,
    ["IT-001", "IT-SERIE-001", departmentId],
  );
  const [foreignUnit] = await adminConnection.query(
    `INSERT INTO unidades (economico, numero_serie, departamento_id, activo)
     VALUES (?, ?, ?, 1)`,
    ["IT-002", "IT-SERIE-002", foreignDepartment.insertId],
  );
  foreignUnitId = foreignUnit.insertId;
  ({ app } = await import("../src/server.js"));
  const { createAccessToken } = await import("../src/middleware/auth.js");
  adminToken = createAccessToken({ id: admin.insertId, rol: "stt", usuario: "it-admin", nombre: "Administrador de integración" });
  jefeToken = createAccessToken({
    id: jefe.insertId,
    rol: "jefe-departamento",
    usuario: "it-jefe",
    nombre: "Jefe de integración",
    departamento_id: departmentId,
  });
}

before(async () => {
  if (!canRun) return;
  await createTestDatabase();
});

after(async () => {
  if (adminConnection) {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (createdTestDatabase) await adminConnection.query(`DROP DATABASE \`${configuredDatabase}\``);
      } finally {
        await adminConnection.end();
      }
    }
  } else if (pool) {
    await pool.end();
  }
});

test("la integración requiere TEST_DB_NAME y nunca usa DB_NAME", { skip: !canRun }, async () => {
  assert.notEqual(configuredDatabase, productionDatabase);
});

test("persiste el requisito opcional de segundo resguardante y reconcilia su faltante", { skip: !canRun }, async () => {
  const { reconciliarAnomalias } = await import("../src/services/anomalyCaseService.js");
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  assert.equal(units.length, 1);
  const unitId = String(units[0].id);

  const enabled = await request(app)
    .patch(`/api/unidades/${unitId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ requiereResguardante2: true, resguardante2: "" });
  assert.equal(enabled.status, 200);

  const refreshed = await request(app)
    .get("/api/unidades?search=IT-001")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.find((unit) => unit.id === unitId).requiereResguardante2, true);

  await reconciliarAnomalias();
  const [missingCustodian] = await adminConnection.query(
    `SELECT COUNT(*) AS total FROM anomaly_cases
     WHERE rule_key = 'unidad-dato-incompleto' AND entity_id = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.campoUnidad')) = 'resguardante2'
       AND present = 1`,
    [unitId],
  );
  assert.equal(Number(missingCustodian[0].total), 1);

  const disabled = await request(app)
    .patch(`/api/unidades/${unitId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ requiereResguardante2: false });
  assert.equal(disabled.status, 200);
  await reconciliarAnomalias();
  const [resolvedCustodian] = await adminConnection.query(
    `SELECT COUNT(*) AS total FROM anomaly_cases
     WHERE rule_key = 'unidad-dato-incompleto' AND entity_id = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.campoUnidad')) = 'resguardante2'
       AND present = 1`,
    [unitId],
  );
  assert.equal(Number(resolvedCustodian[0].total), 0);
});

test("reconoce VENCE 2032 como texto capturado al recuperar el año faltante de la placa vigente", { skip: !canRun }, async () => {
  const { runMigrations } = await import("../src/db/migrate.js");
  const { reconciliarAnomalias } = await import("../src/services/anomalyCaseService.js");
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  assert.equal(units.length, 1);
  await adminConnection.query(
    "UPDATE unidades SET placas_2025 = 'VENCE 2032', placas_vigentes_anio = NULL WHERE id = ?",
    [units[0].id],
  );
  await adminConnection.query(
    "DELETE FROM schema_migrations WHERE version = '014-backfill-current-year-plates.sql'",
  );

  await runMigrations();
  const [unitRows] = await adminConnection.query(
    "SELECT placas_2025, placas_vigentes_anio FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(unitRows[0].placas_2025, "VENCE 2032");
  assert.equal(Number(unitRows[0].placas_vigentes_anio), new Date().getFullYear());

  await reconciliarAnomalias();
  const [missingFindings] = await adminConnection.query(
    `SELECT COUNT(*) AS total FROM anomaly_cases
     WHERE rule_key = 'unidad-dato-incompleto'
       AND entity_id = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.campoUnidad')) = 'placas2025'
       AND present = 1`,
    [String(units[0].id)],
  );
  assert.equal(Number(missingFindings[0].total), 0);
  await adminConnection.query(
    "UPDATE unidades SET placas_2025 = NULL, placas_vigentes_anio = NULL WHERE id = ?",
    [units[0].id],
  );
  await reconciliarAnomalias();
});

test("guarda y relee texto libre de placas vigentes y persiste la duplicidad desde la tercera unidad", { skip: !canRun }, async () => {
  const { reconciliarAnomalias } = await import("../src/services/anomalyCaseService.js");
  const [existingUnits] = await adminConnection.query(
    "SELECT id, economico FROM unidades WHERE economico IN ('IT-001', 'IT-002') ORDER BY id",
  );
  assert.equal(existingUnits.length, 2);
  await reconciliarAnomalias();
  const [missingPlateCase] = await adminConnection.query(
    `SELECT id, action_url FROM anomaly_cases
     WHERE rule_key = 'unidad-dato-incompleto' AND entity_id = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(evidence_json, '$.campoUnidad')) = 'placas2025'
       AND present = 1
     LIMIT 1`,
    [String(existingUnits[0].id)],
  );
  assert.equal(missingPlateCase.length, 1);
  assert.equal(
    new URL(missingPlateCase[0].action_url, "http://localhost").searchParams.get("unidad"),
    String(existingUnits[0].id),
  );

  const created = await request(app)
    .post("/api/unidades")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ economico: "IT-PLATE-003", numeroSerie: "IT-PLATE-VIN-003" });
  assert.equal(created.status, 201);
  const unitIds = [...existingUnits.map((unit) => String(unit.id)), String(created.body.id)];
  const longPlateText = "VENCE EN 2029 - HDC.824.H; observación administrativa de vencimiento";
  assert.ok(longPlateText.length > 20);

  for (const id of unitIds.slice(0, 2)) {
    const updated = await request(app)
      .patch(`/api/unidades/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ placas2025: longPlateText, placasVigentesAnio: new Date().getFullYear() });
    assert.equal(updated.status, 200);
  }
  await reconciliarAnomalias();
  const [resolvedPlateCase] = await adminConnection.query(
    "SELECT present FROM anomaly_cases WHERE id = ?",
    [missingPlateCase[0].id],
  );
  assert.equal(Number(resolvedPlateCase[0].present), 0);
  const [belowLimit] = await adminConnection.query(
    `SELECT COUNT(*) AS total FROM anomaly_cases
     WHERE rule_key = 'unidad-placas-vigentes-duplicadas' AND present = 1`,
  );
  assert.equal(Number(belowLimit[0].total), 0);

  const thirdUpdated = await request(app)
    .patch(`/api/unidades/${unitIds[2]}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ placas2025: "HDC-824-H", placasVigentesAnio: new Date().getFullYear() });
  assert.equal(thirdUpdated.status, 200);

  const refreshed = await request(app)
    .get("/api/unidades?search=IT-001")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.find((unit) => unit.id === unitIds[0]).placas2025, longPlateText);

  await reconciliarAnomalias();
  const [duplicateCases] = await adminConnection.query(
    `SELECT action_url, evidence_json FROM anomaly_cases
     WHERE rule_key = 'unidad-placas-vigentes-duplicadas' AND present = 1`,
  );
  assert.equal(duplicateCases.length, 1);
  const evidence = typeof duplicateCases[0].evidence_json === "string"
    ? JSON.parse(duplicateCases[0].evidence_json)
    : duplicateCases[0].evidence_json;
  assert.equal(evidence.valorDuplicado, "HDC824H");
  assert.deepEqual(evidence.unidadIds.map(String).sort(), unitIds.sort());
  const actionUrl = new URL(duplicateCases[0].action_url, "http://localhost");
  assert.equal(actionUrl.searchParams.get("unidad"), unitIds[0]);
  assert.equal(actionUrl.searchParams.get("unidadesAnomalia").split(",").sort().join(","), unitIds.sort().join(","));
});

test("rechaza VIN duplicados aunque se escriban con puntuación o espacios distintos", { skip: !canRun }, async () => {
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico IN ('IT-001', 'IT-002') ORDER BY id",
  );
  assert.equal(units.length, 2);

  const duplicateCreate = await request(app)
    .post("/api/unidades")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ economico: "IT-VIN-DUPLICATE", numeroSerie: "IT SERIE 001" });
  assert.equal(duplicateCreate.status, 409);
  assert.match(duplicateCreate.body.mensaje, /VIN/i);

  const duplicateUpdate = await request(app)
    .patch(`/api/unidades/${units[1].id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ numeroSerie: "it.serie.001" });
  assert.equal(duplicateUpdate.status, 409);
  assert.match(duplicateUpdate.body.mensaje, /VIN/i);

  const [unchanged] = await adminConnection.query(
    "SELECT numero_serie FROM unidades WHERE id = ?",
    [units[1].id],
  );
  assert.equal(unchanged[0].numero_serie, "IT-SERIE-002");
});

test("guarda y recupera el perfil propio", { skip: !canRun }, async () => {
  const invalid = await request(app)
    .patch("/api/usuarios/perfil")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({
      nombre: "Jefe actualizado",
      email: "jefe.actualizado@example.test",
      celular: "5550000000",
      contactosAdicionales: [{ id: "invalid", etiqueta: "Contacto sin valor", valor: "" }],
    });
  assert.equal(invalid.status, 400);

  const response = await request(app)
    .patch("/api/usuarios/perfil")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({
      nombre: "Jefe actualizado",
      email: "jefe.actualizado@example.test",
      celular: "5550000000",
      contactosAdicionales: [{ id: "backup-mail", etiqueta: "Correo alternativo", valor: "respaldo@example.test" }],
    });
  assert.equal(response.status, 200);

  const profile = await request(app)
    .get("/api/usuarios/perfil")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.nombre, "Jefe actualizado");
  assert.equal(profile.body.email, "jefe.actualizado@example.test");
  assert.equal(profile.body.celular, "5550000000");
  assert.deepEqual(profile.body.contactosAdicionales, [
    { id: "backup-mail", etiqueta: "Correo alternativo", valor: "respaldo@example.test" },
  ]);
});

test("crea departamentos persistentes y rechaza nombres duplicados", { skip: !canRun }, async () => {
  const nombre = `Departamento creado ${Date.now()}`;
  const response = await request(app)
    .post("/api/departamentos")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ nombre });
  assert.equal(response.status, 201);
  assert.ok(response.body.id);

  const duplicate = await request(app)
    .post("/api/departamentos")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ nombre });
  assert.equal(duplicate.status, 409);

  const [rows] = await adminConnection.query("SELECT id FROM departamentos WHERE nombre = ?", [nombre]);
  assert.equal(rows.length, 1);
});

test("la importación de unidades es atómica e idempotente", { skip: !canRun }, async () => {
  const [units] = await adminConnection.query("SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1");
  const [department] = await adminConnection.query("SELECT id FROM departamentos ORDER BY id ASC LIMIT 1");
  const carga = {
    archivoHash: "a".repeat(64),
    contenidoHash: "b".repeat(64),
    nombreArchivo: "relacion-prueba.xlsx",
    actualizaciones: [{
      id: String(units[0].id),
      cambios: {
        placas: "IT-PLACA-NUEVA",
        cilindros: "8",
        tarjetaEdenred: "6363180031864901",
        nip: "0477",
      },
    }],
    altas: [{
      datos: {
        numeroSerie: "IT-SERIE-NUEVA",
        economico: "IT-003",
        departamentoId: department[0].id,
        cilindros: "4",
        tarjetaEdenred: "6363180031864901",
        nip: "0477",
      },
    }],
  };
  const response = await request(app)
    .post("/api/unidades/importacion-relacion")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(carga);
  assert.equal(response.status, 200);
  assert.equal(response.body.creadas.length, 1);
  assert.equal(Object.hasOwn(response.body.creadas[0].datos, "tarjetaEdenred"), false);
  assert.equal(Object.hasOwn(response.body.creadas[0].datos, "nip"), false);
  const [createdCredentials] = await adminConnection.query(
    "SELECT cilindros, tarjeta_edenred, nip_edenred, tarjeta_edenred_cifrada, nip_edenred_cifrado FROM unidades WHERE id = ?",
    [response.body.creadas[0].id],
  );
  assert.equal(createdCredentials[0].cilindros, "4");
  assert.equal(createdCredentials[0].tarjeta_edenred, "6363180031864901");
  assert.equal(createdCredentials[0].nip_edenred, "0477");
  assert.equal(createdCredentials[0].tarjeta_edenred_cifrada, null);
  assert.equal(createdCredentials[0].nip_edenred_cifrado, null);
  const [credentialRow] = await adminConnection.query(
    "SELECT cilindros, tarjeta_edenred, nip_edenred, tarjeta_edenred_cifrada, nip_edenred_cifrado FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(credentialRow[0].cilindros, "8");
  assert.equal(credentialRow[0].tarjeta_edenred, "6363180031864901");
  assert.equal(credentialRow[0].nip_edenred, "0477");
  assert.equal(credentialRow[0].tarjeta_edenred_cifrada, null);
  assert.equal(credentialRow[0].nip_edenred_cifrado, null);
  const generalUnitList = await request(app)
    .get("/api/unidades?search=IT-001")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(generalUnitList.status, 200);
  const listedUnit = generalUnitList.body.find((unit) => unit.id === String(units[0].id));
  assert.equal(Object.hasOwn(listedUnit, "tarjetaEdenred"), false);
  assert.equal(Object.hasOwn(listedUnit, "nip"), false);
  const credentials = await request(app)
    .get(`/api/unidades/${units[0].id}/credenciales-edenred`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(credentials.status, 200);
  assert.deepEqual(credentials.body, { tarjetaEdenred: "6363180031864901", nip: "0477" });
  const updateCredentials = await request(app)
    .patch(`/api/unidades/${units[0].id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      tarjetaEdenred: "6363180031864999",
      nip: "1593",
      kilometraje: 9876,
    });
  assert.equal(updateCredentials.status, 200);
  const updatedCredentials = await request(app)
    .get(`/api/unidades/${units[0].id}/credenciales-edenred`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(updatedCredentials.status, 200);
  assert.deepEqual(updatedCredentials.body, { tarjetaEdenred: "6363180031864999", nip: "1593" });
  const [updatedUnit] = await adminConnection.query(
    "SELECT kilometraje, placas FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(Number(updatedUnit[0].kilometraje), 9876);
  assert.equal(updatedUnit[0].placas, "IT-PLACA-NUEVA");
  const restoreUnit = await request(app)
    .patch(`/api/unidades/${units[0].id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ kilometraje: 0 });
  assert.equal(restoreUnit.status, 200);

  const repeat = await request(app)
    .post("/api/unidades/importacion-relacion")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(carga);
  assert.equal(repeat.status, 409);

  const primeraCarga = await request(app)
    .post("/api/unidades/importacion-relacion")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      archivoHash: "e".repeat(64),
      contenidoHash: "f".repeat(64),
      altas: [{
        datos: {
          numeroSerie: "IT-SERIE-PRIMER-PARQUE",
          economico: "IT-004",
          departamentoId: department[0].id,
        },
      }],
    });
  assert.equal(primeraCarga.status, 200);
  assert.equal(primeraCarga.body.creadas.length, 1);
  assert.notEqual(primeraCarga.body.creadas[0].id, "IT-SERIE-PRIMER-PARQUE");
  const [primeraUnidad] = await adminConnection.query(
    "SELECT id, economico FROM unidades WHERE numero_serie = ?",
    ["IT-SERIE-PRIMER-PARQUE"],
  );
  assert.equal(String(primeraUnidad[0].id), primeraCarga.body.creadas[0].id);
  assert.equal(primeraUnidad[0].economico, "IT-004");

  const failedCarga = {
    archivoHash: "c".repeat(64),
    contenidoHash: "d".repeat(64),
    actualizaciones: [{ id: String(units[0].id), cambios: { placas: "NO-DEBE-GUARDARSE" } }],
    altas: [{
      datos: {
        numeroSerie: "IT-SERIE-CON-DEPARTAMENTO-INVALIDO",
        economico: "IT-002",
        departamentoId: 999999,
      },
    }],
  };
  const failed = await request(app)
    .post("/api/unidades/importacion-relacion")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(failedCarga);
  assert.equal(failed.status, 400);

  const [unitAfterRollback] = await adminConnection.query("SELECT placas FROM unidades WHERE id = ?", [units[0].id]);
  const [failedRegistration] = await adminConnection.query(
    "SELECT archivo_hash FROM cargas_relacion_unidades WHERE archivo_hash = ?",
    [failedCarga.archivoHash],
  );
  assert.equal(unitAfterRollback[0].placas, "IT-PLACA-NUEVA");
  assert.equal(failedRegistration.length, 0);
});

test("persiste estados personales de anomalías y notificaciones", { skip: !canRun }, async () => {
  const anomaly = await request(app)
    .put("/api/anomalias/estados/it-anomalia")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ estado: "resuelta", visto: true });
  assert.equal(anomaly.status, 200);

  const notification = await request(app)
    .put("/api/notificaciones/estados/it-notificacion")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(notification.status, 200);

  const states = await request(app)
    .get("/api/anomalias/estados")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(states.body["it-anomalia"].estado, "resuelta");
  assert.equal(states.body["it-anomalia"].visto, true);

  const notifications = await request(app)
    .get("/api/notificaciones/estados")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(notifications.body["it-notificacion"], true);
});

test("los tres flujos de inicio de sesión validan credenciales y rol", { skip: !canRun }, async () => {
  const apv = await request(app)
    .post("/api/auth/login")
    .send({ rcf: "it-apv", password: "Test2026!", rol: "apv" });
  assert.equal(apv.status, 200);
  assert.equal(apv.body.usuario.rol, "apv");
  assert.ok(apv.body.token);

  const wrongRole = await request(app)
    .post("/api/auth/login")
    .send({ rcf: "it-apv", password: "Test2026!", rol: "stt" });
  assert.equal(wrongRole.status, 403);

  const stt = await request(app)
    .post("/api/auth/login-superadmin")
    .send({ usuario: "it-admin", password: "Test2026!" });
  assert.equal(stt.status, 200);
  assert.equal(stt.body.usuario.rol, "stt");

  const jefe = await request(app)
    .post("/api/auth/login-jefe-departamento")
    .send({ usuario: "it-jefe", password: "Test2026!", departamento: 999999 });
  assert.equal(jefe.status, 401);
});

test("un jefe no puede consultar ni registrar operaciones de otra unidad departamental", { skip: !canRun }, async () => {
  const units = await request(app)
    .get("/api/unidades")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(units.status, 200);
  assert.equal(units.body.some((unit) => String(unit.id) === String(foreignUnitId)), false);

  const ticket = await request(app)
    .post("/api/tickets-combustible")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({
      unidadId: foreignUnitId,
      fechaHora: "2026-09-24T12:00:00.000Z",
      litros: 10,
      importe: 250,
      urlTicketBomba: "/api/uploads/11111111-1111-4111-8111-111111111111.pdf",
    });
  assert.equal(ticket.status, 403);

  const report = await request(app)
    .post("/api/reportes")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ unidadesIds: [foreignUnitId], descripcion: "Intento controlado de cruce departamental" });
  assert.equal(report.status, 403);
});

test("STT puede crear una credencial y la contraseña se almacena como hash", { skip: !canRun }, async () => {
  const created = await request(app)
    .post("/api/usuarios")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      nombre: "Usuario de integración",
      usuario: "it-usuario",
      email: "it-usuario@example.test",
      celular: "5551111111",
      password: "Nueva2026!",
      rol: "apv",
      activo: true,
    });
  assert.equal(created.status, 201);

  const [rows] = await adminConnection.query(
    "SELECT password_hash, debe_cambiar_password FROM usuarios WHERE id = ?",
    [created.body.id],
  );
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].password_hash, "Nueva2026!");
  assert.equal(rows[0].debe_cambiar_password, 1);
});

test("un jefe puede crear seguimiento en su reporte y el seguimiento persiste", { skip: !canRun }, async () => {
  const [ownUnits] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  const report = await request(app)
    .post("/api/reportes")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ unidadesIds: [ownUnits[0].id], descripcion: "Reporte de integración" });
  assert.equal(report.status, 201);

  const followUp = await request(app)
    .post(`/api/reportes/${report.body.id}/seguimiento`)
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ mensaje: "Seguimiento de prueba persistente" });
  assert.equal(followUp.status, 201);

  const [rows] = await adminConnection.query(
    "SELECT mensaje, usuario_id FROM reporte_seguimiento WHERE reporte_id = ?",
    [report.body.id],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mensaje, "Seguimiento de prueba persistente");
});

test("un ticket válido persiste para una unidad del departamento", { skip: !canRun }, async () => {
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  const ticket = await request(app)
    .post("/api/tickets-combustible")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({
      unidadId: units[0].id,
      fechaHora: "2026-09-24T12:00:00.000Z",
      litros: 10,
      importe: 250,
      urlTicketBomba: "/api/uploads/11111111-1111-4111-8111-111111111111.pdf",
    });
  assert.equal(ticket.status, 201);

  const [rows] = await adminConnection.query(
    "SELECT unidad_id, litros, importe FROM tickets_combustible WHERE id = ?",
    [ticket.body.id],
  );
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].litros), 10);
  assert.equal(Number(rows[0].importe), 250);
});

test("una carga Edenred inválida revierte la transacción completa", { skip: !canRun }, async () => {
  const before = await adminConnection.query("SELECT COUNT(*) AS total FROM cargas_edenred");
  const response = await request(app)
    .post("/api/edenred/cargas")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      periodo: [{ mes: "2026-09" }],
      transacciones: [],
      resumenAplicado: [{ unidadId: 999999, mes: "2026-09", km: 100, litros: 20, importe: 500 }],
    });
  assert.equal(response.status, 400);
  const after = await adminConnection.query("SELECT COUNT(*) AS total FROM cargas_edenred");
  assert.equal(Number(after[0][0].total), Number(before[0][0].total));
});

test("una carga Edenred válida confirma carga e historial de unidad", { skip: !canRun }, async () => {
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  const response = await request(app)
    .post("/api/edenred/cargas")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      periodo: [{ mes: "2026-09" }],
      transacciones: [{ Placa: "IT-001", "Cantidad Mercancía": 20 }],
      resumenAplicado: [{
        unidadId: units[0].id,
        mes: "2026-09",
        km: 100,
        litros: 20,
        importe: 500,
        kilometrajeAplicado: 1000,
        tipoCombustibleAnterior: null,
        tipoCombustible: "DIESEL",
      }],
    });
  assert.equal(response.status, 201);

  const [loads] = await adminConnection.query(
    "SELECT id FROM cargas_edenred WHERE id = ?",
    [response.body.id],
  );
  const [unitRows] = await adminConnection.query(
    "SELECT kilometraje, tipo_combustible, historial_json FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(loads.length, 1);
  assert.equal(Number(unitRows[0].kilometraje), 1000);
  assert.equal(unitRows[0].tipo_combustible, "DIESEL");
  assert.equal(JSON.parse(unitRows[0].historial_json)[0].litros, 20);
});

test("el rollback Edenred mantiene el último estado vigente al borrar cargas fuera de orden", { skip: !canRun }, async () => {
  const [units] = await adminConnection.query(
    "SELECT id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  async function crearCarga({ comprobante, kilometrajeAnterior, kilometrajeAplicado, tipoAnterior, tipo }) {
    const response = await request(app)
      .post("/api/edenred/cargas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        periodo: ["2026-10"],
        transacciones: [{ Placa: "IT-PLATE-ROLLBACK", "No Comprobante": comprobante }],
        resumenAplicado: [{
          unidadId: units[0].id,
          mes: "2026-10",
          km: 100,
          litros: 10,
          importe: 200,
          kilometrajeAnterior,
          kilometrajeAplicado,
          tipoCombustibleAnterior: tipoAnterior,
          tipoCombustible: tipo,
        }],
      });
    assert.equal(response.status, 201);
    return response.body.id;
  }
  const primeraCarga = await crearCarga({
    comprobante: "ROLLBACK-1",
    kilometrajeAnterior: 1000,
    kilometrajeAplicado: 1100,
    tipoAnterior: "DIESEL",
    tipo: "MAGNA",
  });
  const segundaCarga = await crearCarga({
    comprobante: "ROLLBACK-2",
    kilometrajeAnterior: 1100,
    kilometrajeAplicado: 1200,
    tipoAnterior: "MAGNA",
    tipo: "G SUPER",
  });

  const eliminarPrimera = await request(app)
    .delete(`/api/edenred/cargas/${primeraCarga}`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(eliminarPrimera.status, 200);
  const [estadoIntermedio] = await adminConnection.query(
    "SELECT kilometraje, tipo_combustible FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(Number(estadoIntermedio[0].kilometraje), 1200);
  assert.equal(estadoIntermedio[0].tipo_combustible, "G SUPER");

  const eliminarSegunda = await request(app)
    .delete(`/api/edenred/cargas/${segundaCarga}`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(eliminarSegunda.status, 200);
  const [estadoFinal] = await adminConnection.query(
    "SELECT kilometraje, tipo_combustible FROM unidades WHERE id = ?",
    [units[0].id],
  );
  assert.equal(Number(estadoFinal[0].kilometraje), 1000);
  assert.equal(estadoFinal[0].tipo_combustible, "DIESEL");
});

test("los casos de anomalía notifican, respetan departamento y reabren al reaparecer", { skip: !canRun }, async () => {
  const { reconciliarAnomalias } = await import("../src/services/anomalyCaseService.js");
  await reconciliarAnomalias();
  const [ownUnits] = await adminConnection.query(
    "SELECT id, departamento_id FROM unidades WHERE economico = 'IT-001' LIMIT 1",
  );
  await adminConnection.query(
    "UPDATE unidades SET placas = 'IT-PLATE-001' WHERE id = ?",
    [ownUnits[0].id],
  );
  await adminConnection.query(
    "UPDATE unidades SET economico = 'IT-001', placas = 'IT-PLATE-002' WHERE id = ?",
    [foreignUnitId],
  );

  await reconciliarAnomalias();
  const [caseRows] = await adminConnection.query(
    `SELECT id, case_key, status, present, generation, action_url
     FROM anomaly_cases
     WHERE rule_key = 'unidad-economico-duplicado' AND present = 1
     LIMIT 1`,
  );
  assert.equal(caseRows.length, 1);
  const anomalyCase = caseRows[0];
  assert.ok(anomalyCase.action_url.startsWith("/indice-unidades?anomaly="));
  const highlightedUnitIds = new URL(anomalyCase.action_url, "http://localhost")
    .searchParams.get("unidadesAnomalia")
    .split(",")
    .sort();
  assert.deepEqual(highlightedUnitIds, [String(ownUnits[0].id), String(foreignUnitId)].sort());

  const listed = await request(app)
    .get("/api/anomalias/casos")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(listed.status, 200);
  assert.ok(listed.body.some((item) => item.id === String(anomalyCase.id)));

  const [acknowledgedCase] = await adminConnection.query(
    `INSERT INTO anomaly_cases
      (case_key, rule_key, rule_version, type, category, severity, title, detail,
       evidence_json, department_ids_json, action_url, target_id, present, status, generation)
     VALUES (?, 'integration-alert', 1, 'transaccion-atipica', 'transacciones', 'media',
       'Alerta de integración', 'Alerta de integración para marcar como vista.',
       ?, ?, '/indice-unidades', ?, 1, 'nueva', 1)`,
    [
      "d".repeat(64),
      JSON.stringify({ id: "test-alerta-global" }),
      JSON.stringify([Number(ownUnits[0].departamento_id)]),
      String(ownUnits[0].id),
    ],
  );
  const markSeen = await request(app)
    .post("/api/anomalias/casos/marcar-vistas")
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ findingIds: ["test-alerta-global"] });
  assert.equal(markSeen.status, 200);
  const [acknowledgementRows] = await adminConnection.query(
    "SELECT status, generation, acknowledged_generation, acknowledged_by FROM anomaly_cases WHERE id = ?",
    [acknowledgedCase.insertId],
  );
  assert.equal(acknowledgementRows[0].status, "resuelta");
  assert.equal(Number(acknowledgementRows[0].acknowledged_generation), Number(acknowledgementRows[0].generation));
  assert.ok(Number(acknowledgementRows[0].acknowledged_by) > 0);
  const refreshedCases = await request(app)
    .get("/api/anomalias/casos")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(refreshedCases.body.find((item) => item.id === String(acknowledgedCase.insertId)).acknowledged, true);
  await adminConnection.query(
    "UPDATE anomaly_cases SET generation = generation + 1, status = 'nueva', resolved_at = NULL WHERE id = ?",
    [acknowledgedCase.insertId],
  );
  const nextGenerationCases = await request(app)
    .get("/api/anomalias/casos")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(nextGenerationCases.body.find((item) => item.id === String(acknowledgedCase.insertId)).acknowledged, false);

  const review = await request(app)
    .put(`/api/anomalias/casos/${anomalyCase.id}/estado`)
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ estado: "en_revision", nota: "Revisión de duplicidad de integración" });
  assert.equal(review.status, 200);

  const prematureResolution = await request(app)
    .put(`/api/anomalias/casos/${anomalyCase.id}/estado`)
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ estado: "resuelta", nota: "Intento antes de corregir" });
  assert.equal(prematureResolution.status, 409);

  const [notifications] = await adminConnection.query(
    `SELECT COUNT(*) AS total, MAX(action_url) AS action_url, MAX(detalle) AS detalle
     FROM notificaciones
     WHERE tipo = 'anomalia' AND entidad_id = ?`,
    [String(anomalyCase.id)],
  );
  assert.ok(Number(notifications[0].total) >= 2);
  assert.ok(notifications[0].action_url.startsWith("/indice-unidades?anomaly="));
  assert.match(notifications[0].detalle, /registrado en 2 unidades/i);

  await adminConnection.query(
    "UPDATE unidades SET economico = 'IT-002' WHERE id = ?",
    [foreignUnitId],
  );
  await reconciliarAnomalias();
  const [cleared] = await adminConnection.query(
    "SELECT present, status FROM anomaly_cases WHERE id = ?",
    [anomalyCase.id],
  );
  assert.equal(Number(cleared[0].present), 0);
  assert.equal(cleared[0].status, "resuelta");

  await adminConnection.query(
    "UPDATE unidades SET placas = NULL WHERE id = ?",
    [foreignUnitId],
  );
  await reconciliarAnomalias();
  const [foreignCases] = await adminConnection.query(
    `SELECT id, action_url FROM anomaly_cases
     WHERE rule_key = 'unidad-dato-incompleto' AND entity_id = ? AND present = 1
     LIMIT 1`,
    [String(foreignUnitId)],
  );
  assert.equal(foreignCases.length, 1);
  const foreignActionUrl = new URL(foreignCases[0].action_url, "http://localhost");
  assert.equal(foreignActionUrl.searchParams.get("unidad"), String(foreignUnitId));
  assert.equal(foreignActionUrl.searchParams.get("unidadesAnomalia"), String(foreignUnitId));
  const foreignCaseEvents = await request(app)
    .get(`/api/anomalias/casos/${foreignCases[0].id}/eventos`)
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(foreignCaseEvents.status, 403);
  const foreignCaseUpdate = await request(app)
    .put(`/api/anomalias/casos/${foreignCases[0].id}/estado`)
    .set("Authorization", `Bearer ${jefeToken}`)
    .send({ estado: "en_revision", nota: "Intento fuera de departamento" });
  assert.equal(foreignCaseUpdate.status, 403);
  const scopedCases = await request(app)
    .get("/api/anomalias/casos")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(scopedCases.status, 200);
  assert.equal(scopedCases.body.some((item) => item.id === String(foreignCases[0].id)), false);

  await adminConnection.query(
    "UPDATE unidades SET placas = 'IT-PLATE-002' WHERE id = ?",
    [foreignUnitId],
  );
  await reconciliarAnomalias();
  await adminConnection.query(
    "UPDATE unidades SET economico = 'IT-001' WHERE id = ?",
    [foreignUnitId],
  );
  await reconciliarAnomalias();
  const [reopened] = await adminConnection.query(
    "SELECT present, status, generation FROM anomaly_cases WHERE id = ?",
    [anomalyCase.id],
  );
  assert.equal(Number(reopened[0].present), 1);
  assert.equal(reopened[0].status, "nueva");
  assert.equal(Number(reopened[0].generation), 2);
});

test("un token queda revocado cuando cambia la versión de sesión", { skip: !canRun }, async () => {
  await adminConnection.query("UPDATE usuarios SET session_version = session_version + 1 WHERE usuario = 'it-admin'");
  const response = await request(app)
    .get("/api/usuarios/perfil")
    .set("Authorization", `******`);
  assert.equal(response.status, 401);
});
