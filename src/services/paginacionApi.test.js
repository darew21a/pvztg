import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerTodasLasPaginas } from "./paginacionApi.js";

test("obtiene todas las páginas con metadatos y evita duplicar por límite silencioso", async () => {
  const fetchOriginal = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    const page = Number(new URL(url, "http://localhost").searchParams.get("page"));
    const data = page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }];
    return {
      ok: true,
      headers: { get: () => "2" },
      json: async () => data,
    };
  };

  try {
    const result = await obtenerTodasLasPaginas("/unidades");
    assert.deepEqual(result.map((item) => item.id), [1, 2, 3]);
    assert.equal(urls.length, 2);
    assert.match(urls[0], /page=1&limit=200/);
    assert.match(urls[1], /page=2&limit=200/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("rechaza respuestas de API con formato inesperado", async () => {
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => "1" },
    json: async () => ({ items: [] }),
  });

  try {
    await assert.rejects(obtenerTodasLasPaginas("/unidades"), /formato no válido/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
