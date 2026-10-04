import assert from "node:assert/strict";
import { test } from "node:test";
import { consultarCargaRelacionApi } from "./unidadService.js";

test("consulta el registro de relación con la API autenticada y codifica sus parámetros", async () => {
  const fetchOriginal = globalThis.fetch;
  let solicitud;
  globalThis.fetch = async (url, options) => {
    solicitud = { url: String(url), options };
    return {
      ok: true,
      json: async () => ({ yaCargado: false, carga: null }),
    };
  };

  try {
    const resultado = await consultarCargaRelacionApi("a".repeat(64), "b".repeat(64));
    const url = new URL(solicitud.url, "http://localhost");
    assert.equal(url.pathname, `/api/unidades/cargas-relacion/${"a".repeat(64)}`);
    assert.equal(url.searchParams.get("contenidoHash"), "b".repeat(64));
    assert.equal(solicitud.options.headers["Content-Type"], "application/json");
    assert.equal(resultado.yaCargado, false);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("rechaza respuestas de registro de relación con formato inesperado", async () => {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ carga: null }),
  });

  try {
    await assert.rejects(
      consultarCargaRelacionApi("a".repeat(64), "b".repeat(64)),
      /formato no válido/,
    );
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
