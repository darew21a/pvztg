import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(currentDirectory, "../../../src/data/unidades.json");
const unidades = JSON.parse(await fs.readFile(sourcePath, "utf8"));

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pvztg",
});

let insertadas = 0;
for (const unidad of unidades) {
  await connection.execute(
    `INSERT INTO unidades
      (numero_serie, economico, placas, marca, submarca, tipo, modelo,
       kilometraje, tipo_combustible, estado, conductor_asignado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       economico = VALUES(economico), placas = VALUES(placas), marca = VALUES(marca),
       submarca = VALUES(submarca), tipo = VALUES(tipo), modelo = VALUES(modelo),
       kilometraje = VALUES(kilometraje), tipo_combustible = VALUES(tipo_combustible),
       estado = VALUES(estado), conductor_asignado = VALUES(conductor_asignado)`,
    [
      unidad.numeroSerie,
      unidad.economico || null,
      unidad.placas || null,
      unidad.marca || null,
      unidad.submarca || null,
      unidad.tipo || null,
      unidad.modelo || null,
      unidad.kilometraje ? Number(unidad.kilometraje) : 0,
      unidad.tipoCombustible || null,
      unidad.estado || "en-estacion",
      unidad.conductorAsignado || null,
    ],
  );
  insertadas += 1;
}

console.log(`${insertadas} unidades sincronizadas en MariaDB.`);
await connection.end();
