import assert from "node:assert/strict";
import { test } from "node:test";
import { validateReleaseConfig } from "../src/config/releaseCheck.js";

test("release check rechaza configuración insegura", () => {
  const errors = validateReleaseConfig({
    NODE_ENV: "production",
    APP_VERSION: "2026.09.25",
    JWT_SECRET: "short",
    CLIENT_URL: "https://portal.example",
    DB_USER: "root",
    DB_PASSWORD: "",
    METRICS_TOKEN: "short",
  });
  assert.ok(errors.length >= 4);
});

test("release check rechaza URL de cliente con rutas", () => {
  const errors = validateReleaseConfig({
    NODE_ENV: "production",
    APP_VERSION: "2026.09.25",
    JWT_SECRET: "a".repeat(32),
    FLEET_CREDENTIALS_KEY: "c".repeat(64),
    CLIENT_URL: "https://portal.example/app",
    DB_USER: "pvztg_app",
    DB_PASSWORD: "strong-password",
    METRICS_TOKEN: "b".repeat(32),
  });
  assert.ok(errors.some((error) => error.includes("CLIENT_URL")));
});

test("release check no longer requires a separate key for fleet credentials", () => {
  const errors = validateReleaseConfig({
    NODE_ENV: "production",
    APP_VERSION: "2026.09.25",
    JWT_SECRET: "a".repeat(32),
    CLIENT_URL: "https://portal.example",
    DB_USER: "pvztg_app",
    DB_PASSWORD: "strong-password",
    METRICS_TOKEN: "b".repeat(32),
  });
  assert.deepEqual(errors, []);
});

test("release check acepta configuración de producción completa", () => {
  const errors = validateReleaseConfig({
    NODE_ENV: "production",
    APP_VERSION: "2026.09.25",
    JWT_SECRET: "a".repeat(32),
    CLIENT_URL: "https://portal.example",
    DB_USER: "pvztg_app",
    DB_PASSWORD: "strong-password",
    METRICS_TOKEN: "b".repeat(32),
  });
  assert.deepEqual(errors, []);
});
