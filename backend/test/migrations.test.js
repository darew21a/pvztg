import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations",
);

async function getMigrationFiles() {
  return (await fs.readdir(migrationsDirectory))
    .filter((file) => /^\d+[-_].+\.sql$/i.test(file))
    .sort();
}

test("las migraciones son ordenadas y no cambian de base de datos", async () => {
  const files = await getMigrationFiles();

  assert.ok(files.length > 0);
  assert.equal(files[0], "000-initial-schema.sql");
  assert.ok(files.includes("002-performance-indexes.sql"));
  assert.ok(files.includes("008-retire-password-recovery.sql"));
  assert.ok(files.includes("009-anomaly-case-lifecycle.sql"));
  assert.ok(files.includes("010-ecosystem-persistence.sql"));
  assert.ok(files.includes("011-current-year-plates.sql"));
  assert.ok(files.includes("012-profile-additional-contacts.sql"));
  assert.ok(files.includes("013-expand-current-year-plate-text.sql"));
  assert.ok(files.includes("014-backfill-current-year-plates.sql"));
  assert.ok(files.includes("015-optional-second-custodian-requirement.sql"));
  assert.ok(files.includes("016-user-profile-photo.sql"));
  assert.ok(files.includes("017-fleet-edenred-credentials.sql"));
  assert.ok(files.includes("018-edenred-credentials-plaintext.sql"));
  assert.ok(files.includes("019-global-anomaly-acknowledgement.sql"));

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
    assert.doesNotMatch(sql, /\bCREATE\s+DATABASE\b/i, file);
    assert.doesNotMatch(sql, /^\s*USE\s+/im, file);
  }
});

test("la migración 019 registra el reconocimiento global por generación de anomalía", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "019-global-anomaly-acknowledgement.sql"),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN acknowledged_generation INT UNSIGNED NULL/i);
  assert.match(sql, /ADD COLUMN acknowledged_at DATETIME NULL/i);
  assert.match(sql, /ADD COLUMN acknowledged_by INT NULL/i);
});

test("la migración 017 agrega cilindros y almacenamiento cifrado de Edenred", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "017-fleet-edenred-credentials.sql"),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN cilindros VARCHAR\(30\) NULL/i);
  assert.match(sql, /ADD COLUMN tarjeta_edenred_cifrada TEXT NULL/i);
  assert.match(sql, /ADD COLUMN nip_edenred_cifrado TEXT NULL/i);
});

test("la migración 018 agrega columnas de texto normal para Edenred", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "018-edenred-credentials-plaintext.sql"),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN tarjeta_edenred TEXT NULL/i);
  assert.match(sql, /ADD COLUMN nip_edenred TEXT NULL/i);
});

test("la migración 016 agrega almacenamiento para la foto de perfil del usuario", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "016-user-profile-photo.sql"),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE usuarios/i);
  assert.match(sql, /ADD COLUMN foto_perfil_url VARCHAR\(500\) NULL/i);
});

test("la migración 012 persiste los contactos adicionales del perfil", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "012-profile-additional-contacts.sql"),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE usuarios/i);
  assert.match(sql, /ADD COLUMN contactos_adicionales_json JSON NULL/i);
});

test("la migración 013 permite conservar texto libre en placas vigentes", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "013-expand-current-year-plate-text.sql"),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE unidades/i);
  assert.match(sql, /MODIFY COLUMN placas_2025 TEXT NULL/i);
});

test("la migración 014 reconoce como vigentes los textos existentes sin año asociado", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "014-backfill-current-year-plates.sql"),
    "utf8",
  );
  assert.match(sql, /SET placas_vigentes_anio = YEAR\(CURRENT_DATE\)/i);
  assert.match(sql, /placas_vigentes_anio IS NULL/i);
  assert.match(sql, /placas_2025 IS NOT NULL/i);
  assert.match(sql, /TRIM\(placas_2025\) <> ''/i);
});

test("la migración 015 persiste si una unidad requiere un segundo resguardante", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "015-optional-second-custodian-requirement.sql"),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE unidades/i);
  assert.match(sql, /ADD COLUMN requiere_resguardante_2 TINYINT\(1\) NOT NULL DEFAULT 0/i);
});

test("la migración 010 persiste documentos de unidad e indexa su historial", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "010-ecosystem-persistence.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS unidad_documentos/i);
  assert.match(sql, /FOREIGN KEY \(unidad_id\) REFERENCES unidades\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /idx_unidad_documentos_historial/i);
  assert.match(sql, /idx_unidades_departamento_activo_id/i);
  assert.match(sql, /aplicado_at DATETIME\(6\)/i);
});

test("la migración 009 crea casos, eventos e idempotencia para avisos", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "009-anomaly-case-lifecycle.sql"),
    "utf8",
  );

  for (const table of ["anomaly_cases", "anomaly_case_events", "anomaly_reconciliation"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"));
  }
  assert.match(sql, /case_key CHAR\(64\) NOT NULL UNIQUE/i);
  assert.match(sql, /ADD COLUMN action_url VARCHAR\(255\)/i);
  assert.match(sql, /CREATE UNIQUE INDEX uq_notificaciones_usuario_dedupe/i);
  assert.match(sql, /generation INT UNSIGNED NOT NULL DEFAULT 1/i);
  assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS anomaly_case_events/gi) ?? []).length, 1);
});

test("la migración retira la tabla de tokens del flujo de recuperación deshabilitado", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "008-retire-password-recovery.sql"),
    "utf8",
  );
  assert.match(sql, /DROP TABLE IF EXISTS recuperacion_password/i);
});

test("la migración 006 no duplica el índice único creado por la migración 005", async () => {
  const previousMigration = await fs.readFile(
    path.join(migrationsDirectory, "005-import-idempotency.sql"),
    "utf8",
  );
  const migration = await fs.readFile(
    path.join(migrationsDirectory, "006-relation-content-hash.sql"),
    "utf8",
  );

  assert.match(previousMigration, /CREATE UNIQUE INDEX uq_cargas_relacion_contenido_hash/i);
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX uq_cargas_relacion_contenido_hash/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS contenido_hash/i);
});

test("la migración de rendimiento define índices para filtros y estados frecuentes", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "002-performance-indexes.sql"),
    "utf8",
  );

  for (const index of [
    "idx_unidades_departamento_activo",
    "idx_reportes_departamento_created",
    "idx_tickets_unidad_fecha_created",
    "idx_anomalias_usuario_visto",
    "idx_notificaciones_usuario_visto",
  ]) {
    assert.match(sql, new RegExp(`CREATE INDEX ${index}\\b`, "i"));
  }
});

test("la migración inicial contiene las tablas operativas fundamentales", async () => {
  const sql = await fs.readFile(
    path.join(migrationsDirectory, "000-initial-schema.sql"),
    "utf8",
  );

  for (const table of ["usuarios", "departamentos", "unidades", "reportes", "tickets_combustible"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"));
  }
});

test("la utilidad de paginación limita páginas y tamaños", async () => {
  const { parsePagination } = await import("../src/utils/pagination.js");

  assert.deepEqual(parsePagination({}), { page: 1, limit: 50, offset: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "9999" }), { page: 3, limit: 200, offset: 400 });
  assert.deepEqual(parsePagination({ page: "-1", limit: "0" }), { page: 1, limit: 50, offset: 0 });
});
