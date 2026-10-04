import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pvztg",
});

const passwordHash = await bcrypt.hash("CFE2026!", 10);
const resetExistingPasswords = process.env.SEED_RESET_PASSWORDS === "true";

const departamentos = [
  { nombre: "Jefatura", icono: "badge", orden: 1 },
  { nombre: "Líneas", icono: "power", orden: 2 },
  { nombre: "Subestaciones", icono: "electrical_services", orden: 3 },
  { nombre: "Protecciones", icono: "shield", orden: 4 },
  { nombre: "Comunicaciones", icono: "cell_tower", orden: 5 },
  { nombre: "Control", icono: "settings_input_antenna", orden: 6 },
  { nombre: "Ixtapa Potencia", icono: "bolt", orden: 7 },
  { nombre: "Chilpancingo Potencia", icono: "bolt", orden: 8 },
  { nombre: "Zona de Operación de Transmisión Guerrero-Morelos", icono: "hub", orden: 9 },
];

const nombresOficiales = departamentos.map(({ nombre }) => nombre);
const marcadores = nombresOficiales.map(() => "?").join(", ");
await connection.execute(`UPDATE usuarios SET departamento_id = NULL WHERE departamento_id IN (
  SELECT id FROM (SELECT id FROM departamentos WHERE nombre NOT IN (${marcadores})) AS obsoletos
)`, nombresOficiales);
await connection.execute(`UPDATE unidades SET departamento_id = NULL WHERE departamento_id IN (
  SELECT id FROM (SELECT id FROM departamentos WHERE nombre NOT IN (${marcadores})) AS obsoletos
)`, nombresOficiales);
await connection.execute(`DELETE FROM departamentos WHERE nombre NOT IN (${marcadores})`, nombresOficiales);

for (const dept of departamentos) {
  await connection.execute(
    `INSERT INTO departamentos (nombre, icono, orden)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE icono = VALUES(icono), orden = VALUES(orden), activo = 1`,
    [dept.nombre, dept.icono, dept.orden],
  );
}

const [rows] = await connection.execute("SELECT id, nombre FROM departamentos");
const deptMap = new Map(rows.map((row) => [row.nombre, row.id]));

const usuarios = [
  {
    nombre: "Super Administrador STT",
    usuario: "sttadmin",
    email: "stt@cfe.mx",
    password_hash: passwordHash,
    rol: "stt",
    departamento_id: null,
    activo: 1,
    debe_cambiar_password: 1,
  },
  {
    nombre: "Administrador APV",
    usuario: "apvadmin",
    email: "apv@cfe.mx",
    password_hash: passwordHash,
    rol: "apv",
    departamento_id: null,
    activo: 1,
    debe_cambiar_password: 1,
  },
  {
    nombre: "Jefe de Departamento",
    usuario: "jefedepartamento",
    email: "jefe@cfe.mx",
    password_hash: passwordHash,
    rol: "jefe-departamento",
    departamento_id: deptMap.get("Jefatura") ?? null,
    activo: 1,
    debe_cambiar_password: 1,
  },
];

for (const usuario of usuarios) {
  const updatePassword = resetExistingPasswords
    ? ", password_hash = VALUES(password_hash), debe_cambiar_password = VALUES(debe_cambiar_password), password_changed_at = NULL"
    : "";
  await connection.execute(
    `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, departamento_id, activo, debe_cambiar_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), email = VALUES(email), rol = VALUES(rol),
       departamento_id = VALUES(departamento_id), activo = VALUES(activo)${updatePassword}`,
    [usuario.nombre, usuario.usuario, usuario.email, usuario.password_hash, usuario.rol, usuario.departamento_id, usuario.activo, usuario.debe_cambiar_password],
  );
}

console.log("Seed ejecutado correctamente. Las credenciales por defecto son: sttadmin / apvadmin / jefedepartamento con la contraseña CFE2026!");

await connection.end();
