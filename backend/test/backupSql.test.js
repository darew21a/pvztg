import assert from "node:assert/strict";
import { test } from "node:test";
import { splitBackupStatements } from "../src/db/backupSql.js";

test("backup statements split by line without splitting semicolons inside values", () => {
  const sql = [
    "SET FOREIGN_KEY_CHECKS=0;",
    "CREATE TABLE sample (",
    "  value TEXT",
    ");",
    "INSERT INTO sample (value) VALUES ('left; right');",
    "SET FOREIGN_KEY_CHECKS=1;",
  ].join("\r\n");

  assert.deepEqual(splitBackupStatements(sql), [
    "SET FOREIGN_KEY_CHECKS=0",
    "CREATE TABLE sample (\r\n  value TEXT\r\n)",
    "INSERT INTO sample (value) VALUES ('left; right')",
    "SET FOREIGN_KEY_CHECKS=1",
  ]);
});

test("backup statement splitter rejects non-string input", () => {
  assert.throws(() => splitBackupStatements(null), TypeError);
});
