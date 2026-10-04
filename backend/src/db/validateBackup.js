import fs from "node:fs/promises";

const backupFile = process.env.BACKUP_FILE;

export async function validateBackupFile(file = backupFile) {
  if (!file) throw new Error("BACKUP_FILE es obligatorio.");

  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size < 100) {
    throw new Error("El archivo de backup no existe o está vacío.");
  }

  const sql = await fs.readFile(file, "utf8");
  const requiredMarkers = [
    "SET FOREIGN_KEY_CHECKS=0;",
    "SET FOREIGN_KEY_CHECKS=1;",
    "CREATE TABLE",
  ];
  const missingMarker = requiredMarkers.find((marker) => !sql.includes(marker));
  if (missingMarker) {
    throw new Error(`El backup no tiene la estructura esperada: falta ${missingMarker}.`);
  }
  if (/\b(CREATE|DROP)\s+DATABASE\b|\bUSE\s+[`"']?\w+/i.test(sql)) {
    throw new Error("El backup contiene instrucciones de cambio de base de datos y fue rechazado.");
  }

  return { file, bytes: stat.size };
}

if (process.argv[1]?.endsWith("validateBackup.js")) {
  validateBackupFile()
    .then(({ file, bytes }) => console.log(`Backup válido: ${file} (${bytes} bytes)`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
