export function splitBackupStatements(sql) {
  if (typeof sql !== "string") {
    throw new TypeError("Backup SQL must be a string.");
  }

  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
