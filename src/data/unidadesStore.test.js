import assert from "node:assert/strict";
import { test } from "node:test";
import { agregarUnidad, actualizarParqueVehicular, obtenerUnidades, reemplazarUnidades } from "./unidadesStore.js";

test("una unidad recién importada conserva el ID persistente de la API, no su VIN", () => {
  reemplazarUnidades([]);
  const unidad = agregarUnidad({
    id: "482",
    numeroSerie: "VIN-IMPORTADO-001",
    economico: "IT-001",
  });

  assert.equal(unidad.id, "482");
  assert.equal(obtenerUnidades()[0].id, "482");
  assert.equal(unidad.numeroSerie, "VIN-IMPORTADO-001");
  reemplazarUnidades([]);
});

test("no agrega unidades a caché si la API no proporcionó un ID persistente", () => {
  reemplazarUnidades([]);
  assert.throws(
    () => agregarUnidad({ numeroSerie: "VIN-SIN-ID" }),
    /identificador persistente/,
  );
  assert.deepEqual(obtenerUnidades(), []);
});

test("allows a relation import to clear stale current-year plate values", () => {
  reemplazarUnidades([{
    id: "1",
    economico: "E-1",
    placas2025: "PLACA-ANTERIOR",
    placasVigentesAnio: new Date().getFullYear() - 1,
  }]);

  actualizarParqueVehicular([{
    unidad: obtenerUnidades()[0],
    cambios: { placas2025: null, placasVigentesAnio: null },
  }]);

  assert.equal(obtenerUnidades()[0].placas2025, null);
  assert.equal(obtenerUnidades()[0].placasVigentesAnio, null);
  reemplazarUnidades([]);
});
