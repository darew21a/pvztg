import assert from "node:assert/strict";
import { test } from "node:test";
import { getAuthHeaders, setAccessToken } from "./apiAuth.js";

test("las cabeceras usan el token de sesión proporcionado", () => {
  setAccessToken("");
  assert.deepEqual(getAuthHeaders("token-de-prueba"), {
    Authorization: "Bearer token-de-prueba",
  });
});

test("las cabeceras conservan el token activo como respaldo", () => {
  setAccessToken("token-activo");
  assert.deepEqual(getAuthHeaders(), {
    Authorization: "Bearer token-activo",
  });
  setAccessToken("");
});
