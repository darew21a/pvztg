import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const databaseName = String(process.env.DB_NAME || "pvztg").trim();
if (!/^[A-Za-z0-9_$-]+$/.test(databaseName)) {
  throw new Error("DB_NAME contiene caracteres no permitidos.");
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  console.log(`Base de datos lista: ${databaseName}`);
} finally {
  await connection.end();
}
