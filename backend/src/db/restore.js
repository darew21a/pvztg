import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { splitBackupStatements } from "./backupSql.js";
import { validateBackupFile } from "./validateBackup.js";

const backupFile = process.env.BACKUP_FILE;
const targetDatabase = process.env.RESTORE_TARGET_DB;
const sourceDatabase = process.env.DB_NAME || "pvztg";

if (!backupFile || !targetDatabase) {
  throw new Error("BACKUP_FILE y RESTORE_TARGET_DB son obligatorios.");
}
if (targetDatabase === sourceDatabase && process.env.RESTORE_ALLOW_PRODUCTION !== "true") {
  throw new Error("La restauración sobre DB_NAME está bloqueada. Usa una base temporal o RESTORE_ALLOW_PRODUCTION=true.");
}

const validation = await validateBackupFile(backupFile);
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: targetDatabase,
  multipleStatements: true,
});

try {
  const sql = await fs.readFile(validation.file, "utf8");
  const statements = splitBackupStatements(sql);
  for (let index = 0; index < statements.length; index += 1) {
    try {
      await connection.query(statements[index]);
    } catch (error) {
      const code = typeof error.code === "string" ? ` (${error.code})` : "";
      throw new Error(`Backup restore failed at statement ${index + 1}${code}.`);
    }
  }
  console.log(`Restauración completada en la base temporal/autorizada: ${targetDatabase}`);
} finally {
  await connection.end();
}
