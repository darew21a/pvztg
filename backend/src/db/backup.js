import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/db.js";
import { validateBackupFile } from "./validateBackup.js";

const outputDirectory = process.env.BACKUP_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backups");

export async function createAndValidateBackup() {
  await fs.mkdir(outputDirectory, { recursive: true });
  const [tables] = await pool.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const lines = [`-- PV-ZTG backup ${new Date().toISOString()}`, "SET FOREIGN_KEY_CHECKS=0;"];
  for (const row of tables) {
    const table = Object.values(row)[0];
    const [[definition]] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = definition["Create Table"];
    const [records] = await pool.query(`SELECT * FROM \`${table}\``);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`, `${createSql};`);
    for (const record of records) {
      const columns = Object.keys(record).map((column) => `\`${column}\``).join(", ");
      const values = Object.values(record).map((value) => pool.escape(value)).join(", ");
      lines.push(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});`);
    }
  }
  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  const file = path.join(outputDirectory, `pvztg-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`);
  await fs.writeFile(file, `${lines.join("\n")}\n`, "utf8");
  await validateBackupFile(file);
  console.log(`Backup creado: ${file}`);
  return { file, bytes: (await fs.stat(file)).size };
}

if (process.argv[1]?.endsWith("backup.js")) {
  createAndValidateBackup().finally(() => pool.end());
}
