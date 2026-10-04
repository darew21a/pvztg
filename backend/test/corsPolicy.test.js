import assert from "node:assert/strict";
import { test } from "node:test";
import { isOriginAllowed } from "../src/config/corsPolicy.js";

test("CORS permite únicamente CLIENT_URL configurado en producción", () => {
  const config = { nodeEnv: "production", clientUrl: "https://portal.example" };

  assert.equal(isOriginAllowed("https://portal.example", config), true);
  assert.equal(isOriginAllowed("http://localhost:5173", config), false);
  assert.equal(isOriginAllowed("http://192.168.1.20:5173", config), false);
  assert.equal(isOriginAllowed("https://otra-app.example", config), false);
});

test("CORS permite orígenes locales de desarrollo solo fuera de producción", () => {
  assert.equal(isOriginAllowed("http://localhost:5173", { nodeEnv: "development" }), true);
  assert.equal(isOriginAllowed("http://192.168.1.20:5173", { nodeEnv: "development" }), true);
  assert.equal(isOriginAllowed("http://127.0.0.1:4179", { nodeEnv: "development" }), true);
  assert.equal(isOriginAllowed("http://localhost:5173", { nodeEnv: "production" }), false);
  assert.equal(isOriginAllowed("http://127.0.0.1:4179", { nodeEnv: "production" }), false);
  assert.equal(isOriginAllowed(undefined, { nodeEnv: "production" }), true);
});
