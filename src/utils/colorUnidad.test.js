import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluarColorUnidad,
  CLASES_COLOR_UNIDAD,
  CLASES_ESTADO_UNIDAD,
  obtenerGradienteFilaAlertas,
  obtenerClasesFilaUnidad,
} from "./colorUnidad.js";

const unidad = { id: "u-1", placas: "ABC-123" };

test("uses anomaly categories currently emitted by the fleet ecosystem", () => {
  const anomalies = [
    { categoria: "duplicados", unidadIds: ["u-1"] },
    { categoria: "datos", unidadIds: ["u-1"] },
  ];

  const resultado = evaluarColorUnidad(unidad, [], [], anomalies);

  assert.equal(resultado.color, "duplicados");
  assert.deepEqual(resultado.razones, ["Datos duplicados", "Unidades por completar"]);
  assert.equal(CLASES_COLOR_UNIDAD.duplicados.fila.includes("bg-blue-50"), true);
  assert.equal(CLASES_COLOR_UNIDAD.datos.fila.includes("bg-yellow-50"), true);
});

test("does not treat a shared plate as an identity duplicate in the index", () => {
  const resultado = evaluarColorUnidad(unidad, [{ ...unidad, id: "u-2" }], [], []);

  assert.equal(resultado.color, "ok");
  assert.deepEqual(resultado.razones, []);
});

test("marks unresolved reports and ignores resolved reports", () => {
  const unresolved = evaluarColorUnidad(
    unidad,
    [],
    [{ estado: "en-atencion", unidadesIds: ["u-1"] }],
    [],
  );
  const resolved = evaluarColorUnidad(
    unidad,
    [],
    [{ estado: "resuelto", unidadesIds: ["u-1"] }],
    [],
  );

  assert.equal(unresolved.color, "reporte");
  assert.deepEqual(unresolved.razones, ["Reporte activo"]);
  assert.equal(resolved.color, "ok");
});

test("keeps the operational state color on its label instead of the whole row", () => {
  assert.equal("fila" in CLASES_ESTADO_UNIDAD["en-ruta"], false);
  assert.equal("fila" in CLASES_ESTADO_UNIDAD["en-estacion"], false);
  assert.equal(CLASES_ESTADO_UNIDAD["en-ruta"].texto, "border border-sky-800 bg-sky-800 text-white");
  assert.equal(CLASES_ESTADO_UNIDAD["en-estacion"].texto, "border border-green-800 bg-green-800 text-white");
});

test("uses distinct alert badges and a white badge for the clean state", () => {
  const categories = ["duplicados", "datos", "transacciones", "edenred", "reporte", "ok"];
  const badges = categories.map((category) => CLASES_COLOR_UNIDAD[category].badge);
  const alertColorFamilies = badges.map((badge) => badge.match(/bg-([a-z]+)-100/)?.[1]);

  assert.equal(new Set(badges).size, categories.length);
  assert.equal(new Set(alertColorFamilies.slice(0, -1)).size, categories.length - 1);
  assert.deepEqual(alertColorFamilies, ["blue", "yellow", "purple", "pink", "orange", undefined]);
  assert.deepEqual(
    categories.slice(0, -1).map((category) => CLASES_COLOR_UNIDAD[category].color),
    ["#2563eb", "#eab308", "#9333ea", "#db2777", "#ea580c"],
  );
  assert.ok(CLASES_COLOR_UNIDAD.ok.badge.includes("bg-white"));
  assert.ok(categories.every((category) => CLASES_COLOR_UNIDAD[category].etiqueta));
});

test("colors rows by active alert categories, independent of operational state", () => {
  const resultado = obtenerClasesFilaUnidad(
    { ...unidad, estado: "en-ruta" },
    [],
    [{ categoria: "datos", unidadIds: ["u-1"] }],
  );

  assert.equal(resultado.includes("fleet-unit-row--state-route"), false);
  assert.ok(resultado.includes("fleet-unit-row--has-alerts"));
  assert.ok(resultado.includes("fleet-unit-row--alert-datos"));
});

test("uses a white background for clean units and animated gradients for their alerts", () => {
  assert.equal(obtenerGradienteFilaAlertas(["ok"]), "none");

  const single = obtenerGradienteFilaAlertas(["duplicados"]);
  assert.match(single, /#2563eb/);
  assert.match(single, /#ffffff/);
  assert.match(single, /48%/);
  assert.match(single, /38%/);

  const multiple = obtenerGradienteFilaAlertas(["duplicados", "datos", "reporte"]);
  assert.match(multiple, /#2563eb/);
  assert.match(multiple, /#eab308/);
  assert.match(multiple, /#ea580c/);
  assert.equal((multiple.match(/48%/g) ?? []).length, 3);
});

test("retains every applicable alert category for a unit with multiple issues", () => {
  const resultado = evaluarColorUnidad(
    unidad,
    [],
    [{ estado: "en-atencion", unidadesIds: ["u-1"] }],
    [
      { categoria: "datos", unidadIds: ["u-1"] },
      { categoria: "duplicados", unidadIds: ["u-1"] },
    ],
  );

  assert.deepEqual(resultado.alertas, ["duplicados", "datos", "reporte"]);
  assert.deepEqual(resultado.razones, ["Datos duplicados", "Unidades por completar", "Reporte activo"]);
});
