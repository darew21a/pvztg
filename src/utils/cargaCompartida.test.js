import assert from "node:assert/strict";
import { test } from "node:test";
import { crearCargaCompartida } from "./cargaCompartida.js";

test("mantiene cargas separadas por token de sesión", async () => {
  const sesionesCargadas = [];
  const cargarCompartida = crearCargaCompartida(async (token) => {
    sesionesCargadas.push(token);
    return token;
  });

  const primeraSesion = await cargarCompartida(false, "token-a");
  const mismaSesion = await cargarCompartida(false, "token-a");
  const segundaSesion = await cargarCompartida(false, "token-b");

  assert.equal(primeraSesion, "token-a");
  assert.equal(mismaSesion, "token-a");
  assert.equal(segundaSesion, "token-b");
  assert.deepEqual(sesionesCargadas, ["token-a", "token-b"]);
});
