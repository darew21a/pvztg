import assert from "node:assert/strict";
import test from "node:test";
import { agruparUnidadesPorDepartamento } from "./agruparUnidadesPorDepartamento.js";

test("agrupa unidades por ID o por nombre aunque los formatos difieran", () => {
  const grupos = agruparUnidadesPorDepartamento(
    [
      { id: 1, nombre: "Líneas" },
      { id: 2, nombre: "Subestaciones" },
    ],
    [
      { id: "unidad-1", departamentoId: "1", departamento: "Líneas" },
      { id: "unidad-2", departamento: "Subestaciones" },
      { id: "unidad-3", departamentoId: 2 },
    ],
  );

  assert.deepEqual(grupos.find(({ id }) => id === "1").unidades.map(({ id }) => id), ["unidad-1"]);
  assert.deepEqual(grupos.find(({ id }) => id === "2").unidades.map(({ id }) => id), ["unidad-2", "unidad-3"]);
});

test("no pierde unidades sin departamento o con un departamento aún no sincronizado", () => {
  const grupos = agruparUnidadesPorDepartamento(
    [{ id: 1, nombre: "Líneas" }],
    [
      { id: "unidad-sin-departamento" },
      { id: "unidad-desconocida", departamentoId: 45, departamento: "Zona nueva" },
    ],
  );

  assert.deepEqual(grupos.find(({ id }) => id === "sin-departamento").unidades.map(({ id }) => id), ["unidad-sin-departamento"]);
  assert.deepEqual(
    grupos.find(({ id }) => id.startsWith("sin-catalogo:")).unidades.map(({ id }) => id),
    ["unidad-desconocida"],
  );
});

test("cada unidad aparece exactamente una vez en la exportación", () => {
  const unidades = [
    { id: "a", departamentoId: "1", departamento: "Líneas" },
    { id: "b", departamento: "Líneas" },
    { id: "c" },
  ];
  const grupos = agruparUnidadesPorDepartamento([{ id: 1, nombre: "Líneas" }], unidades);
  const idsExportados = grupos.flatMap(({ unidades: delGrupo }) => delGrupo.map(({ id }) => id));

  assert.deepEqual(idsExportados.sort(), ["a", "b", "c"]);
});
