import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";

const {
  createAccessToken,
  requireAuth,
  requireRoles,
  requirePasswordChangeComplete,
} = await import("../src/middleware/auth.js");
const { requestRateLimit } = await import("../src/middleware/rateLimit.js");

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("createAccessToken incluye rol, usuario y departamento", () => {
  const token = createAccessToken({
    id: 42,
    rol: "jefe-departamento",
    usuario: "jefe01",
    nombre: "Jefe",
    departamento_id: 7,
  });
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  assert.equal(payload.sub, "42");
  assert.equal(payload.role, "jefe-departamento");
  assert.equal(payload.departmentId, 7);
});

test("requireAuth rechaza tokens ausentes, inválidos y expirados", () => {
  for (const authorization of [undefined, "Bearer invalid", `Bearer ${jwt.sign({}, process.env.JWT_SECRET, { expiresIn: -1 })}`]) {
    const req = { get: () => authorization };
    const res = responseMock();
    let nextCalled = false;

    requireAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  }
});

test("requireRoles bloquea roles no autorizados", () => {
  const req = { auth: { role: "jefe-departamento" } };
  const res = responseMock();
  let nextCalled = false;

  requireRoles("stt")(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("requireRoles permite el rol autorizado", () => {
  const req = { auth: { role: "stt" } };
  const res = responseMock();
  let nextCalled = false;

  requireRoles("stt")(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("requireAuth acepta un token válido y expone la identidad", () => {
  const token = createAccessToken({
    id: 9,
    rol: "stt",
    usuario: "admin",
    nombre: "Administrador",
  });
  const req = {
    get: (header) => header.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined,
  };
  const res = responseMock();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.equal(req.auth.sub, "9");
  assert.equal(req.auth.role, "stt");
});

test("requirePasswordChangeComplete bloquea sesiones temporales", () => {
  const req = { auth: { mustChangePassword: true } };
  const res = responseMock();
  let nextCalled = false;

  requirePasswordChangeComplete(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.codigo, "PASSWORD_CHANGE_REQUIRED");
  assert.equal(nextCalled, false);
});

test("requestRateLimit devuelve 429 al superar el límite", () => {
  const limiter = requestRateLimit({ windowMs: 60_000, max: 1, keyGenerator: () => "test-key", message: "Límite excedido." });
  const createRequest = () => ({ path: "/test", ip: "127.0.0.1" });
  const createResponse = () => ({
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  });

  const firstResponse = createResponse();
  let firstNextCalled = false;
  limiter(createRequest(), firstResponse, () => { firstNextCalled = true; });
  assert.equal(firstNextCalled, true);
  assert.equal(firstResponse.statusCode, 200);

  const secondResponse = createResponse();
  let secondNextCalled = false;
  limiter(createRequest(), secondResponse, () => { secondNextCalled = true; });
  assert.equal(secondNextCalled, false);
  assert.equal(secondResponse.statusCode, 429);
  assert.equal(secondResponse.body.mensaje, "Límite excedido.");
});
