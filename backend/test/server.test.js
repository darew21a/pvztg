import assert from "node:assert/strict";
import { after, test } from "node:test";
import express from "express";
import request from "supertest";
import { createAccessToken } from "../src/middleware/auth.js";
import authRoutes from "../src/routes/auth.routes.js";
import { pool } from "../src/config/db.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
process.env.METRICS_TOKEN = "test-metrics-token";

const { app } = await import("../src/server.js");
const authOnlyApp = express();
authOnlyApp.use("/api", authRoutes);
const adminToken = createAccessToken({
  id: 1,
  rol: "stt",
  usuario: "test-admin",
  nombre: "Administrador de prueba",
});
const jefeToken = createAccessToken({
  id: 2,
  rol: "jefe-departamento",
  usuario: "test-jefe",
  nombre: "Jefatura de prueba",
  departamento_id: 7,
});

after(async () => {
  await pool.end();
});

test("health reporta que el backend está disponible", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "pvztg-backend");
});

test("los endpoints del flujo de recuperación retirado ya no están disponibles", async () => {
  for (const path of [
    "/api/auth/recuperacion/solicitar",
    "/api/auth/recuperacion/verificar",
    "/api/auth/recuperacion/restablecer",
  ]) {
    const response = await request(authOnlyApp).post(path);
    assert.equal(response.status, 404, path);
  }
});

test("version reporta metadatos no sensibles del proceso", async () => {
  const response = await request(app).get("/api/version");

  assert.equal(response.status, 200);
  assert.equal(response.body.service, "pvztg-backend");
  assert.equal(typeof response.body.version, "string");
  assert.equal(typeof response.body.startedAt, "string");
  assert.equal("JWT_SECRET" in response.body, false);
  assert.equal("DB_PASSWORD" in response.body, false);
});

test("métricas requiere token y reporta solicitudes HTTP", async () => {
  const unauthorized = await request(app).get("/api/metrics");
  assert.equal(unauthorized.status, 404);

  const response = await request(app)
    .get("/api/metrics")
    .set("x-metrics-token", process.env.METRICS_TOKEN);

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.totalRequests, "number");
  assert.equal(typeof response.body.totalErrors, "number");
  assert.equal(typeof response.body.byPath["/api/metrics"], "object");
  assert.equal(typeof response.body.latencyMs.p95, "number");
});

test("health readiness refleja el estado real de MySQL", async () => {
  const response = await request(app).get("/api/health/ready");

  assert.ok([200, 503].includes(response.status));
  if (response.status === 503) {
    assert.equal(response.body.ok, false);
    assert.equal(response.body.database, "unavailable");
  } else {
    assert.equal(response.body.ok, true);
    assert.equal(response.body.database, "ready");
  }
});

test("perfil requiere autenticación", async () => {
  const response = await request(app).get("/api/usuarios/perfil");

  assert.equal(response.status, 401);
  assert.match(response.body.mensaje, /token/i);
});

test("una ruta protegida no acepta un esquema de autorización inválido", async () => {
  const response = await request(app)
    .get("/api/notificaciones/estados")
    .set("Authorization", "Basic invalid-token");

  assert.equal(response.status, 401);
});

test("un identificador de departamento inválido se rechaza antes de consultar unidades", async () => {
  const response = await request(app)
    .get("/api/unidades?departamentoId=no-es-un-id")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /departamento/i);
});

test("un identificador de unidad inválido se rechaza al actualizar", async () => {
  const response = await request(app)
    .patch("/api/unidades/no-es-un-id")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ estado: "en-estacion" });

  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /unidad/i);
});

test("las credenciales Edenred sólo pueden solicitarlas roles administrativos", async () => {
  const adminResponse = await request(app)
    .get("/api/unidades/no-es-un-id/credenciales-edenred")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminResponse.status, 400);

  const jefeResponse = await request(app)
    .get("/api/unidades/1/credenciales-edenred")
    .set("Authorization", `Bearer ${jefeToken}`);
  assert.equal(jefeResponse.status, 403);
});

test("rechaza marcar alertas como vistas sin identificadores", async () => {
  const response = await request(app)
    .post("/api/anomalias/casos/marcar-vistas")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ findingIds: ["", "x".repeat(181)] });
  assert.equal(response.status, 400);
});

test("un identificador de reporte inválido se rechaza al actualizar", async () => {
  const response = await request(app)
    .patch("/api/reportes/no-es-un-id")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ estado: "resuelto" });

  assert.equal(response.status, 400);
  assert.match(response.body.mensaje, /reporte/i);
});
