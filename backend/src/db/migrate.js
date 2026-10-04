import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "../config/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(here, "migrations");

function statementsFromSql(sql) {
  return sql
    .replace(/^\s*CREATE DATABASE.*?;\s*/is, "")
    .replace(/^\s*USE\s+\w+\s*;\s*/im, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function runMigrations() {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(120) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => /^\d+[-_].+\.sql$/i.test(file))
    .sort();

  for (const file of files) {
    const [alreadyApplied] = await pool.query(
      "SELECT version FROM schema_migrations WHERE version = ? LIMIT 1",
      [file],
    );
    if (alreadyApplied.length > 0) continue;

    const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statementsFromSql(sql)) {
        await connection.query(statement);
      }
      await connection.query("INSERT INTO schema_migrations (version) VALUES (?)", [file]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw new Error(`Migración ${file} falló: ${error.message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      console.log("Migraciones aplicadas correctamente.");
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
